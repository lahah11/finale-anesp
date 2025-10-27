const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const DocumentService = {
  // Générer tous les documents d'une mission
  generateAllDocuments: async (missionId) => {
    try {
      const mission = await MissionService.getMissionById(missionId);
      if (!mission) {
        throw new Error('Mission not found');
      }

      const documents = [];

      // 1. Autorisation préalable de départ
      const authorizationDoc = await DocumentService.generateAuthorizationDocument(mission);
      documents.push(authorizationDoc);

      // 2. Ordre de mission officiel (bilingue)
      const missionOrderDoc = await DocumentService.generateMissionOrderDocument(mission);
      documents.push(missionOrderDoc);

      // 3. Trajet mission et calcul du carburant
      const routeDoc = await DocumentService.generateRouteDocument(mission);
      documents.push(routeDoc);

      // 4. Dotation prévisionnelle
      const budgetDoc = await DocumentService.generateBudgetDocument(mission);
      documents.push(budgetDoc);

      // 5. État de sortie de carburant
      const fuelExitDoc = await DocumentService.generateFuelExitDocument(mission);
      documents.push(fuelExitDoc);

      // 6. État d'utilisation de la dotation
      const budgetUsageDoc = await DocumentService.generateBudgetUsageDocument(mission);
      documents.push(budgetUsageDoc);

      return documents;
    } catch (error) {
      console.error('Generate all documents error:', error);
      throw error;
    }
  },

  // Générer l'autorisation préalable de départ
  generateAuthorizationDocument: async (mission) => {
    try {
      const doc = new PDFDocument();
      const fileName = `authorization_${mission.mission_reference}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../uploads/documents', fileName);
      
      // Créer le dossier s'il n'existe pas
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));

      // En-tête
      doc.fontSize(16).text('AUTORISATION PRÉALABLE DE DÉPART EN MISSION', { align: 'center' });
      doc.moveDown();

      // Informations de la mission
      doc.fontSize(12);
      doc.text(`Référence: ${mission.mission_reference}`);
      doc.text(`Objet: ${mission.mission_object}`);
      doc.text(`Date de départ: ${mission.departure_date}`);
      doc.text(`Date de retour: ${mission.return_date}`);
      doc.text(`Moyen de transport: ${mission.transport_mode}`);
      doc.moveDown();

      // Participants
      doc.text('COMPOSITION DE LA MISSION:', { underline: true });
      doc.moveDown();
      
      const participants = await MissionService.getMissionParticipants(mission.id);
      for (const participant of participants) {
        if (participant.participant_type === 'anesp') {
          doc.text(`- ${participant.external_name} ${participant.external_firstname} (ANESP)`);
        } else {
          doc.text(`- ${participant.external_name} ${participant.external_firstname} (Externe)`);
        }
      }

      doc.end();

      // Enregistrer dans la base de données
      const documentResult = await query(
        `INSERT INTO mission_documents (mission_id, document_type, document_name, file_path, file_size, generated_by) 
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        [mission.id, 'authorization', fileName, filePath, 0, mission.created_by]
      );

      return documentResult.rows[0];
    } catch (error) {
      console.error('Generate authorization document error:', error);
      throw error;
    }
  },

  // Générer l'ordre de mission officiel (bilingue)
  generateMissionOrderDocument: async (mission) => {
    try {
      const doc = new PDFDocument();
      const fileName = `mission_order_${mission.mission_reference}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../uploads/documents', fileName);
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));

      // En-tête bilingue
      doc.fontSize(16).text('ORDRE DE MISSION / أمر المهمة', { align: 'center' });
      doc.moveDown();

      // Version française
      doc.fontSize(14).text('VERSION FRANÇAISE', { underline: true });
      doc.fontSize(12);
      doc.text(`Référence: ${mission.mission_reference}`);
      doc.text(`Objet: ${mission.mission_object}`);
      doc.text(`Date de départ: ${mission.departure_date}`);
      doc.text(`Date de retour: ${mission.return_date}`);
      doc.moveDown();

      // Version arabe
      doc.fontSize(14).text('النسخة العربية', { underline: true });
      doc.fontSize(12);
      doc.text(`المرجع: ${mission.mission_reference}`);
      doc.text(`الموضوع: ${mission.mission_object}`);
      doc.text(`تاريخ المغادرة: ${mission.departure_date}`);
      doc.text(`تاريخ العودة: ${mission.return_date}`);

      doc.end();

      const documentResult = await query(
        `INSERT INTO mission_documents (mission_id, document_type, document_name, file_path, file_size, generated_by) 
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        [mission.id, 'mission_order', fileName, filePath, 0, mission.created_by]
      );

      return documentResult.rows[0];
    } catch (error) {
      console.error('Generate mission order document error:', error);
      throw error;
    }
  },

  // Générer le document de trajet et carburant
  generateRouteDocument: async (mission) => {
    try {
      const doc = new PDFDocument();
      const fileName = `route_${mission.mission_reference}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../uploads/documents', fileName);
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));

      doc.fontSize(16).text('TRAJET MISSION ET CALCUL DU CARBURANT', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Référence: ${mission.mission_reference}`);
      doc.text(`Distance estimée: ${mission.distance_km || 0} km`);
      doc.text(`Carburant estimé: ${mission.estimated_fuel || 0} litres`);
      doc.text(`Moyen de transport: ${mission.transport_mode}`);
      doc.moveDown();

      // Détails du trajet
      doc.text('DÉTAILS DU TRAJET:', { underline: true });
      doc.text('• Point de départ: [À définir]');
      doc.text('• Point d\'arrivée: [À définir]');
      doc.text('• Itinéraire: [À définir]');
      doc.text('• Durée estimée: [À calculer]');

      doc.end();

      const documentResult = await query(
        `INSERT INTO mission_documents (mission_id, document_type, document_name, file_path, file_size, generated_by) 
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        [mission.id, 'route', fileName, filePath, 0, mission.created_by]
      );

      return documentResult.rows[0];
    } catch (error) {
      console.error('Generate route document error:', error);
      throw error;
    }
  },

  // Générer la dotation prévisionnelle
  generateBudgetDocument: async (mission) => {
    try {
      const doc = new PDFDocument();
      const fileName = `budget_${mission.mission_reference}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../uploads/documents', fileName);
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));

      doc.fontSize(16).text('DOTATION PRÉVISIONNELLE', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Référence: ${mission.mission_reference}`);
      doc.text(`Coût total estimé: ${mission.estimated_costs || 0} MRU`);
      doc.moveDown();

      // Détail des frais par participant
      const participants = await MissionService.getMissionParticipants(mission.id);
      doc.text('DÉTAIL DES FRAIS PAR PARTICIPANT:', { underline: true });
      doc.moveDown();

      let totalCosts = 0;
      for (const participant of participants) {
        doc.text(`• ${participant.external_name} ${participant.external_firstname}:`);
        doc.text(`  - Indemnité journalière: ${participant.daily_allowance || 0} MRU/jour`);
        doc.text(`  - Frais d'hébergement: ${participant.accommodation_allowance || 0} MRU/jour`);
        doc.text(`  - Frais de transport: ${participant.transport_allowance || 0} MRU`);
        doc.text(`  - Total: ${participant.total_allowance || 0} MRU`);
        doc.moveDown();
        totalCosts += participant.total_allowance || 0;
      }

      doc.text(`TOTAL GÉNÉRAL: ${totalCosts} MRU`, { underline: true });

      doc.end();

      const documentResult = await query(
        `INSERT INTO mission_documents (mission_id, document_type, document_name, file_path, file_size, generated_by) 
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        [mission.id, 'budget', fileName, filePath, 0, mission.created_by]
      );

      return documentResult.rows[0];
    } catch (error) {
      console.error('Generate budget document error:', error);
      throw error;
    }
  },

  // Générer l'état de sortie de carburant
  generateFuelExitDocument: async (mission) => {
    try {
      const doc = new PDFDocument();
      const fileName = `fuel_exit_${mission.mission_reference}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../uploads/documents', fileName);
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));

      doc.fontSize(16).text('ÉTAT DE SORTIE DE CARBURANT', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Référence: ${mission.mission_reference}`);
      doc.text(`Véhicule: [À définir]`);
      doc.text(`Carburant initial: [À mesurer] litres`);
      doc.text(`Carburant estimé: ${mission.estimated_fuel || 0} litres`);
      doc.moveDown();

      doc.text('DÉTAILS DE LA SORTIE:', { underline: true });
      doc.text('• Date de sortie: [À remplir]');
      doc.text('• Heure de sortie: [À remplir]');
      doc.text('• Kilométrage initial: [À noter]');
      doc.text('• Responsable de la sortie: [À signer]');

      doc.end();

      const documentResult = await query(
        `INSERT INTO mission_documents (mission_id, document_type, document_name, file_path, file_size, generated_by) 
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        [mission.id, 'fuel_exit', fileName, filePath, 0, mission.created_by]
      );

      return documentResult.rows[0];
    } catch (error) {
      console.error('Generate fuel exit document error:', error);
      throw error;
    }
  },

  // Générer l'état d'utilisation de la dotation
  generateBudgetUsageDocument: async (mission) => {
    try {
      const doc = new PDFDocument();
      const fileName = `budget_usage_${mission.mission_reference}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../uploads/documents', fileName);
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));

      doc.fontSize(16).text('ÉTAT D\'UTILISATION DE LA DOTATION', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Référence: ${mission.mission_reference}`);
      doc.text(`Dotation initiale: ${mission.estimated_costs || 0} MRU`);
      doc.moveDown();

      doc.text('DÉTAIL DE L\'UTILISATION:', { underline: true });
      doc.text('• Frais réels engagés: [À remplir] MRU');
      doc.text('• Écart avec la prévision: [À calculer] MRU');
      doc.text('• Justificatifs fournis: [À lister]');
      doc.text('• Date de retour: [À remplir]');
      doc.text('• Responsable du retour: [À signer]');

      doc.end();

      const documentResult = await query(
        `INSERT INTO mission_documents (mission_id, document_type, document_name, file_path, file_size, generated_by) 
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        [mission.id, 'budget_usage', fileName, filePath, 0, mission.created_by]
      );

      return documentResult.rows[0];
    } catch (error) {
      console.error('Generate budget usage document error:', error);
      throw error;
    }
  },

  // Obtenir les documents d'une mission
  getMissionDocuments: async (missionId) => {
    try {
      const result = await query(
        'SELECT * FROM mission_documents WHERE mission_id = ? ORDER BY generated_at DESC',
        [missionId]
      );
      return result.rows;
    } catch (error) {
      console.error('Get mission documents error:', error);
      throw error;
    }
  },

  // Obtenir un document par ID
  getDocumentById: async (documentId) => {
    try {
      const result = await query(
        'SELECT * FROM mission_documents WHERE id = ?',
        [documentId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Get document by ID error:', error);
      throw error;
    }
  }
};

module.exports = DocumentService;



