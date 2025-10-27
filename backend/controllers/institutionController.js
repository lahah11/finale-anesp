const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const InstitutionSetupService = require('../services/institutionSetupService');

const institutionController = {
  // Get all institutions (Super Admin only)
  getAll: async (req, res) => {
    try {
      const result = await query(
        'SELECT * FROM institutions ORDER BY created_at DESC'
      );
      res.json({ institutions: result.rows });
    } catch (error) {
      console.error('Get institutions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get single institution
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query('SELECT * FROM institutions WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Institution not found' });
      }

      res.json({ institution: result.rows[0] });
    } catch (error) {
      console.error('Get institution error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create institution with automatic role setup (Super Admin only)
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

          const { 
            name, 
            type, 
            header_text, 
            footer_text, 
            address, 
            contact_phone, 
            contact_email, 
            website, 
            establishment_date,
            // Admin user data
            admin_username,
            admin_email,
            admin_password,
            // Role users data
            dg_username,
            dg_email,
            dg_password,
            daf_username,
            daf_email,
            daf_password,
            directeur_technique_username,
            directeur_technique_email,
            directeur_technique_password,
            msgg_username,
            msgg_email,
            msgg_password
          } = req.body;
      
      const logo_url = req.file ? `/uploads/logos/${req.file.filename}` : null;

      // Données de l'institution
      const institutionData = {
        name,
        type,
        logo_url,
        header_text,
        footer_text,
        address,
        contact_phone,
        contact_email,
        website,
        establishment_date
      };

      // Données de l'admin
          const adminData = {
            username: admin_username,
            email: admin_email,
            password: admin_password,
            // Role users data
            dg_username,
            dg_email,
            dg_password,
            daf_username,
            daf_email,
            daf_password,
            directeur_technique_username,
            directeur_technique_email,
            directeur_technique_password,
            msgg_username,
            msgg_email,
            msgg_password
          };

      // Créer l'institution avec tous ses rôles et permissions
      const result = await InstitutionSetupService.createInstitutionWithRoles(
        institutionData, 
        adminData
      );

          res.status(201).json({ 
            message: 'Institution created successfully with roles, permissions and users',
            institution: result.institution,
            roles: result.roles,
            adminUser: result.adminUser,
            createdUsers: result.createdUsers,
            setupComplete: true
          });
    } catch (error) {
      console.error('Create institution error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get institution roles
  getRoles: async (req, res) => {
    try {
      const { id } = req.params;
      const PermissionService = require('../services/permissionService');
      const roles = await PermissionService.getInstitutionRoles(id);
      res.json({ roles });
    } catch (error) {
      console.error('Get institution roles error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get role permissions
  getRolePermissions: async (req, res) => {
    try {
      const { roleId } = req.params;
      const PermissionService = require('../services/permissionService');
      const permissions = await PermissionService.getRolePermissions(roleId);
      res.json({ permissions });
    } catch (error) {
      console.error('Get role permissions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update role permissions
  updateRolePermissions: async (req, res) => {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;
      const PermissionService = require('../services/permissionService');
      
      await PermissionService.updateRolePermissions(roleId, permissionIds);
      res.json({ message: 'Role permissions updated successfully' });
    } catch (error) {
      console.error('Update role permissions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get institution workflow
  getWorkflow: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query(
        'SELECT * FROM institution_workflows WHERE institution_id = $1 AND is_active = true',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      res.json({ workflow: result.rows[0] });
    } catch (error) {
      console.error('Get workflow error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update institution workflow
  updateWorkflow: async (req, res) => {
    try {
      const { id } = req.params;
      const { workflow_name, steps } = req.body;
      
      const result = await query(
        `UPDATE institution_workflows 
         SET workflow_name = $1, steps = $2, updated_at = CURRENT_TIMESTAMP
         WHERE institution_id = $3 AND is_active = true
         RETURNING *`,
        [workflow_name, JSON.stringify(steps), id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      res.json({ 
        message: 'Workflow updated successfully',
        workflow: result.rows[0]
      });
    } catch (error) {
      console.error('Update workflow error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update institution
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, type, header_text, footer_text } = req.body;
      
      let updateQuery = `UPDATE institutions SET name = $1, type = $2, header_text = $3, footer_text = $4, updated_at = CURRENT_TIMESTAMP`;
      let params = [name, type, header_text, footer_text];

      if (req.file) {
        updateQuery += `, logo_url = $5`;
        params.push(`/uploads/logos/${req.file.filename}`);
      }

      updateQuery += ` WHERE id = $${params.length + 1} RETURNING *`;
      params.push(id);

      const result = await query(updateQuery, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Institution not found' });
      }

      res.json({ 
        message: 'Institution updated successfully',
        institution: result.rows[0]
      });
    } catch (error) {
      console.error('Update institution error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete institution (Super Admin only)
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await query('DELETE FROM institutions WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Institution not found' });
      }

      res.json({ message: 'Institution deleted successfully' });
    } catch (error) {
      console.error('Delete institution error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = institutionController;