const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// GET /api/audit/:patientId - Audit trail for a specific patient with date filter & running balance
router.get('/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    const conditions = ['patient_id = $1'];
    const params = [patientId];

    if (startDate) {
      params.push(startDate);
      conditions.push(`logged_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`logged_at <= $${params.length}`);
    }

    const queryText = `
      SELECT id, patient_id, amount_changed, action_type, balance_after, logged_at
      FROM wallet_audit_logs
      WHERE ${conditions.join(' AND ')}
      ORDER BY logged_at ASC
    `;

    // Also get patient name & current balance
    const [auditResult, patientResult] = await Promise.all([
      db.query(queryText, params),
      db.query('SELECT id, name, hsa_balance FROM patients WHERE id = $1', [patientId]),
    ]);

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = patientResult.rows[0];

    res.json({
      patient,
      logs: auditResult.rows,
      totalEntries: auditResult.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/audit/live/recent - 15 most recent audit logs across the system
router.get('/live/recent', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT w.id, w.patient_id, p.name AS patient_name, w.amount_changed, w.action_type, w.balance_after, w.logged_at
       FROM wallet_audit_logs w
       JOIN patients p ON p.id = w.patient_id
       ORDER BY w.logged_at DESC
       LIMIT 15`
    );
    res.json({ logs: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
