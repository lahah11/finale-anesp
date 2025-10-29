const express = require('express');
const { body } = require('express-validator');
const missionController = require('../controllers/missionController');
const { auth } = require('../middleware/auth');
const PermissionService = require('../services/permissionService');
const { uploadMissionDocuments } = require('../middleware/upload-test');

const router = express.Router();

const createMissionValidation = [
  body('mission_object').trim().notEmpty().withMessage("L'objet de la mission est requis"),
  body('departure_date').isISO8601().withMessage('Date de départ invalide'),
  body('return_date').isISO8601().withMessage('Date de retour invalide'),
  body('transport_mode').isString().notEmpty().withMessage('Mode de transport requis'),
  body('participants').isArray({ min: 1 }).withMessage('Au moins un participant est requis')
];

const technicalValidation = [
  body('decision').isIn(['approve', 'reject']).withMessage('Décision invalide'),
  body('comment').optional().trim()
];

const logisticsValidation = [
  body('vehicle').optional().isObject(),
  body('driver').optional().isObject(),
  body('flight').optional().isObject(),
  body('notes').optional().trim()
];

const financeValidation = [
  body('decision').isIn(['approve', 'reject']).withMessage('Décision invalide'),
  body('comment').optional().trim()
];

const finalValidation = [
  body('decision').isIn(['approve', 'reject']).withMessage('Décision invalide'),
  body('comment').optional().trim()
];

const verificationValidation = [
  body('decision').isIn(['approve', 'reject']).withMessage('Décision invalide'),
  body('comment').optional().trim()
];

router.post(
  '/',
  auth,
  PermissionService.requirePermission('mission_create'),
  createMissionValidation,
  missionController.create
);

router.get(
  '/',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getAll
);

router.get(
  '/vehicles/available',
  auth,
  PermissionService.requirePermission('mission_assign_logistics'),
  missionController.getAvailableVehicles
);

router.get(
  '/drivers/available',
  auth,
  PermissionService.requirePermission('mission_assign_logistics'),
  missionController.getAvailableDrivers
);

router.get(
  '/:id',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getById
);

router.get(
  '/:id/status',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getMissionStatus
);

router.get(
  '/:id/participants',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getParticipants
);

router.get(
  '/:id/history',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getMissionHistory
);

router.put(
  '/:id/validate-technical',
  auth,
  PermissionService.requirePermission('mission_validate_technical'),
  technicalValidation,
  missionController.validateTechnical
);

router.put(
  '/:id/assign-logistics',
  auth,
  PermissionService.requirePermission('mission_assign_logistics'),
  logisticsValidation,
  missionController.assignLogistics
);

router.put(
  '/:id/validate-finance',
  auth,
  PermissionService.requirePermission('mission_validate_finance'),
  financeValidation,
  missionController.validateFinance
);

router.put(
  '/:id/validate-final',
  auth,
  PermissionService.requirePermission('mission_validate_final'),
  finalValidation,
  missionController.validateFinal
);

router.post(
  '/:id/upload-documents',
  auth,
  PermissionService.requirePermission('Upload Documents Mission'),
  uploadMissionDocuments,
  missionController.uploadDocuments
);

router.put(
  '/:id/verify-and-close',
  auth,
  PermissionService.requirePermission('mission_verify_documents'),
  verificationValidation,
  missionController.verifyAndCloseMission
);

router.get(
  '/:id/documents',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.getDocuments
);

router.get(
  '/:id/documents/:documentId/download',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.downloadDocument
);

router.get(
  '/:id/pdf',
  auth,
  PermissionService.requirePermission('mission_read'),
  missionController.generatePDF
);

module.exports = router;
