const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const STATUSES = {
  PENDING_TECHNICAL: 'pending_technical',
  PENDING_LOGISTICS: 'pending_logistics',
  PENDING_FINANCE: 'pending_finance',
  PENDING_DG: 'pending_dg',
  VALIDATED: 'validated',
  AWAITING_CLOSURE: 'awaiting_closure',
  CLOSED: 'closed',
  REJECTED_TECHNICAL: 'rejected_technical',
  REJECTED_FINANCE: 'rejected_finance',
  REJECTED_FINAL: 'rejected_final'
};

const VALIDATION_STEPS = {
  CREATION: 'creation',
  TECHNICAL: 'technical_validation',
  LOGISTICS: 'logistics_assignment',
  FINANCE: 'finance_validation',
  FINAL: 'final_validation',
  DOCUMENT_UPLOAD: 'document_upload',
  CLOSURE: 'closure_verification'
};

const parseJSON = (value, fallback = null) => {
  try {
    if (!value) {
      return fallback;
    }
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const recordAudit = async (missionId, userId, action, details = {}) => {
  console.log(`[AUDIT] mission=${missionId} action=${action} user=${userId}`, details);
  await query(
    `INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, payload, created_at)
     VALUES (?, 'mission', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [uuidv4(), missionId, action, userId, JSON.stringify(details || {})]
  );
};

const appendHistory = async (missionId, entry) => {
  const current = await query('SELECT validation_history FROM missions_unified WHERE id = ?', [missionId]);
  const history = parseJSON(current.rows[0]?.validation_history, []);
  const nextHistory = [...history, { ...entry, timestamp: entry.timestamp || new Date().toISOString() }];
  await query('UPDATE missions_unified SET validation_history = ? WHERE id = ?', [JSON.stringify(nextHistory), missionId]);
  return nextHistory;
};

const updateMission = async (missionId, updates) => {
  if (!updates || Object.keys(updates).length === 0) {
    return null;
  }

  const fields = [];
  const values = [];
  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    values.push(value);
  });
  values.push(missionId);

  await query(
    `UPDATE missions_unified SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  return SimpleUnifiedMissionService.getMissionById(missionId);
};

const getMissionReference = async (institutionId) => {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT COUNT(*) AS total
     FROM missions_unified
     WHERE institution_id = ? AND strftime('%Y', created_at) = ?`,
    [institutionId, String(year)]
  );
  const count = parseInt(result.rows?.[0]?.total || 0, 10) + 1;
  return `${year}-${institutionId}-${count.toString().padStart(4, '0')}`;
};

const findValidatorId = async (institutionId, roleCode) => {
  const result = await query(
    `SELECT u.id
     FROM users u
     JOIN institution_roles ir ON u.institution_role_id = ir.id
     WHERE u.institution_id = ?
       AND ir.role_code = ?
       AND u.is_active = 1
     ORDER BY u.created_at DESC
     LIMIT 1`,
    [institutionId, roleCode]
  );
  return result.rows?.[0]?.id || null;
};

const SimpleUnifiedMissionService = {
  createMission: async (missionData, userId, institutionId) => {
    const missionId = uuidv4();
    const missionReference = await getMissionReference(institutionId);

    const {
      mission_object,
      mission_description,
      departure_date,
      return_date,
      departure_city,
      departure_city_name,
      arrival_city,
      arrival_city_name,
      transport_mode,
      mission_type,
      participants = [],
      budget_code,
      mission_budget,
      mission_currency,
      project_reference,
      notes
    } = missionData;

    await query(
      `INSERT INTO missions_unified (
         id,
         institution_id,
         mission_reference,
         mission_object,
         mission_description,
         departure_date,
         return_date,
         departure_city,
         departure_city_name,
         arrival_city,
         arrival_city_name,
         transport_mode,
         mission_type,
         budget_code,
         mission_budget,
         mission_currency,
         project_reference,
         status,
         current_step,
         created_by,
         created_at,
         validation_history
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`
      , [
        missionId,
        institutionId,
        missionReference,
        mission_object,
        mission_description || null,
        departure_date,
        return_date,
        departure_city || null,
        departure_city_name || null,
        arrival_city || null,
        arrival_city_name || null,
        transport_mode,
        mission_type || 'standard',
        budget_code || null,
        mission_budget || null,
        mission_currency || 'MRU',
        project_reference || null,
        STATUSES.PENDING_TECHNICAL,
        1,
        userId,
        JSON.stringify([
          {
            step: VALIDATION_STEPS.CREATION,
            actor: userId,
            status: 'submitted',
            notes: notes || null,
            timestamp: new Date().toISOString()
          }
        ])
      ]
    );

    for (const participant of participants) {
      await query(
        `INSERT INTO mission_participants (
           id,
           mission_id,
           participant_type,
           employee_id,
           full_name,
           role_in_mission,
           external_email,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        , [
          uuidv4(),
          missionId,
          participant.participant_type || 'anesp',
          participant.employee_id || null,
          participant.full_name || participant.external_name || null,
          participant.role_in_mission || null,
          participant.external_email || null
        ]
      );
    }

    await recordAudit(missionId, userId, 'mission_created', { mission_reference: missionReference });

    const mission = await SimpleUnifiedMissionService.getMissionById(missionId);
    const nextValidatorId = await findValidatorId(institutionId, 'directeur_technique');

    return { mission, missionReference, nextValidatorId };
  },

  getMissionsByUser: async (userId, userRole, institutionId) => {
    const params = [institutionId];
    let sql =
      `SELECT DISTINCT m.*
       FROM missions_unified m
       LEFT JOIN mission_participants mp ON mp.mission_id = m.id
       WHERE m.institution_id = ?`;

    if (userRole !== 'super_admin') {
      sql += ' AND (m.created_by = ? OR mp.employee_id = ?)';
      params.push(userId, userId);
    }

    sql += ' ORDER BY m.created_at DESC';
    const result = await query(sql, params);
    return result.rows || [];
  },

  getMissionById: async (missionId) => {
    const missionResult = await query('SELECT * FROM missions_unified WHERE id = ? LIMIT 1', [missionId]);
    if (!missionResult.rows?.length) {
      return null;
    }

    const mission = missionResult.rows[0];
    mission.validation_history = parseJSON(mission.validation_history, []);
    mission.budget_summary = parseJSON(mission.budget_summary, null);
    mission.mission_requirements = parseJSON(mission.mission_requirements, null);
    mission.participants = await SimpleUnifiedMissionService.getMissionParticipants(missionId);
    return mission;
  },

  getMissionStatus: async (missionId) => {
    const result = await query(
      'SELECT id, mission_reference, status, current_step FROM missions_unified WHERE id = ? LIMIT 1',
      [missionId]
    );
    return result.rows?.[0] || null;
  },

  getMissionParticipants: async (missionId) => {
    const result = await query(
      `SELECT id, participant_type, employee_id, full_name, role_in_mission, external_email
       FROM mission_participants
       WHERE mission_id = ?
       ORDER BY created_at ASC`,
      [missionId]
    );
    return result.rows || [];
  },

  getAvailableVehicles: async (institutionId) => {
    const result = await query(
      `SELECT * FROM vehicles WHERE institution_id = ? AND is_available = 1 ORDER BY name`,
      [institutionId]
    );
    return result.rows || [];
  },

  getAvailableDrivers: async (institutionId) => {
    const result = await query(
      `SELECT * FROM drivers WHERE institution_id = ? AND is_available = 1 ORDER BY full_name`,
      [institutionId]
    );
    return result.rows || [];
  },

  calculateMissionCosts: async (participants, departureDate, returnDate) => {
    const start = new Date(departureDate);
    const end = new Date(returnDate);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const enriched = (participants || []).map((participant) => ({
      ...participant,
      estimated_allowance: Number(participant.daily_allowance || 0) * days
    }));

    const total = enriched.reduce((sum, participant) => sum + Number(participant.estimated_allowance || 0), 0);
    return { days, participants: enriched, total };
  },

  calculateFuelEstimate: async (transportMode, departureDate, returnDate) => {
    if (transportMode !== 'car') {
      return 0;
    }
    const start = new Date(departureDate);
    const end = new Date(returnDate);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    return days * 25;
  },

  validateTechnical: async (missionId, userId, decision, comment = null) => {
    const mission = await SimpleUnifiedMissionService.getMissionById(missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }
    if (mission.status !== STATUSES.PENDING_TECHNICAL) {
      throw new Error('La mission n\'est pas en attente de validation technique');
    }

    const updates = {
      technical_validated_by: userId,
      technical_validated_at: new Date().toISOString(),
      technical_comment: comment || null
    };

    let nextStatus;
    let nextValidatorId = null;

    if (decision === 'reject') {
      nextStatus = STATUSES.REJECTED_TECHNICAL;
    } else {
      nextStatus = STATUSES.PENDING_LOGISTICS;
      nextValidatorId = await findValidatorId(mission.institution_id, 'role-service_moyens_generaux');
    }

    updates.status = nextStatus;
    updates.current_step = decision === 'reject' ? mission.current_step : 2;
    updates.rejection_reason = decision === 'reject' ? comment || 'Rejet technique' : null;

    const updatedMission = await updateMission(missionId, updates);
    await appendHistory(missionId, {
      step: VALIDATION_STEPS.TECHNICAL,
      actor: userId,
      status: decision === 'reject' ? 'rejected' : 'approved',
      notes: comment || null
    });
    await recordAudit(missionId, userId, 'technical_validation', { decision, comment });

    return { mission: updatedMission, nextValidatorId };
  },

  assignLogistics: async (missionId, userId, payload = {}) => {
    const mission = await SimpleUnifiedMissionService.getMissionById(missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }
    if (mission.status !== STATUSES.PENDING_LOGISTICS) {
      throw new Error('La mission n\'est pas en attente d\'attribution logistique');
    }

    const updates = {
      status: STATUSES.PENDING_FINANCE,
      current_step: 3,
      logistics_assigned_by: userId,
      logistics_assigned_at: new Date().toISOString(),
      logistics_notes: payload.notes || null,
      vehicle_id: payload.vehicle?.id || null,
      vehicle_plate: payload.vehicle?.plate || null,
      vehicle_model: payload.vehicle?.model || null,
      vehicle_brand: payload.vehicle?.brand || null,
      driver_id: payload.driver?.id || null,
      driver_name: payload.driver?.name || null,
      driver_phone: payload.driver?.phone || null,
      driver_license: payload.driver?.license || null,
      flight_number: payload.flight?.number || null,
      airline_name: payload.flight?.airline || null,
      ticket_reference: payload.flight?.reference || null
    };

    const updatedMission = await updateMission(missionId, updates);
    await appendHistory(missionId, {
      step: VALIDATION_STEPS.LOGISTICS,
      actor: userId,
      status: 'completed',
      notes: payload.notes || null
    });
    await recordAudit(missionId, userId, 'logistics_assignment', payload);

    const nextValidatorId = await findValidatorId(mission.institution_id, 'role-daf');
    return { mission: updatedMission, nextValidatorId };
  },

  validateFinance: async (missionId, userId, decision, comment = null) => {
    const mission = await SimpleUnifiedMissionService.getMissionById(missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }
    if (mission.status !== STATUSES.PENDING_FINANCE) {
      throw new Error('La mission n\'est pas en attente de validation financière');
    }

    const updates = {
      finance_validated_by: userId,
      finance_validated_at: new Date().toISOString(),
      finance_comment: comment || null
    };

    let nextStatus;
    let nextValidatorId = null;

    if (decision === 'reject') {
      nextStatus = STATUSES.REJECTED_FINANCE;
      updates.rejection_reason = comment || 'Rejet financier';
    } else {
      nextStatus = STATUSES.PENDING_DG;
      updates.rejection_reason = null;
      nextValidatorId = await findValidatorId(mission.institution_id, 'role-dg');
    }

    updates.status = nextStatus;
    updates.current_step = decision === 'reject' ? mission.current_step : 4;

    const updatedMission = await updateMission(missionId, updates);
    await appendHistory(missionId, {
      step: VALIDATION_STEPS.FINANCE,
      actor: userId,
      status: decision === 'reject' ? 'rejected' : 'approved',
      notes: comment || null
    });
    await recordAudit(missionId, userId, 'finance_validation', { decision, comment });

    return { mission: updatedMission, nextValidatorId };
  },

  validateFinal: async (missionId, userId, decision, comment = null) => {
    const mission = await SimpleUnifiedMissionService.getMissionById(missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }
    if (mission.status !== STATUSES.PENDING_DG) {
      throw new Error('La mission n\'est pas en attente de validation finale');
    }

    const updates = {
      final_validated_by: userId,
      final_validated_at: new Date().toISOString(),
      final_comment: comment || null
    };

    if (decision === 'reject') {
      updates.status = STATUSES.REJECTED_FINAL;
      updates.rejection_reason = comment || 'Rejet final';
      updates.current_step = mission.current_step;
    } else {
      updates.status = STATUSES.VALIDATED;
      updates.rejection_reason = null;
      updates.current_step = 5;
    }

    const updatedMission = await updateMission(missionId, updates);
    await appendHistory(missionId, {
      step: VALIDATION_STEPS.FINAL,
      actor: userId,
      status: decision === 'reject' ? 'rejected' : 'approved',
      notes: comment || null
    });
    await recordAudit(missionId, userId, 'final_validation', { decision, comment });

    return { mission: updatedMission };
  },

  uploadSupportingDocuments: async (missionId, userId, documents = {}) => {
    const mission = await SimpleUnifiedMissionService.getMissionById(missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }
    if (mission.status !== STATUSES.VALIDATED) {
      throw new Error('La mission doit être validée avant le dépôt des justificatifs');
    }

    const updates = {
      status: STATUSES.AWAITING_CLOSURE,
      current_step: 6,
      documents_uploaded_by: userId,
      documents_uploaded_at: new Date().toISOString(),
      mission_report_url: documents.mission_report_url || mission.mission_report_url || null,
      stamped_mission_orders_url: documents.stamped_orders_url || mission.stamped_mission_orders_url || null
    };

    const updatedMission = await updateMission(missionId, updates);
    await appendHistory(missionId, {
      step: VALIDATION_STEPS.DOCUMENT_UPLOAD,
      actor: userId,
      status: 'submitted',
      notes: null
    });
    await recordAudit(missionId, userId, 'documents_uploaded', documents);

    return updatedMission;
  },

  closeMission: async (missionId, userId, decision, comment = null) => {
    const mission = await SimpleUnifiedMissionService.getMissionById(missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }
    if (mission.status !== STATUSES.AWAITING_CLOSURE) {
      throw new Error('La mission doit être en attente de clôture');
    }

    if (decision === 'reject') {
      const reopened = await SimpleUnifiedMissionService.reopenMissionForNewDocuments(missionId, userId, comment);
      await recordAudit(missionId, userId, 'closure_rejected', { comment });
      return { mission: reopened, closed: false };
    }

    const updates = {
      status: STATUSES.CLOSED,
      mission_closed_by: userId,
      mission_closed_at: new Date().toISOString(),
      closure_comment: comment || null,
      documents_verified_by: userId,
      documents_verified_at: new Date().toISOString()
    };

    const updatedMission = await updateMission(missionId, updates);
    await appendHistory(missionId, {
      step: VALIDATION_STEPS.CLOSURE,
      actor: userId,
      status: 'approved',
      notes: comment || null
    });
    await recordAudit(missionId, userId, 'mission_closed', { comment });

    return { mission: updatedMission, closed: true };
  },

  reopenMissionForNewDocuments: async (missionId, userId, comment = null) => {
    const updates = {
      status: STATUSES.VALIDATED,
      documents_rejection_reason: comment || null,
      documents_verified_by: userId,
      documents_verified_at: new Date().toISOString()
    };

    const updatedMission = await updateMission(missionId, updates);
    await appendHistory(missionId, {
      step: VALIDATION_STEPS.CLOSURE,
      actor: userId,
      status: 'rejected',
      notes: comment || null
    });
    await recordAudit(missionId, userId, 'mission_reopened', { comment });

    return updatedMission;
  },

  getMissionHistory: async (missionId) => {
    const missionResult = await query(
      'SELECT validation_history FROM missions_unified WHERE id = ? LIMIT 1',
      [missionId]
    );

    if (!missionResult.rows?.length) {
      return null;
    }

    const history = parseJSON(missionResult.rows[0].validation_history, []);
    const auditResult = await query(
      `SELECT id, action, performed_by, payload, created_at
       FROM audit_logs
       WHERE entity_type = 'mission' AND entity_id = ?
       ORDER BY created_at ASC`,
      [missionId]
    );

    return {
      history,
      audit: auditResult.rows || []
    };
  }
};

module.exports = SimpleUnifiedMissionService;
