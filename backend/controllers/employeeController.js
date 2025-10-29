const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const MissionService = require('../services/missionService');

const ACTIVE_MISSION_STATUS_SQL = "('pending_technical','pending_logistics','pending_finance','pending_dg','validated')";

const employeeController = {
  getByInstitution: async (req, res) => {
    try {
      const institutionId = req.user.role === 'super_admin'
        ? req.params.institutionId
        : req.user.institution_id;

      const { page = 1, limit = 20, search = '' } = req.query;
      const pageNumber = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.max(1, parseInt(limit, 10) || 20);
      const offset = (pageNumber - 1) * pageSize;

      let whereClause = 'WHERE e.institution_id = ?';
      const params = [institutionId];

      if (search) {
        const likeValue = `%${search}%`;
        whereClause += ' AND ('
          + 'LOWER(e.full_name) LIKE LOWER(?)'
          + ' OR LOWER(e.matricule) LIKE LOWER(?)'
          + ' OR LOWER(e.position) LIKE LOWER(?)'
          + ')';
        params.push(likeValue, likeValue, likeValue);
      }

      const filtersParams = [...params];

      const employeesResult = await query(
        `SELECT e.*, 
                CASE
                  WHEN EXISTS (
                    SELECT 1
                    FROM mission_participants mp
                    JOIN missions_unified m ON mp.mission_id = m.id
                    WHERE mp.employee_id = e.id
                      AND m.status IN ${ACTIVE_MISSION_STATUS_SQL}
                      AND m.return_date >= CURRENT_DATE
                  ) THEN 'busy'
                  ELSE 'available'
                END AS employee_status
         FROM employees e
         ${whereClause}
         ORDER BY e.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) AS total FROM employees e ${whereClause}`,
        filtersParams
      );

      const total = parseInt(countResult.rows[0]?.total || countResult.rows[0]?.count || 0, 10);

      res.json({
        employees: employeesResult.rows,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAvailableEmployees: async (req, res) => {
    try {
      const institutionId = req.user.role === 'super_admin'
        ? req.params.institutionId
        : req.user.institution_id;

      const result = await query(
        `SELECT e.*
         FROM employees e
         WHERE e.institution_id = ?
           AND NOT EXISTS (
             SELECT 1
             FROM mission_participants mp
             JOIN missions_unified m ON mp.mission_id = m.id
             WHERE mp.employee_id = e.id
               AND m.status IN ${ACTIVE_MISSION_STATUS_SQL}
               AND m.return_date >= CURRENT_DATE
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

  endCurrentMission: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const employeeResult = await query(
        'SELECT institution_id, full_name FROM employees WHERE id = ?',
        [id]
      );

      if (!employeeResult.rows.length) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      if (req.user.role !== 'super_admin'
        && employeeResult.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const missionCandidate = await query(
        `SELECT m.id
         FROM missions_unified m
         JOIN mission_participants mp ON mp.mission_id = m.id
         WHERE mp.employee_id = ?
           AND m.status = 'validated'
           AND m.departure_date <= CURRENT_DATE
           AND m.return_date >= CURRENT_DATE
         ORDER BY m.return_date DESC
         LIMIT 1`,
        [id]
      );

      if (!missionCandidate.rows.length) {
        return res.status(404).json({ error: 'No active mission found for this employee' });
      }

      const missionId = missionCandidate.rows[0].id;

      await query(
        'UPDATE missions_unified SET return_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [missionId]
      );

      const missionResult = await query('SELECT * FROM missions_unified WHERE id = ?', [missionId]);

      res.json({
        message: 'Mission ended successfully',
        mission: missionResult.rows[0],
        reason: reason || null,
        employeeName: employeeResult.rows[0].full_name
      });
    } catch (error) {
      console.error('End mission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const employeeResult = await query('SELECT * FROM employees WHERE id = ?', [id]);

      if (!employeeResult.rows.length) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const employee = employeeResult.rows[0];

      if (req.user.role !== 'super_admin'
        && employee.institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const missionResult = await query(
        `SELECT m.*
         FROM missions_unified m
         JOIN mission_participants mp ON mp.mission_id = m.id
         WHERE mp.employee_id = ?
           AND m.status IN ${ACTIVE_MISSION_STATUS_SQL}
           AND m.return_date >= CURRENT_DATE
         ORDER BY m.created_at DESC
         LIMIT 1`,
        [id]
      );

      if (missionResult.rows.length) {
        const mission = missionResult.rows[0];
        employee.current_mission = {
          id: mission.id,
          mission_reference: mission.mission_reference,
          mission_object: mission.mission_object,
          destination: mission.arrival_city_name || mission.arrival_city_id,
          departure_date: mission.departure_date,
          return_date: mission.return_date,
          status: mission.status
        };
      } else {
        employee.current_mission = null;
      }

      res.json({ employee });
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matricule, full_name, passport_number, position, email, phone, institution_id } = req.body;
      const targetInstitutionId = institution_id || req.user.institution_id;

      if (req.user.role !== 'super_admin' && targetInstitutionId !== req.user.institution_id) {
        return res.status(403).json({ error: 'Cannot create employee for different institution' });
      }

      const existingEmployee = await query(
        'SELECT id FROM employees WHERE matricule = ? AND institution_id = ?',
        [matricule, targetInstitutionId]
      );

      if (existingEmployee.rows.length > 0) {
        return res.status(400).json({ error: 'Employee with this matricule already exists' });
      }

      const result = await query(
        `INSERT INTO employees (institution_id, matricule, full_name, passport_number, position, email, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
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

  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { matricule, full_name, passport_number, position, email, phone } = req.body;

      const existingEmployee = await query(
        'SELECT institution_id FROM employees WHERE id = ?',
        [id]
      );

      if (!existingEmployee.rows.length) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      if (req.user.role !== 'super_admin'
        && existingEmployee.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await query(
        `UPDATE employees
         SET matricule = ?,
             full_name = ?,
             passport_number = ?,
             position = ?,
             email = ?,
             phone = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         RETURNING *`,
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

  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const existingEmployee = await query(
        'SELECT institution_id FROM employees WHERE id = ?',
        [id]
      );

      if (!existingEmployee.rows.length) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      if (req.user.role !== 'super_admin'
        && existingEmployee.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const hasActiveMission = await MissionService.hasActiveMissionForEmployee(id);
      if (hasActiveMission) {
        return res.status(400).json({ error: 'Cannot delete employee with active missions' });
      }

      await query('DELETE FROM employees WHERE id = ?', [id]);

      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  search: async (req, res) => {
    try {
      const { q } = req.query;
      const institutionId = req.user.institution_id;

      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const likeValue = `%${q}%`;
      const result = await query(
        `SELECT * FROM employees
         WHERE institution_id = ? AND (
           LOWER(full_name) LIKE LOWER(?) OR
           LOWER(matricule) LIKE LOWER(?) OR
           LOWER(position) LIKE LOWER(?)
         )
         ORDER BY full_name`,
        [institutionId, likeValue, likeValue, likeValue]
      );

      res.json({ employees: result.rows });
    } catch (error) {
      console.error('Search employees error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = employeeController;
