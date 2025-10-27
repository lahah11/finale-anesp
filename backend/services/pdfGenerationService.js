const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { query } = require('../config/database');
const EngineerService = require('./engineerService');
const SimpleUnifiedMissionService = require('./simpleUnifiedMissionService');

/* ---------- Utils ---------- */

function safe(val, fallback = '-') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' && val.trim() === '') return fallback;
  return String(val);
}

/** Remplace {{TOKEN}} et {TOKEN} */
function replaceToken(html, token, value) {
  const v = value === undefined || value === null ? '' : String(value);
  const reDouble = new RegExp(`\\{\\{${token}\\}\\}`, 'g');
  const reSingle = new RegExp(`\\{${token}\\}`, 'g');
  return html.replace(reDouble, v).replace(reSingle, v);
}

/** Base64 avec MIME en fonction de l'extension */
function toB64(filePath) {
  if (!fs.existsSync(filePath)) {
    // pixel transparent
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
    ext === '.svg' ? 'image/svg+xml' :
    ext === '.webp' ? 'image/webp' :
    'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/* ---------- Contexte unifié (toutes les données dans la table missions) ---------- */

async function loadContext(mission, participants) {
  // Récupérer les participants depuis la table missions (JSON)
  let participantsFromMission = [];
  try {
    if (mission.participants_data) {
      participantsFromMission = JSON.parse(mission.participants_data);
    }
  } catch (e) {
    console.warn('⚠️ Impossible de parser les participants:', e.message);
  }

  // Utiliser les participants de la mission ou ceux passés en paramètre
  const finalParticipants = participantsFromMission.length > 0 ? participantsFromMission : (participants || []);
  const secondParticipant = finalParticipants.length > 1 ? finalParticipants[1] : null;

  // Chauffeur (depuis la table missions)
  const driver = {
    name: mission.driver_name || null,
    phone: mission.driver_phone || null,
    license: mission.driver_license || null
  };

  // Véhicule (depuis la table missions)
  const vehicle = {
    plate: mission.vehicle_plate || null,
    model: mission.vehicle_model || null,
    brand: mission.vehicle_brand || null
  };

  // Villes (depuis la table missions)
  const departureCity = mission.departure_city_name || mission.departure_city || null;
  const arrivalCity = mission.arrival_city_name || mission.arrival_city || null;

  // Institution (depuis la table missions)
  let institution = null;
  try {
    if (mission.institution_id) {
      const res = await query('SELECT name FROM institutions WHERE id = ?', [mission.institution_id]);
      institution = res.rows?.[0]?.name || null;
    }
  } catch (e) {
    console.warn('⚠️ Impossible de récupérer l\'institution:', e.message);
  }

  // Créateur de la mission
  let creator = null;
  try {
    if (mission.created_by) {
      const res = await query('SELECT username FROM users WHERE id = ?', [mission.created_by]);
      const row = res.rows?.[0];
      if (row) {
        creator = {
          username: row.username,
          name: row.username
        };
      }
    }
  } catch (e) {
    console.warn('⚠️ Impossible de récupérer le créateur:', e.message);
  }

  return { 
    secondParticipant, 
    driver, 
    vehicle, 
    departureCity, 
    arrivalCity, 
    institution, 
    creator,
    participants: finalParticipants
  };
}

/* ---------- Service ---------- */

const PDFGenerationService = {
  generateMissionOrderPDF: async (mission, participants = null) => {
    try {
      console.log('📄 Génération du PDF de l\'ordre de mission...');

      // Utiliser la table missions_unified pour récupérer toutes les données
      console.log('📋 Utilisation des données unifiées de la table missions_unified...');
      
      // Récupérer la mission complète depuis missions_unified
      const unifiedMission = await SimpleUnifiedMissionService.getMissionById(mission.id);
      if (!unifiedMission) {
        throw new Error('Mission non trouvée dans missions_unified');
      }
      
      console.log('✅ Mission récupérée depuis missions_unified:', {
        reference: unifiedMission.mission_reference,
        departure: unifiedMission.departure_city_name,
        arrival: unifiedMission.arrival_city_name,
        vehicle: unifiedMission.vehicle_plate,
        driver: unifiedMission.driver_name
      });
      
      // Récupérer les participants depuis missions_unified (JSON)
      let participantsFromMission = [];
      try {
        if (unifiedMission.participants_data) {
          participantsFromMission = JSON.parse(unifiedMission.participants_data);
          console.log(`✅ ${participantsFromMission.length} participant(s) récupéré(s) depuis missions_unified`);
        }
      } catch (error) {
        console.warn('⚠️ Impossible de parser les participants:', error.message);
      }
      
      // Utiliser les participants de la mission ou ceux passés en paramètre
      const finalParticipants = participantsFromMission.length > 0 ? participantsFromMission : (participants || []);

      // Ingénieur (depuis missions_unified)
      let engineer = null;
      if (unifiedMission.created_by) {
        engineer = {
          id: unifiedMission.created_by,
          name: unifiedMission.created_by // Utiliser l'ID comme nom pour l'instant
        };
      }

      // Template
      const templatePath = path.join(__dirname, '../templates/mission-order.html');
      let html = fs.readFileSync(templatePath, 'utf8');

       // Récupérer les informations complètes du créateur
       let creatorInfo = null;
       if (unifiedMission.created_by) {
         try {
           console.log('🔍 Récupération des informations du créateur:', unifiedMission.created_by);
           const creatorQuery = await query(
             'SELECT username, email, role FROM users WHERE id = ?',
             [unifiedMission.created_by]
           );
           if (creatorQuery.rows && creatorQuery.rows.length > 0) {
             creatorInfo = creatorQuery.rows[0];
             console.log('✅ Informations créateur récupérées:', creatorInfo);
           } else {
             console.warn('⚠️ Aucune information trouvée pour le créateur:', unifiedMission.created_by);
           }
         } catch (error) {
           console.warn('⚠️ Erreur récupération créateur:', error.message);
         }
       }

    // Organiser les participants : utiliser les rôles saisis manuellement
    const organizedParticipants = [];
    
    // Le créateur devient le chef de mission (premier participant) avec ses vraies informations
    if (unifiedMission.created_by && creatorInfo) {
      organizedParticipants.push({
        external_firstname: 'Chef de Mission',
        external_name: creatorInfo.username || unifiedMission.created_by,
        external_nni: creatorInfo.email || 'N/A',
        role_in_mission: 'Chef de Mission',
        grade: creatorInfo.role || null,
        position: 'Chef de Mission'
      });
    } else if (unifiedMission.created_by) {
      // Fallback si pas d'infos utilisateur
      organizedParticipants.push({
        external_firstname: 'Chef de Mission',
        external_name: unifiedMission.created_by,
        external_nni: 'N/A',
        role_in_mission: 'Chef de Mission'
      });
    }
      
      // Ajouter les autres participants avec leurs rôles saisis manuellement
      // Exclure le créateur des participants pour éviter les doublons
      finalParticipants.forEach((participant) => {
        // Vérifier si ce participant n'est pas déjà le créateur
        const isCreator = participant.external_name === unifiedMission.created_by || 
                         participant.employee_id === unifiedMission.created_by;
        
        // Vérifier si le participant a des données valides (nom ou prénom non vide)
        const hasValidData = (participant.external_name && participant.external_name.trim() !== '') ||
                            (participant.external_firstname && participant.external_firstname.trim() !== '') ||
                            (participant.employee_id && participant.employee_id.trim() !== '');
        
        if (!isCreator && hasValidData) {
          organizedParticipants.push({
            ...participant,
            // Garder le rôle saisi manuellement par l'utilisateur
            role_in_mission: participant.role_in_mission || 'Participant'
          });
        }
      });

      // Contexte (toutes les données depuis missions_unified)
      const ctx = {
        secondParticipant: organizedParticipants.length > 1 ? organizedParticipants[1] : null,
        driver: {
          name: unifiedMission.driver_name || null,
          phone: unifiedMission.driver_phone || null,
          license: unifiedMission.driver_license || null
        },
        vehicle: {
          plate: unifiedMission.vehicle_plate || null,
          model: unifiedMission.vehicle_model || null,
          brand: unifiedMission.vehicle_brand || null
        },
        departureCity: unifiedMission.departure_city_name || unifiedMission.departure_city_id || null,
        arrivalCity: unifiedMission.arrival_city_name || unifiedMission.arrival_city_id || null,
        institution: null, // Sera récupéré si nécessaire
        creator: {
          username: unifiedMission.created_by,
          name: unifiedMission.created_by
        },
        participants: organizedParticipants
      };

      // Remplacements
      html = await PDFGenerationService.replaceTemplateVariables(html, unifiedMission, organizedParticipants, engineer, ctx);

      // Patch CSS pour forcer une seule page
      html = html.replace(
        /<\/style>/i,
        `
/* Force single page */
.page { height: 297mm !important; overflow: hidden !important; }
.signature-section, .signature-box, .stamp, .signature-image { page-break-inside: avoid; break-inside: avoid; }
.signature-image { height: 60px !important; }
.stamp { width: 60px !important; height: 60px !important; }
.qr-code { width: 50px !important; height: 50px !important; }
.block { margin-top: 4px !important; }
.table th, .table td { padding: 2px 4px !important; font-size: 8px !important; }
</style>`
      );

      // Répertoire de sortie
      const ordersDir = path.join(__dirname, '../uploads/orders');
      if (!fs.existsSync(ordersDir)) fs.mkdirSync(ordersDir, { recursive: true });

      const fileName = `ordre-mission-${mission.mission_reference}-${Date.now()}.pdf`;
      const filePath = path.join(ordersDir, fileName);

      // Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setCacheEnabled(false);
      await page.setDefaultNavigationTimeout(60000);
      await page.emulateMediaType('screen');
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        preferCSSPageSize: true,
        displayHeaderFooter: false
      });

      await browser.close();

      fs.writeFileSync(filePath, pdfBuffer);
      console.log('✅ PDF généré:', fileName);
      return `/api/pdf/orders/${fileName}`;
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      throw error;
    }
  },

  replaceTemplateVariables: async (html, mission, participants, engineer = null, ctx = {}) => {
    // P1
    const p1 = participants?.[0] || {
      external_firstname: 'Nom',
      external_name: 'Prénom',
      role_in_mission: 'Fonction',
      external_nni: '-',
      external_profession: '-',
      external_ministry: '-'
    };

    // P2 / driver / vehicle / cities / institution / creator
    const p2 = ctx.secondParticipant || {};
    const driver = ctx.driver || {};
    const vehicle = ctx.vehicle || {};
    const departureCity = ctx.departureCity || '-';
    const arrivalCity = ctx.arrivalCity || '-';
    const institution = ctx.institution || '-';
    const creator = ctx.creator || {};
    
    // Utiliser les participants de la mission
    const finalParticipants = ctx.participants || participants || [];

    // Dates
    const currentDate = new Date().toLocaleDateString('fr-FR');
    const departureDate = mission?.departure_date ? new Date(mission.departure_date).toLocaleDateString('fr-FR') : '-';
    const returnDate = mission?.return_date ? new Date(mission.return_date).toLocaleDateString('fr-FR') : '-';

    // Libellé transport
    const transportLabel = mission?.transport_mode === 'car'
      ? 'Véhicule ANESP'
      : safe(mission?.transport_mode);

    /* ---- Participants dynamiques ---- */
    let rows = '';
    finalParticipants.forEach((pt, i) => {
      const fullName = `${safe(pt.external_firstname || pt.firstname, '')} ${safe(pt.external_name || pt.name, '')}`.trim() || '-';
      const matricule = safe(pt.external_nni || pt.nni); // Utiliser NNI comme matricule
      const passport = safe(pt.external_nni || pt.nni); // Utiliser NNI comme passport
      const position = safe(pt.role_in_mission || pt.role);
      rows += `
<tr><th>Nom et prénom (P${i + 1})</th><td>${fullName}</td></tr>
<tr><th>Matricule / NNI (P${i + 1})</th><td>${matricule} &nbsp;&nbsp;|&nbsp;&nbsp; ${passport}</td></tr>
<tr><th>Fonction (P${i + 1})</th><td>${position}</td></tr>`;
    });
    if (!rows) {
      rows = `<tr><td colspan="2" style="text-align:center;color:#666;font-style:italic">Aucun participant</td></tr>`;
    }
    html = replaceToken(html, 'PARTICIPANTS_TABLE_ROWS', rows);

    /* ---- Champs simples ---- */
    html = replaceToken(html, 'DATE_VALUE', currentDate);
    html = replaceToken(html, 'MISSION_NUMBER', safe(mission?.mission_reference));

    // P1
    html = replaceToken(html, 'FULL_NAME', `${safe(p1.external_firstname, '')} ${safe(p1.external_name, '')}`.trim() || '-');
    html = replaceToken(html, 'MATRICULE', safe(p1.external_matricule));
    html = replaceToken(html, 'NNI', safe(p1.external_nni));
    html = replaceToken(html, 'PASSPORT_NUMBER', safe(p1.external_passport || p1.external_nni));
    html = replaceToken(html, 'POSITION', safe(p1.role_in_mission));

    // Mission
    html = replaceToken(html, 'DEPARTURE_CITY', safe(departureCity));
    html = replaceToken(html, 'ARRIVAL_CITY', safe(arrivalCity));
    html = replaceToken(html, 'DESTINATION', safe(arrivalCity)); // compat
    html = replaceToken(html, 'TRANSPORT_MODE', transportLabel);
    html = replaceToken(html, 'OBJECTIVE', safe(mission?.mission_object));
    html = replaceToken(html, 'DEPARTURE_DATE', departureDate);
    html = replaceToken(html, 'RETURN_DATE', returnDate);
    html = replaceToken(html, 'SIGNER_NAME', 'Directrice Générale');
    
    // Institution et créateur
    html = replaceToken(html, 'INSTITUTION_NAME', safe(institution));
    html = replaceToken(html, 'CREATOR_NAME', safe(creator.name || creator.username));

    // P2
    html = replaceToken(html, 'P2_FULL_NAME', p2 ? `${safe(p2.external_firstname, '')} ${safe(p2.external_name, '')}`.trim() || '-' : '-');
    html = replaceToken(html, 'P2_MATRICULE', safe(p2?.external_matricule));
    html = replaceToken(html, 'P2_NNI', safe(p2?.external_nni));
    html = replaceToken(html, 'P2_POSITION', safe(p2?.role_in_mission));

    // Driver & Vehicle
    html = replaceToken(html, 'DRIVER_NAME', safe(driver?.name));
    html = replaceToken(html, 'DRIVER_PHONE', safe(driver?.phone));
    html = replaceToken(html, 'VEHICLE_PLATE', safe(vehicle?.plate));
    html = replaceToken(html, 'VEHICLE_MODEL', safe(vehicle?.model));

    /* ---- Images ---- */
    const logoPath = path.join(__dirname, '../assets/ANESP.png');
    const signaturePath = path.join(__dirname, '../assets/signatures/signature.jpg');   // adapte si PNG
    const stampPath = path.join(__dirname, '../assets/stamps/anesp-stamp.png');
    const coatOfArmsPath = path.join(__dirname, '../assets/mauritania-coat-of-arms.png');

    const logoB64 = toB64(logoPath);
    const signB64 = toB64(signaturePath);
    const stampB64 = toB64(stampPath);
    const coatB64 = toB64(coatOfArmsPath);

    html = replaceToken(html, 'AGENCY_LOGO_BASE64', logoB64);
    html = replaceToken(html, 'COAT_OF_ARMS_BASE64', coatB64);
    html = replaceToken(html, 'SIGNATURE_BASE64', signB64);
    html = replaceToken(html, 'STAMP_BASE64', stampB64);
    
    // Générer le QR code avec un lien vers la mission
    let qrCodeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    try {
      // Créer un lien vers la mission (URL publique ou interne)
      const missionUrl = `https://anesp.gov.mr/missions/${mission?.id || mission?.mission_reference}`;
      
      // Alternative: créer un QR code avec les informations structurées
      const qrData = {
        type: 'mission_order',
        reference: mission?.mission_reference || 'N/A',
        object: mission?.mission_object || 'N/A',
        departure: mission?.departure_city_name || mission?.departure_city || 'N/A',
        arrival: mission?.arrival_city_name || mission?.arrival_city || 'N/A',
        date: mission?.departure_date || 'N/A',
        url: missionUrl
      };
      
      // Créer un JSON structuré pour le QR code
      const qrContent = JSON.stringify(qrData);
      
      qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      console.log('✅ QR Code généré avec succès pour la mission:', mission?.mission_reference);
    } catch (error) {
      console.warn('⚠️ Erreur génération QR code:', error.message);
    }
    
    html = replaceToken(html, 'QR_CODE_DATA_URL', qrCodeDataUrl);

    return html;
  }
};

module.exports = PDFGenerationService;