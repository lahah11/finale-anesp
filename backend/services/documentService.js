const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const SimpleUnifiedMissionService = require('./simpleUnifiedMissionService');
const MissionService = require('./missionService');

const DOCUMENTS_DIR = path.join(__dirname, '../uploads/documents');

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function saveDocumentRecord(missionId, documentType, fileName, generatedBy) {
  const filePath = path.join(DOCUMENTS_DIR, fileName);
  const stats = fs.statSync(filePath);

  const result = await query(
    `INSERT INTO mission_unified_documents (id, mission_id, document_type, document_name, file_path, file_size, generated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)` ,
    [uuidv4(), missionId, documentType, fileName, filePath, stats.size, generatedBy]
  );

  return result.rows?.[0] || {
    mission_id: missionId,
    document_type: documentType,
    document_name: fileName,
    file_path: filePath,
    file_size: stats.size,
    generated_by: generatedBy
  };
}

function createBaseDocument(titleFr, titleAr) {
  const doc = new PDFDocument({ margin: 50 });
  doc.fontSize(16).text(`${titleFr} / ${titleAr}`, { align: 'center' });
  doc.moveDown();
  return doc;
}

async function writeStreamToFile(doc, filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

const DocumentService = {
  generateAllDocuments: async (missionId, generatedBy) => {
    const mission = await SimpleUnifiedMissionService.getMissionById(missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }

    ensureDirectory(DOCUMENTS_DIR);
    const participants = await MissionService.getMissionParticipants(missionId);
    const documents = [];

    documents.push(await DocumentService.generateAuthorizationDocument(mission, participants, generatedBy));
    documents.push(await DocumentService.generateMissionOrderDocument(mission, participants, generatedBy));
    documents.push(await DocumentService.generateMissionReportDocument(mission, participants, generatedBy));
    documents.push(await DocumentService.generateRouteDocument(mission, generatedBy));
    documents.push(await DocumentService.generateBudgetDocument(mission, generatedBy));
    documents.push(await DocumentService.generateFuelExitDocument(mission, generatedBy));
    documents.push(await DocumentService.generateBudgetUsageDocument(mission, generatedBy));

    return documents;
  },

  generateAuthorizationDocument: async (mission, participants, generatedBy) => {
    const fileName = `authorization_${mission.mission_reference}_${Date.now()}.pdf`;
    const filePath = path.join(DOCUMENTS_DIR, fileName);
    const doc = createBaseDocument('AUTORISATION PRÉALABLE DE DÉPART', 'إذن مسبق للمهمة');

    doc.fontSize(12);
    doc.text(`Référence : ${mission.mission_reference}`);
    doc.text(`Objet : ${mission.mission_object}`);
    doc.text(`Période : ${mission.departure_date} → ${mission.return_date}`);
    doc.text(`Mode de transport : ${mission.transport_mode}`);
    doc.moveDown();

    doc.text('Participants :');
    participants.forEach((participant, index) => {
      doc.text(`${index + 1}. ${participant.external_name || participant.full_name || 'Participant'} - ${participant.role_in_mission}`);
    });

    await writeStreamToFile(doc, filePath);
    return saveDocumentRecord(mission.id, 'authorization', fileName, generatedBy || mission.created_by);
  },

  generateMissionOrderDocument: async (mission, participants, generatedBy) => {
    const fileName = `mission_order_${mission.mission_reference}_${Date.now()}.pdf`;
    const filePath = path.join(DOCUMENTS_DIR, fileName);
    const doc = createBaseDocument('ORDRE DE MISSION', 'أمر المهمة');

    doc.fontSize(12);
    doc.text(`Référence : ${mission.mission_reference}`);
    doc.text(`Objet : ${mission.mission_object}`);
    doc.text(`Départ : ${mission.departure_city_name || ''} (${mission.departure_date})`);
    doc.text(`Arrivée : ${mission.arrival_city_name || ''} (${mission.return_date})`);
    doc.text(`Moyen de transport : ${mission.transport_mode}`);
    doc.moveDown();

    doc.text('Participants :');
    participants.forEach((participant, index) => {
      doc.text(`- ${participant.external_name || participant.full_name || 'Participant'} (${participant.role_in_mission})`);
    });

    await writeStreamToFile(doc, filePath);
    return saveDocumentRecord(mission.id, 'mission_order', fileName, generatedBy || mission.created_by);
  },

  generateMissionReportDocument: async (mission, participants, generatedBy) => {
    const fileName = `mission_report_${mission.mission_reference}_${Date.now()}.pdf`;
    const filePath = path.join(DOCUMENTS_DIR, fileName);
    const doc = createBaseDocument('RAPPORT DE MISSION', 'تقرير المهمة');

    doc.fontSize(12);
    doc.text(`Référence : ${mission.mission_reference}`);
    doc.text(`Objet : ${mission.mission_object}`);
    doc.text(`Lieu : ${mission.arrival_city_name || ''}`);
    doc.text(`Période : ${mission.departure_date} → ${mission.return_date}`);
    doc.moveDown();

    doc.text('Résumé :');
    doc.text(mission.logistics_notes || 'Les responsables de mission doivent compléter ce rapport avec les informations pertinentes.');
    doc.moveDown();

    doc.text('Participants :');
    participants.forEach((participant, index) => {
      doc.text(`${index + 1}. ${participant.external_name || participant.full_name || 'Participant'} - ${participant.role_in_mission}`);
    });

    await writeStreamToFile(doc, filePath);
    return saveDocumentRecord(mission.id, 'mission_report', fileName, generatedBy || mission.created_by);
  },

  generateRouteDocument: async (mission, generatedBy) => {
    const fileName = `route_${mission.mission_reference}_${Date.now()}.pdf`;
    const filePath = path.join(DOCUMENTS_DIR, fileName);
    const doc = createBaseDocument('ITINÉRAIRE ET CARBURANT', 'مسار المهمة والوقود');

    doc.fontSize(12);
    doc.text(`Distance estimée : ${mission.distance_km || 0} km`);
    doc.text(`Durée estimée : ${mission.estimated_duration_hours || 0} h`);
    doc.text(`Carburant estimé : ${mission.estimated_fuel || 0} litres`);
    doc.text(`Moyen : ${mission.transport_mode}`);
    doc.moveDown();

    doc.text('Informations logistiques :');
    let logisticsDetails = 'Non renseigné';
    if (mission.logistics_payload) {
      try {
        const parsed = typeof mission.logistics_payload === 'string'
          ? JSON.parse(mission.logistics_payload)
          : mission.logistics_payload;
        logisticsDetails = JSON.stringify(parsed, null, 2);
      } catch (error) {
        logisticsDetails = mission.logistics_payload;
      }
    }
    doc.text(logisticsDetails);

    await writeStreamToFile(doc, filePath);
    return saveDocumentRecord(mission.id, 'route', fileName, generatedBy || mission.created_by);
  },

  generateBudgetDocument: async (mission, generatedBy) => {
    const fileName = `budget_${mission.mission_reference}_${Date.now()}.pdf`;
    const filePath = path.join(DOCUMENTS_DIR, fileName);
    const doc = createBaseDocument('DOTATION PRÉVISIONNELLE', 'الاعتماد التقديري');

    doc.fontSize(12);
    doc.text(`Frais de mission : ${mission.mission_fees || 0} MRU`);
    doc.text(`Coût participants : ${mission.participants_cost || 0} MRU`);
    doc.text(`Coût carburant : ${mission.fuel_cost || 0} MRU`);
    doc.text(`Coût total : ${mission.total_mission_cost || 0} MRU`);
    doc.moveDown();

    doc.text('Résumé budgétaire :');
    if (mission.budget_summary) {
      doc.text(mission.budget_summary);
    } else {
      doc.text('Les détails budgétaires seront fournis par la DAF.');
    }

    await writeStreamToFile(doc, filePath);
    return saveDocumentRecord(mission.id, 'budget', fileName, generatedBy || mission.created_by);
  },

  generateFuelExitDocument: async (mission, generatedBy) => {
    const fileName = `fuel_${mission.mission_reference}_${Date.now()}.pdf`;
    const filePath = path.join(DOCUMENTS_DIR, fileName);
    const doc = createBaseDocument('ÉTAT DE SORTIE DE CARBURANT', 'بيان صرف الوقود');

    doc.fontSize(12);
    doc.text(`Carburant estimé : ${mission.estimated_fuel || 0} litres`);
    doc.text(`Coût carburant : ${mission.fuel_cost || 0} MRU`);
    doc.text(`Véhicule : ${mission.vehicle_plate || 'N/A'}`);
    doc.text(`Chauffeur : ${mission.driver_name || 'N/A'}`);

    await writeStreamToFile(doc, filePath);
    return saveDocumentRecord(mission.id, 'fuel_exit', fileName, generatedBy || mission.created_by);
  },

  generateBudgetUsageDocument: async (mission, generatedBy) => {
    const fileName = `budget_usage_${mission.mission_reference}_${Date.now()}.pdf`;
    const filePath = path.join(DOCUMENTS_DIR, fileName);
    const doc = createBaseDocument('UTILISATION DE LA DOTATION', 'استخدام الاعتماد');

    doc.fontSize(12);
    doc.text(`Total mission : ${mission.total_mission_cost || 0} MRU`);
    doc.text(`Frais participants : ${mission.participants_cost || 0} MRU`);
    doc.text(`Autres frais : ${(mission.total_mission_cost || 0) - (mission.participants_cost || 0)} MRU`);
    doc.moveDown();
    doc.text('Commentaires :');
    doc.text('À compléter par le service financier et logistique.');

    await writeStreamToFile(doc, filePath);
    return saveDocumentRecord(mission.id, 'budget_usage', fileName, generatedBy || mission.created_by);
  },

  getMissionDocuments: async (missionId) => {
    const result = await query(
      'SELECT * FROM mission_unified_documents WHERE mission_id = ? ORDER BY generated_at DESC',
      [missionId]
    );
    return result.rows;
  },

  getDocumentById: async (documentId) => {
    const result = await query(
      'SELECT * FROM mission_unified_documents WHERE id = ? LIMIT 1',
      [documentId]
    );
    return result.rows[0] || null;
  }
  };

  module.exports = DocumentService;
