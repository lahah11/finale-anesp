const { query } = require('../config/database');

const EngineerService = {
  // Récupérer tous les ingénieurs
  getAllEngineers: async () => {
    try {
      const result = await query(
        'SELECT * FROM engineers ORDER BY first_name, last_name'
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting all engineers:', error);
      throw error;
    }
  },

  // Récupérer un ingénieur par ID
  getEngineerById: async (id) => {
    try {
      const result = await query(
        'SELECT * FROM engineers WHERE id = ?',
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting engineer by ID:', error);
      throw error;
    }
  },

  // Récupérer un ingénieur par NNI
  getEngineerByNNI: async (nni) => {
    try {
      const result = await query(
        'SELECT * FROM engineers WHERE nni = ?',
        [nni]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting engineer by NNI:', error);
      throw error;
    }
  },

  // Récupérer un ingénieur par ID utilisateur
  getEngineerByUserId: async (userId) => {
    try {
      // Pour l'instant, retourner le premier ingénieur disponible
      // TODO: Ajouter une colonne user_id à la table engineers
      const result = await query(
        'SELECT * FROM engineers ORDER BY first_name, last_name LIMIT 1'
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting engineer by user ID:', error);
      throw error;
    }
  },

  // Créer un nouvel ingénieur
  createEngineer: async (engineerData) => {
    try {
      const id = 'eng-' + Date.now();
      const result = await query(`
        INSERT INTO engineers (
          id, nni, first_name, last_name, position, department,
          phone_number, email, office_location, hire_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, engineerData.nni, engineerData.first_name, engineerData.last_name,
        engineerData.position, engineerData.department, engineerData.phone_number,
        engineerData.email, engineerData.office_location, engineerData.hire_date, 'active'
      ]);
      return id;
    } catch (error) {
      console.error('Error creating engineer:', error);
      throw error;
    }
  },

  // Mettre à jour un ingénieur
  updateEngineer: async (id, engineerData) => {
    try {
      await query(`
        UPDATE engineers SET
          nni = ?, first_name = ?, last_name = ?, position = ?, department = ?,
          phone_number = ?, email = ?, office_location = ?, hire_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        engineerData.nni, engineerData.first_name, engineerData.last_name,
        engineerData.position, engineerData.department, engineerData.phone_number,
        engineerData.email, engineerData.office_location, engineerData.hire_date, id
      ]);
      return true;
    } catch (error) {
      console.error('Error updating engineer:', error);
      throw error;
    }
  },

  // Désactiver un ingénieur
  deactivateEngineer: async (id) => {
    try {
      await query(
        'UPDATE engineers SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      return true;
    } catch (error) {
      console.error('Error deactivating engineer:', error);
      throw error;
    }
  }
};

module.exports = EngineerService;
