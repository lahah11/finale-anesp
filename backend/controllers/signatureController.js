const { query } = require('../config/database');
const { validationResult } = require('express-validator');

const signatureController = {
  // Get signatures by institution
  getByInstitution: async (req, res) => {
    try {
      const institutionId = req.user.role === 'super_admin' 
        ? req.params.institutionId 
        : req.user.institution_id;

      const result = await query(
        `SELECT * FROM signatures 
         WHERE institution_id = $1 AND is_active = true
         ORDER BY role, created_at DESC`,
        [institutionId]
      );

      res.json({ signatures: result.rows });
    } catch (error) {
      console.error('Get signatures error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create signature
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { signed_by, title, role, institution_id } = req.body;

      // Validate institution access
      const targetInstitutionId = institution_id || req.user.institution_id;
      
      if (req.user.role !== 'super_admin' && targetInstitutionId !== req.user.institution_id) {
        return res.status(403).json({ error: 'Cannot create signature for different institution' });
      }

      // Deactivate existing signatures for this role
      await query(
        'UPDATE signatures SET is_active = false WHERE institution_id = $1 AND role = $2',
        [targetInstitutionId, role]
      );

      const signature_url = req.files?.signature ? `/uploads/signatures/${req.files.signature[0].filename}` : null;
      const stamp_url = req.files?.stamp ? `/uploads/stamps/${req.files.stamp[0].filename}` : null;

      const result = await query(
        `INSERT INTO signatures (institution_id, signed_by, title, role, signature_url, stamp_url) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [targetInstitutionId, signed_by, title, role, signature_url, stamp_url]
      );

      res.status(201).json({
        message: 'Signature created successfully',
        signature: result.rows[0]
      });
    } catch (error) {
      console.error('Create signature error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update signature
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { signed_by, title } = req.body;

      // Check if signature exists and belongs to same institution
      const existingSignature = await query(
        'SELECT institution_id FROM signatures WHERE id = $1',
        [id]
      );

      if (existingSignature.rows.length === 0) {
        return res.status(404).json({ error: 'Signature not found' });
      }

      if (req.user.role !== 'super_admin' && 
          existingSignature.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      let updateQuery = `UPDATE signatures SET signed_by = $1, title = $2, updated_at = CURRENT_TIMESTAMP`;
      let params = [signed_by, title];

      if (req.files?.signature) {
        updateQuery += `, signature_url = $3`;
        params.push(`/uploads/signatures/${req.files.signature[0].filename}`);
      }

      if (req.files?.stamp) {
        const stampIndex = req.files?.signature ? 4 : 3;
        updateQuery += `, stamp_url = $${stampIndex}`;
        params.push(`/uploads/stamps/${req.files.stamp[0].filename}`);
      }

      updateQuery += ` WHERE id = $${params.length + 1} RETURNING *`;
      params.push(id);

      const result = await query(updateQuery, params);

      res.json({
        message: 'Signature updated successfully',
        signature: result.rows[0]
      });
    } catch (error) {
      console.error('Update signature error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete signature
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if signature exists and belongs to same institution
      const existingSignature = await query(
        'SELECT institution_id FROM signatures WHERE id = $1',
        [id]
      );

      if (existingSignature.rows.length === 0) {
        return res.status(404).json({ error: 'Signature not found' });
      }

      if (req.user.role !== 'super_admin' && 
          existingSignature.rows[0].institution_id !== req.user.institution_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await query('DELETE FROM signatures WHERE id = $1', [id]);

      res.json({ message: 'Signature deleted successfully' });
    } catch (error) {
      console.error('Delete signature error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = signatureController;