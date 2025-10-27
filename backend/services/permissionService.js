const { query } = require('../config/database');

const PermissionService = {
  async getPermissionByName(name) {
    const result = await query('SELECT * FROM permissions WHERE permission_name = ?', [name]);
    return result.rows[0];
  },

  async getPermissionByCode(code) {
    const result = await query('SELECT * FROM permissions WHERE permission_code = ?', [code]);
    return result.rows[0];
  },

  async getInstitutionRoles(institutionId) {
    const result = await query('SELECT * FROM institution_roles WHERE institution_id = ?', [institutionId]);
    return result.rows;
  },

  async getRolePermissions(roleId) {
    const result = await query(
      `SELECT p.id, p.permission_name, p.permission_code, p.description 
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [roleId]
    );
    return result.rows;
  },

  async updateRolePermissions(roleId, permissionIds) {
    try {
      await query('BEGIN');
      
      // Clear existing permissions for the role
      await query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

      // Insert new permissions
      for (const permissionId of permissionIds) {
        await query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permissionId]);
      }
      
      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  },

  // Check if user has a specific permission
  async checkUserPermission(userId, permissionName) {
    try {
      const result = await query(`
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        JOIN users u ON u.role = rp.role_id
        WHERE u.id = ? AND p.permission_name = ?
      `, [userId, permissionName]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  },

  // Middleware to check if user has a specific permission
  requirePermission: (permissionName) => {
    return async (req, res, next) => {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ error: 'Access denied. User role not defined.' });
      }

      // Super admin bypasses all specific permissions
      if (req.user.role === 'super_admin') {
        return next();
      }

      try {
        const hasPermission = await query(
          `SELECT 1 FROM role_permissions rp
           JOIN permissions p ON rp.permission_id = p.id
           WHERE rp.role_id = ? AND p.permission_name = ?`,
          [req.user.institution_role_id, permissionName]
        );

        if (hasPermission.rows.length > 0) {
          next();
        } else {
          res.status(403).json({ error: `Access denied. Missing permission: ${permissionName}` });
        }
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }
};

module.exports = PermissionService;