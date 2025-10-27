const express = require('express');
const authRoutes = require('./authRoutes');
const institutionRoutes = require('./institutionRoutes');
const employeeRoutes = require('./employeeRoutes');
const signatureRoutes = require('./signatureRoutes');
const missionRoutes = require('./missionRoutes');
const logisticsRoutes = require('./logisticsRoutes');
const cityRoutes = require('./cityRoutes');
const engineerRoutes = require('./engineerRoutes');
const missionExpenseRoutes = require('./missionExpenseRoutes');
const userManagementRoutes = require('./userManagementRoutes');
const roleRoutes = require('./roleRoutes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Mission Order System API',
    version: '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/institutions', institutionRoutes);
router.use('/employees', employeeRoutes);
router.use('/signatures', signatureRoutes);
router.use('/missions', missionRoutes);
router.use('/logistics', logisticsRoutes);
router.use('/cities', cityRoutes);
router.use('/engineers', engineerRoutes);
router.use('/mission-expenses', missionExpenseRoutes);
router.use('/users', userManagementRoutes); // Routes de gestion des utilisateurs
router.use('/roles', roleRoutes); // Routes de gestion des rôles

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;