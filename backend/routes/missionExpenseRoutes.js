const express = require('express');
const router = express.Router();
const missionExpenseController = require('../controllers/missionExpenseController');
const { auth } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(auth);

// Routes pour le barème des frais de mission
router.get('/scale', missionExpenseController.getExpenseScale);
router.post('/calculate', missionExpenseController.calculateExpenses);
router.get('/validate', missionExpenseController.validateExpenseAvailability);
router.get('/grades', missionExpenseController.getGrades);
router.get('/destinations', missionExpenseController.getDestinations);

module.exports = router;

