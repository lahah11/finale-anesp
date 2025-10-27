const express = require('express');
const { query } = require('../config/database-sqlite');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/institution - Récupérer les utilisateurs de l'institution (DOIT être avant /:id)
router.get('/institution', auth, async (req, res) => {
  try {
    console.log('🔍 Debug users/institution GET - req.user:', req.user);
    
    const users = await query(`
      SELECT u.id, u.username, u.email, u.role, u.institution_id, u.institution_role_id, u.is_active, u.created_at,
             i.name as institution_name,
             ir.role_name, ir.role_code
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN institution_roles ir ON u.institution_role_id = ir.id
      WHERE u.institution_id = ?
      ORDER BY u.created_at DESC
    `, [req.user.institution_id]);
    
    res.json(users.rows || []);
  } catch (error) {
    console.error('Error fetching users by institution:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs de l\'institution' });
  }
});

// GET /api/users - Récupérer tous les utilisateurs
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔍 Debug users GET - req.user:', req.user);
    
    const users = await query(`
      SELECT u.id, u.username, u.email, u.role, u.institution_id, u.institution_role_id, u.is_active, u.created_at,
             i.name as institution_name,
             ir.role_name, ir.role_code
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      LEFT JOIN institution_roles ir ON u.institution_role_id = ir.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(users.rows || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// POST /api/users - Créer un nouvel utilisateur
router.post('/', auth, async (req, res) => {
  try {
    console.log('🔍 Debug users POST - req.user:', req.user);
    console.log('🔍 Debug users POST - req.body:', req.body);
    
    const { username, email, password, institution_id, institution_role_id, is_active } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUser.rows && existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Un utilisateur avec ce nom d\'utilisateur ou email existe déjà' });
    }
    
    // Hasher le mot de passe
    console.log('🔍 Debug - Hachage du mot de passe...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('✅ Mot de passe haché');
    
    // Déterminer le rôle utilisateur basé sur l'institution_role_id
    console.log('🔍 Debug - Récupération du rôle avec ID:', institution_role_id);
    const roleQuery = await query('SELECT role_code FROM institution_roles WHERE id = ?', [institution_role_id]);
    console.log('🔍 Debug - Résultat de la requête rôle:', roleQuery.rows);
    
    // Mapper les role_code vers les rôles autorisés dans la contrainte CHECK
    const roleCodeMapping = {
      'super_admin': 'super_admin',
      'hr': 'hr',
      'directeur_general': 'dg',
      'service_moyens_generaux': 'msgg',
      'agent_mission': 'agent',
      'agent_rh': 'hr',
      'directeur_technique': 'dg',
      'ingenieur': 'agent',
      'daf': 'dg',
      'chef_logistique': 'msgg',
      'directeur_finance': 'dg'
    };
    
    const institutionRoleCode = roleQuery.rows && roleQuery.rows.length > 0 ? roleQuery.rows[0].role_code : 'agent';
    const roleCode = roleCodeMapping[institutionRoleCode] || 'agent';
    console.log('🔍 Debug - Role code déterminé:', roleCode);
    
    console.log('🔍 Debug - Données pour insertion:');
    console.log('  - username:', username);
    console.log('  - email:', email);
    console.log('  - roleCode:', roleCode);
    console.log('  - institution_id:', institution_id);
    console.log('  - institution_role_id:', institution_role_id);
    console.log('  - is_active:', is_active || 1);
    
    const result = await query(
      `INSERT INTO users (username, email, password, role, institution_id, institution_role_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [username, email, hashedPassword, roleCode, institution_id, institution_role_id, is_active || 1]
    );
    console.log('✅ Utilisateur inséré avec succès, ID:', result.lastID || result.lastInsertRowid);
    
    // Récupérer l'utilisateur créé par son username (car l'ID est généré automatiquement)
    const newUser = await query(
      `SELECT u.id, u.username, u.email, u.role, u.institution_id, u.institution_role_id, u.is_active, u.created_at,
              i.name as institution_name,
              ir.role_name, ir.role_code
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       LEFT JOIN institution_roles ir ON u.institution_role_id = ir.id
       WHERE u.username = ?`,
      [username]
    );
    
    console.log('✅ Utilisateur créé avec succès:', newUser.rows[0]);
    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// PUT /api/users/:id - Modifier un utilisateur
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, institution_id, institution_role_id, is_active } = req.body;
    
    // Vérifier si l'utilisateur existe
    const user = await query('SELECT id FROM users WHERE id = ?', [id]);
    if (!user.rows || user.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Vérifier si le nouveau nom d'utilisateur ou email existe déjà (sauf pour cet utilisateur)
    const existingUser = await query(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, id]
    );
    
    if (existingUser.rows && existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Un utilisateur avec ce nom d\'utilisateur ou email existe déjà' });
    }
    
    // Récupérer le rôle pour déterminer le type d'utilisateur
    const roleQuery = await query('SELECT role_code FROM institution_roles WHERE id = ?', [institution_role_id]);
    const roleCode = roleQuery.rows && roleQuery.rows.length > 0 ? roleQuery.rows[0].role_code : 'user';
    
    // Construire la requête de mise à jour
    let updateQuery = `
      UPDATE users SET 
        username = ?, email = ?, institution_id = ?, institution_role_id = ?, role = ?, is_active = ?, updated_at = datetime('now')
    `;
    let updateParams = [username, email, institution_id, institution_role_id, roleCode, is_active];
    
    // Ajouter le mot de passe seulement s'il est fourni
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
    }
    
    updateQuery += ' WHERE id = ?';
    updateParams.push(id);
    
    await query(updateQuery, updateParams);
    
    const updatedUser = await query(
      `SELECT u.id, u.username, u.email, u.role, u.institution_id, u.institution_role_id, u.is_active, u.created_at,
              i.name as institution_name,
              ir.role_name, ir.role_code
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       LEFT JOIN institution_roles ir ON u.institution_role_id = ir.id
       WHERE u.id = ?`,
      [id]
    );
    
    res.json(updatedUser.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'utilisateur' });
  }
});

// DELETE /api/users/:id - Supprimer un utilisateur
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'utilisateur existe
    const user = await query('SELECT id FROM users WHERE id = ?', [id]);
    if (!user.rows || user.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    await query('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});


module.exports = router;
