const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// GET /api/appointments - Paginated list of appointments with filters
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const status = (req.query.status || '').trim();
    const patientId = (req.query.patientId || '').trim();
    const clinicId = (req.query.clinicId || '').trim();
    const search = (req.query.search || '').trim();

    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (patientId) {
      params.push(patientId);
      conditions.push(`a.patient_id = $${params.length}`);
    }

    if (clinicId) {
      params.push(clinicId);
      conditions.push(`a.clinic_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR c.name ILIKE $${params.length} OR a.id::text ILIKE $${params.length} OR p.id::text ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT 
        a.id, 
        a.patient_id, 
        p.name AS patient_name,
        a.clinic_id, 
        c.name AS clinic_name,
        a.copay_amount, 
        a.status, 
        a.created_at
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN clinics c ON c.id = a.clinic_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countText = `
      SELECT count(*) 
      FROM appointments a
      ${whereClause}
    `;

    const [rowsResult, countResult] = await Promise.all([
      db.query(queryText, [...params, limit, offset]),
      db.query(countText, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    res.json({
      appointments: rowsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments/book - Workflow 1: Atomic Booking via Stored Procedure
router.post('/book', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { patientId, clinicId, copayAmount } = req.body;

    if (!patientId || !clinicId || copayAmount === undefined || copayAmount === null) {
      return res.status(400).json({
        error: 'Missing required parameters: patientId, clinicId, copayAmount',
      });
    }

    const copay = parseFloat(copayAmount);
    if (isNaN(copay) || copay <= 0) {
      return res.status(400).json({
        error: 'copayAmount must be a valid positive number',
      });
    }

    // 1. Fetch balance before transaction for UI comparison
    const preResult = await client.query(
      'SELECT hsa_balance, name FROM patients WHERE id = $1',
      [patientId]
    );

    if (preResult.rows.length === 0) {
      return res.status(404).json({ error: `Patient with ID ${patientId} not found` });
    }

    const balanceBefore = parseFloat(preResult.rows[0].hsa_balance);
    const patientName = preResult.rows[0].name;

    // 2. Call the PL/pgSQL Stored Procedure
    // book_appointment(p_patient_id, p_clinic_id, p_copay_amount)
    try {
      await client.query('CALL book_appointment($1, $2, $3)', [
        patientId,
        clinicId,
        copay,
      ]);
    } catch (procError) {
      const msg = procError.message || '';

      // Business Rule 1: Insufficient Balance
      if (msg.includes('Insufficient HSA balance')) {
        return res.status(400).json({
          code: 'INSUFFICIENT_FUNDS',
          error: 'Transaction Failed: Insufficient HSA balance.',
          details: msg,
          balanceBefore,
          requiredAmount: copay,
        });
      }

      // Business Rule 2: Partial Unique Index / Active consult conflict
      if (
        msg.includes('already has an active appointment') ||
        msg.includes('idx_active_consult')
      ) {
        return res.status(409).json({
          code: 'ACTIVE_CONSULTATION_EXISTS',
          error: 'Booking Blocked: Patient already has an active appointment in progress.',
          details: 'The partial unique index (idx_active_consult) prevents concurrent active consultations. Complete or discharge the current appointment first.',
          balanceBefore,
        });
      }

      // Business Rule 3: Clinic not accepting patients
      if (msg.includes('is not accepting patients')) {
        return res.status(400).json({
          code: 'CLINIC_CLOSED',
          error: 'Clinic is currently not accepting new patients.',
          details: msg,
          balanceBefore,
        });
      }

      // Other unexpected errors
      return res.status(500).json({
        code: 'PROCEDURE_ERROR',
        error: 'Stored procedure failed: ' + msg,
        balanceBefore,
      });
    }

    // 3. On success, fetch the new state: balance after, new appointment, and new audit log entry
    const [postResult, apptResult, auditResult] = await Promise.all([
      client.query('SELECT hsa_balance FROM patients WHERE id = $1', [patientId]),
      client.query(
        `SELECT a.id, a.copay_amount, a.status, a.created_at, c.name AS clinic_name
         FROM appointments a
         JOIN clinics c ON c.id = a.clinic_id
         WHERE a.patient_id = $1
         ORDER BY a.created_at DESC LIMIT 1`,
        [patientId]
      ),
      client.query(
        `SELECT id, amount_changed, action_type, balance_after, logged_at
         FROM wallet_audit_logs
         WHERE patient_id = $1
         ORDER BY logged_at DESC LIMIT 1`,
        [patientId]
      ),
    ]);

    const balanceAfter = parseFloat(postResult.rows[0].hsa_balance);
    const appointment = apptResult.rows[0];
    const auditLog = auditResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully via atomic stored procedure!',
      patient: {
        id: patientId,
        name: patientName,
        balanceBefore,
        balanceAfter,
        deducted: copay,
      },
      appointment,
      auditLogProof: auditLog, // Proof that trg_wallet_audit trigger fired automatically!
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/appointments/:id/status - Move appointment through lifecycle (WAITING -> IN_CONSULTATION -> DISCHARGED)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['WAITING', 'IN_CONSULTATION', 'DISCHARGED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Must be one of: ${allowed.join(', ')}`,
      });
    }

    const result = await db.query(
      `UPDATE appointments
       SET status = $1
       WHERE id = $2
       RETURNING id, patient_id, clinic_id, copay_amount, status, created_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      appointment: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
