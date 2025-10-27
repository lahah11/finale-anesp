const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const InstitutionSetupService = {
  async createInstitutionWithRoles(institutionData, adminData) {
    try {
      // 1. Create Institution
      const insertInstitutionSql = `
        INSERT INTO institutions (name, type, logo_url, header_text, footer_text, address, contact_phone, contact_email, website, establishment_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
      `;
      const institutionResult = await query(insertInstitutionSql, [
        institutionData.name,
        institutionData.type,
        institutionData.logo_url,
        institutionData.header_text,
        institutionData.footer_text,
        institutionData.address,
        institutionData.contact_phone,
        institutionData.contact_email,
        institutionData.website,
        institutionData.establishment_date
      ]);
      const newInstitution = institutionResult.rows[0];

      // 2. Define default roles for the new institution
      const defaultRoles = [
        { name: 'Directeur Général', code: 'dg', description: 'Directeur Général de l\'institution' },
        { name: 'Directeur des Moyens Généraux', code: 'msgg', description: 'Directeur des Moyens Généraux' },
        { name: 'Directeur Administratif et Financier', code: 'daf', description: 'Directeur Administratif et Financier' },
        { name: 'Ingénieur', code: 'ingenieur', description: 'Ingénieur initiateur de mission' },
        { name: 'Agent', code: 'agent', description: 'Agent simple' },
      ];

      const createdRoles = [];
      for (const roleDef of defaultRoles) {
        const roleResult = await query(
          `INSERT INTO institution_roles (institution_id, role_name, role_code, description) VALUES (?, ?, ?, ?) RETURNING *`,
          [newInstitution.id, roleDef.name, roleDef.code, roleDef.description]
        );
        createdRoles.push(roleResult.rows[0]);
      }

      // 3. Get permissions and assign them to roles
      const permissions = await query('SELECT * FROM permissions');
      const permissionsMap = {
        'dg': ['mission_view_all', 'mission_validate_final', 'mission_generate_pdf', 'institution_manage'],
        'msgg': ['mission_view_all', 'mission_validate_msgg', 'mission_assign_logistics'],
        'daf': ['mission_view_all', 'mission_validate_finance'],
        'ingenieur': ['mission_create', 'mission_edit_own', 'mission_view_own'],
        'agent': ['mission_view_own']
      };

      for (const role of createdRoles) {
        const assignedPermissions = permissionsMap[role.role_code] || [];
        for (const permCode of assignedPermissions) {
          const permission = permissions.rows.find(p => p.permission_code === permCode);
          if (permission) {
            await query(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
              [role.id, permission.id]
            );
          }
        }
      }

      // 4. Create the initial Admin user for the institution
      const adminRole = createdRoles.find(r => r.role_code === 'dg');
      if (!adminRole) {
        throw new Error('DG role not found after creation.');
      }

      const hashedPassword = await bcrypt.hash(adminData.password, 12);
      const adminUserResult = await query(
        `INSERT INTO users (id, username, email, password, role, institution_id, institution_role_id, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, username, email, role, institution_id`,
        [uuidv4(), adminData.username, adminData.email, hashedPassword, 'admin_local', newInstitution.id, adminRole.id, true]
      );
      const newAdminUser = adminUserResult.rows[0];

      // 5. Create users for each role if provided
      const createdUsers = [];
      
      // DG User
      if (adminData.dg_username && adminData.dg_email && adminData.dg_password) {
        const dgRole = createdRoles.find(r => r.role_code === 'dg');
        const dgHashedPassword = await bcrypt.hash(adminData.dg_password, 12);
        const dgUserResult = await query(
          `INSERT INTO users (id, username, email, password, role, institution_id, institution_role_id, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, username, email, role, institution_id`,
          [uuidv4(), adminData.dg_username, adminData.dg_email, dgHashedPassword, 'admin_local', newInstitution.id, dgRole.id, true]
        );
        createdUsers.push({ ...dgUserResult.rows[0], role_name: 'DG' });
      }

      // DAF User
      if (adminData.daf_username && adminData.daf_email && adminData.daf_password) {
        const dafRole = createdRoles.find(r => r.role_code === 'daf');
        const dafHashedPassword = await bcrypt.hash(adminData.daf_password, 12);
        const dafUserResult = await query(
          `INSERT INTO users (id, username, email, password, role, institution_id, institution_role_id, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, username, email, role, institution_id`,
          [uuidv4(), adminData.daf_username, adminData.daf_email, dafHashedPassword, 'admin_local', newInstitution.id, dafRole.id, true]
        );
        createdUsers.push({ ...dafUserResult.rows[0], role_name: 'DAF' });
      }

      // Directeur Technique User
      if (adminData.directeur_technique_username && adminData.directeur_technique_email && adminData.directeur_technique_password) {
        const dtRole = createdRoles.find(r => r.role_code === 'ingenieur');
        const dtHashedPassword = await bcrypt.hash(adminData.directeur_technique_password, 12);
        const dtUserResult = await query(
          `INSERT INTO users (id, username, email, password, role, institution_id, institution_role_id, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, username, email, role, institution_id`,
          [uuidv4(), adminData.directeur_technique_username, adminData.directeur_technique_email, dtHashedPassword, 'admin_local', newInstitution.id, dtRole.id, true]
        );
        createdUsers.push({ ...dtUserResult.rows[0], role_name: 'Directeur Technique' });
      }

      // MSGG User
      if (adminData.msgg_username && adminData.msgg_email && adminData.msgg_password) {
        const msggRole = createdRoles.find(r => r.role_code === 'msgg');
        const msggHashedPassword = await bcrypt.hash(adminData.msgg_password, 12);
        const msggUserResult = await query(
          `INSERT INTO users (id, username, email, password, role, institution_id, institution_role_id, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, username, email, role, institution_id`,
          [uuidv4(), adminData.msgg_username, adminData.msgg_email, msggHashedPassword, 'admin_local', newInstitution.id, msggRole.id, true]
        );
        createdUsers.push({ ...msggUserResult.rows[0], role_name: 'MSGG' });
      }

      // 5. Create default workflow for the institution
      const defaultWorkflow = {
        workflow_name: 'Workflow de validation des missions',
        workflow_type: 'mission_validation',
        steps: [
          { order: 1, role_code: 'ingenieur', action: 'create' },
          { order: 2, role_code: 'daf', action: 'validate_finance' },
          { order: 3, role_code: 'msgg', action: 'assign_logistics' },
          { order: 4, role_code: 'dg', action: 'validate_final' },
        ]
      };
      await query(
        `INSERT INTO institution_workflows (institution_id, workflow_name, workflow_type, steps) VALUES (?, ?, ?, ?)`,
        [newInstitution.id, defaultWorkflow.workflow_name, defaultWorkflow.workflow_type, JSON.stringify(defaultWorkflow.steps)]
      );

      return { 
        institution: newInstitution, 
        roles: createdRoles, 
        adminUser: newAdminUser,
        createdUsers: createdUsers
      };

    } catch (error) {
      console.error('InstitutionSetupService error:', error);
      throw error;
    }
  }
};

module.exports = InstitutionSetupService;