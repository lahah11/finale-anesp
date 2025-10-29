const express = require('express');
const router = express.Router();
const engineerController = require('../controllers/engineerController');
const { auth } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(auth);

// Routes pour les ingénieurs
router.get('/', engineerController.getAllEngineers);
router.get('/by-user/:userId', engineerController.getEngineerByUserId);
router.get('/:id', engineerController.getEngineerById);
router.post('/', engineerController.createEngineer);
router.put('/:id', engineerController.updateEngineer);
router.delete('/:id', engineerController.deactivateEngineer);

module.exports = router;
