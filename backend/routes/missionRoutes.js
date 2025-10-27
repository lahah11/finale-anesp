const express = require('express');
const { body } = require('express-validator');
const missionController = require('../controllers/missionController');
const { auth, authorize } = require('../middleware/auth');
const PermissionService = require('../services/permissionService');
const { uploadMissionDocuments } = require('../middleware/upload-test');

const router = express.Router();

// Validation pour la création de mission
const createMissionValidation = [
  body('mission_object').trim().notEmpty().withMessage('L\'objet de la mission est requis'),
  body('departure_date').isISO8601().withMessage('Date de départ invalide'),
  body('return_date').isISO8601().withMessage('Date de retour invalide'),
  body('transport_mode').isIn(['car', 'plane', 'train', 'other']).withMessage('Mode de transport invalide'),
  body('participants').isArray({ min: 1 }).withMessage('Au moins un participant est requis'),
  body('participants.*.participant_type').isIn(['anesp', 'external']).withMessage('Type de participant invalide'),
  body('participants.*.role_in_mission').trim().notEmpty().withMessage('Rôle dans la mission requis')
];

// Validation pour la validation technique
const technicalValidation = [
  body('action').isIn(['approve', 'reject']).withMessage('Action invalide'),
  body('rejection_reason').optional().trim()
];

// Validation pour l'attribution logistique
const logisticsValidation = [
  body('vehicle_id').trim().notEmpty().withMessage('Véhicule requis'),
  body('driver_id').trim().notEmpty().withMessage('Chauffeur requis')
];

// Validation pour la validation financière
const financeValidation = [
  body('action').isIn(['approve', 'reject']).withMessage('Action invalide'),
  body('rejection_reason').optional().trim()
];

// Validation pour la validation finale
const finalValidation = [
  body('action').isIn(['approve', 'reject']).withMessage('Action invalide'),
  body('rejection_reason').optional().trim()
];

// Validation pour l'upload des documents
const documentUploadValidation = [
  body('mission_report_url').trim().notEmpty().withMessage('URL du rapport de mission requis'),
  body('stamped_mission_orders_url').trim().notEmpty().withMessage('URL des ordres de mission cachetés requis')
];

// Validation pour la vérification et clôture
const verificationValidation = [
  body('action').isIn(['approve', 'reject']).withMessage('Action invalide'),
  body('verification_notes').optional().trim()
];

// Routes pour les missions

// Créer une mission (Ingénieur)
router.post('/',
  auth,
  PermissionService.requirePermission('mission_create'),
  createMissionValidation,
  missionController.create
);

// Obtenir toutes les missions (selon le rôle)
router.get('/',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getAll
);

// Obtenir une mission par ID
router.get('/:id',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getById
);

// Validation technique (Directeur Technique)
router.put('/:id/validate-technical',
  auth,
  PermissionService.requirePermission('mission_validate_technical'),
  technicalValidation,
  missionController.validateTechnical
);

// Attribution des moyens (Service Moyens Généraux) - UNIFIÉ (PUT)
router.put('/:id/assign-logistics',
  auth,
  PermissionService.requirePermission('mission_assign_logistics'),
  logisticsValidation,
  missionController.assignLogistics
);

// Validation financière (DAF)
router.put('/:id/validate-finance',
  auth,
  PermissionService.requirePermission('mission_validate_finance'),
  financeValidation,
  missionController.validateFinance
);

// Validation finale (DG)
router.put('/:id/validate-final',
  auth,
  PermissionService.requirePermission('mission_validate_final'),
  finalValidation,
  missionController.validateFinal
);

// Obtenir les participants d'une mission
router.get('/:id/participants',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getParticipants
);

// Obtenir les véhicules disponibles
router.get('/vehicles/available',
  auth,
  PermissionService.requirePermission('mission_assign_logistics'),
  missionController.getAvailableVehicles
);

// Obtenir les chauffeurs disponibles
router.get('/drivers/available',
  auth,
  PermissionService.requirePermission('mission_assign_logistics'),
  missionController.getAvailableDrivers
);

// Calculer les frais de mission
router.post('/calculate-costs',
  auth,
  PermissionService.requirePermission('mission_create'),
  missionController.calculateCosts
);

// Calculer l'estimation du carburant
router.post('/calculate-fuel-estimate',
  auth,
  PermissionService.requirePermission('mission_create'),
  missionController.calculateFuelEstimate
);

// Obtenir les documents d'une mission
router.get('/:id/documents',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getDocuments
);

// Télécharger un document
router.get('/:id/documents/:documentId/download',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.downloadDocument
);

// Routes du workflow de validation

// Soumettre une mission pour validation
router.post('/:id/submit',
  auth,
  PermissionService.requirePermission('mission_create'),
  missionController.submitMission
);

// Validation technique (Directeur Technique)
router.put('/:id/validate-technical',
  auth,
  PermissionService.requirePermission('mission_validate_technical'),
  technicalValidation,
  missionController.validateTechnical
);

// Attribution des moyens (Service MoyENS Généraux) - garde le PUT ci-dessus, supprime doublons

// Validation financière (DAF)
router.put('/:id/validate-finance',
  auth,
  PermissionService.requirePermission('mission_validate_finance'),
  financeValidation,
  missionController.validateFinance
);

// Validation finale (DG)
router.put('/:id/validate-final',
  auth,
  PermissionService.requirePermission('mission_validate_final'),
  finalValidation,
  missionController.validateFinal
);

// Obtenir les missions en attente pour le rôle actuel
router.get('/pending',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getPendingMissions
);

// Obtenir le statut d'une mission
router.get('/:id/status',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getMissionStatus
);

// Validation par le Directeur Général
router.put('/:id/validate-dg',
  auth,
  PermissionService.requirePermission('mission_validate_dg'),
  missionController.validateDG
);

// Refus de mission
router.put('/:id/reject',
  auth,
  PermissionService.requirePermission('mission_validate_dg'),
  missionController.rejectMission
);

// (Supprimé) validate-logistics legacy route – remplacé par assign-logistics (PUT)

// SUPPRIMÉ: route POST legacy assign-logistics (éviter collision avec système unifié)

// Upload des documents justificatifs (Ingénieur)
router.post('/:id/upload-documents',
  auth,
  PermissionService.requirePermission('Upload Documents Mission'),
  uploadMissionDocuments,
  missionController.uploadDocuments
);

// Vérifier et clôturer la mission (Service Moyens Généraux)
router.put('/:id/verify-and-close',
  auth,
  PermissionService.requirePermission('mission_verify_documents'),
  verificationValidation,
  missionController.verifyAndCloseMission
);

// Générer le PDF de l'ordre de mission
router.get('/:id/pdf',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.generatePDF
);

module.exports = router;