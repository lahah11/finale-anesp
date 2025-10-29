const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('🔐 Auth middleware - Token:', token ? 'Présent' : 'Absent');
    console.log('🔐 Auth middleware - JWT_SECRET:', process.env.JWT_SECRET ? 'Présent' : 'Absent');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'anesp-mission-system-secret-key-2025');
    console.log('🔐 Auth middleware - Decoded:', decoded);
    
    const result = await query(
      'SELECT id, username, email, role, institution_id, institution_role_id FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({ error: 'Invalid token.' });
    }

    console.log('✅ Auth successful for user:', result.rows[0].username);
    req.user = result.rows[0];
    
    // S'assurer que institution_id est disponible (fallback depuis le JWT si nécessaire)
    if (!req.user.institution_id && decoded.institutionId) {
      req.user.institution_id = decoded.institutionId;
    }
    next();
  } catch (error) {
    console.log('❌ Auth error:', error.message);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

const institutionAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') {
      return next();
    }

    const institutionId = req.params.institutionId || req.body.institution_id;
    
    if (institutionId && institutionId !== req.user.institution_id) {
      return res.status(403).json({ error: 'Access denied. Different institution.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

module.exports = { auth, authorize, institutionAccess };