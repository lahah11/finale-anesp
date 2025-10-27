const { query } = require('../config/database');
const { validationResult } = require('express-validator');

const employeeController = {
  // Get employees by institution with pagination and mission status
  getByInstitution: async (req, res) => {
    try {
      const institutionId = req.user.role === 'super_admin' 
        ? req.params.institutionId 
        : req.user.institution_id;

      const { page = 1, limit = 20, search = '' } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE e.institution_id = $1';
      const params = [institutionId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        whereClause += ` AND (e.full_name LIKE ? OR e.matricule LIKE ? OR e.position LIKE ?)`;
        params.push(`%${search}%`);
      }

      const result = await query(
        `SELECT e.*, 
                'available' as employee_status
         FROM employees e
         ${whereClause}
         ORDER BY e.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) FROM employees e ${whereClause}`,
        params
      );

      res.json({
        employees: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // **NEW: Get available employees (not on active missions)**
  getAvailableEmployees: async (req, res) => {
    try {
      const institutionId = req.user.role === 'super_admin' 
        ? req.params.institutionId 
        : req.user.institution_id;

      const result = await query(
        `SELECT e.* FROM employees e
         WHERE e.institution_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM missions m 
           WHERE m.employee_id = e.id 
           AND m.status IN ('pending_dg', 'pending_msgg', 'validated') 
           AND (m.status != 'validated' OR CURRENT_DATE <= m.return_date)
         )
         ORDER BY e.full_name`,
        [institutionId]
      );

      res.json({ employees: result.rows });
    } catch (error) {
      console.error('Get available employees error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // **NEW: End current mission for employee**
  endCurrentMission: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Check if employee exists and belongs to same institution
      const employeeResult = await query(
        'SELECT institution_id, full_name FROM employees WHERE id = $1',
        [id]
      );

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      if (req.user.role !== 'super_admin' && 
          employeeResult.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Find and end current mission
      const missionResult = await query(
        `UPDATE missions 
         SET return_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP 
         WHERE employee_id = $1 
         AND status = 'validated' 
         AND CURRENT_DATE BETWEEN departure_date AND return_date
         RETURNING *`,
        [id]
      );

      if (missionResult.rows.length === 0) {
        return res.status(404).json({ error: 'No active mission found for this employee' });
      }

      res.json({ 
        message: 'Mission ended successfully',
        mission: missionResult.rows[0],
        employeeName: employeeResult.rows[0].full_name
      });
    } catch (error) {
      console.error('End mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get single employee
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await query(
        `SELECT e.*, 
                m.id as current_mission_id,
                m.mission_number as current_mission_number,
                m.destination as current_destination,
                m.departure_date as current_departure_date,
                m.return_date as current_return_date,
                m.status as current_mission_status
         FROM employees e
         LEFT JOIN missions m ON e.id = m.employee_id 
           AND m.status IN ('pending_dg', 'pending_msgg', 'validated') 
           AND (m.status != 'validated' OR CURRENT_DATE <= m.return_date)
         WHERE e.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const employee = result.rows[0];

      // Check institution access
      if (req.user.role !== 'super_admin' && 
          employee.institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ employee });
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create employee
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matricule, full_name, passport_number, position, email, phone, institution_id } = req.body;

      // Validate institution access
      const targetInstitutionId = institution_id || req.user.institution_id;
      
      if (req.user.role !== 'super_admin' && targetInstitutionId !== req.user.institution_id) {
        return res.status(403).json({ error: 'Cannot create employee for different institution' });
      }

      // Check if matricule already exists in this institution
      const existingEmployee = await query(
        'SELECT id FROM employees WHERE matricule = $1 AND institution_id = $2',
        [matricule, targetInstitutionId]
      );

      if (existingEmployee.rows.length > 0) {
        return res.status(400).json({ error: 'Employee with this matricule already exists' });
      }

      const result = await query(
        `INSERT INTO employees (institution_id, matricule, full_name, passport_number, position, email, phone) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [targetInstitutionId, matricule, full_name, passport_number, position, email, phone]
      );

      res.status(201).json({
        message: 'Employee created successfully',
        employee: result.rows[0]
      });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update employee
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { matricule, full_name, passport_number, position, email, phone } = req.body;

      // Check if employee exists and belongs to same institution
      const existingEmployee = await query(
        'SELECT institution_id FROM employees WHERE id = $1',
        [id]
      );

      if (existingEmployee.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      if (req.user.role !== 'super_admin' && 
          existingEmployee.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await query(
        `UPDATE employees 
         SET matricule = $1, full_name = $2, passport_number = $3, position = $4, email = $5, phone = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 RETURNING *`,
        [matricule, full_name, passport_number, position, email, phone, id]
      );

      res.json({
        message: 'Employee updated successfully',
        employee: result.rows[0]
      });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete employee
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if employee exists and belongs to same institution
      const existingEmployee = await query(
        'SELECT institution_id FROM employees WHERE id = $1',
        [id]
      );

      if (existingEmployee.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      if (req.user.role !== 'super_admin' && 
          existingEmployee.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // **NEW: Check if employee has active missions**
      const activeMissionResult = await query(
        'SELECT id FROM missions WHERE employee_id = $1 AND status IN ($2, $3, $4)',
        [id, 'pending_dg', 'pending_msgg', 'validated']
      );

      if (activeMissionResult.rows.length > 0) {
        return res.status(400).json({ error: 'Cannot delete employee with active missions' });
      }

      await query('DELETE FROM employees WHERE id = $1', [id]);

      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Search employees
  search: async (req, res) => {
    try {
      const { q } = req.query;
      const institutionId = req.user.institution_id;

      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const result = await query(
        `SELECT * FROM employees 
         WHERE institution_id = $1 AND (
           full_name ILIKE $2 OR 
           matricule ILIKE $2 OR 
           position ILIKE $2
         )
         ORDER BY full_name`,
        [institutionId, `%${q}%`]
      );

      res.json({ employees: result.rows });
    } catch (error) {
      console.error('Search employees error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = employeeController;