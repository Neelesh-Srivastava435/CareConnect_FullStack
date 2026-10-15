const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// GET /api/patients - Paginated list of patients with search
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let queryText = 'SELECT id, name, hsa_balance FROM patients';
    let countText = 'SELECT count(*) FROM patients';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      queryText += ' WHERE (name ILIKE $1 OR id::text ILIKE $1)';
      countText += ' WHERE (name ILIKE $1 OR id::text ILIKE $1)';
    }


    queryText += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [rowsResult, countResult] = await Promise.all([
      db.query(queryText, params),
      db.query(countText, search ? [`%${search}%`] : []),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    res.json({
      patients: rowsResult.rows,
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

// GET /api/patients/demo/actors - Curated patients for Demo Switcher
router.get('/demo/actors', async (req, res, next) => {
  try {
    // Select 5 bookable (high balance, no active consult), 2 low balance, 3 with active consults
    const query = `
      (
        SELECT p.id, p.name, p.hsa_balance, 'READY' AS demo_category
        FROM patients p
        WHERE p.hsa_balance >= 50.00
          AND NOT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.patient_id = p.id AND a.status IN ('WAITING', 'IN_CONSULTATION')
          )
        ORDER BY p.name ASC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT p.id, p.name, p.hsa_balance, 'LOW_BALANCE' AS demo_category
        FROM patients p
        WHERE p.hsa_balance < 20.00
        ORDER BY p.hsa_balance ASC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT p.id, p.name, p.hsa_balance, 'ACTIVE_CONSULT' AS demo_category
        FROM patients p
        WHERE EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.patient_id = p.id AND a.status IN ('WAITING', 'IN_CONSULTATION')
        )
        ORDER BY p.name ASC
        LIMIT 3
      )
    `;
    const result = await db.query(query);
    res.json({ actors: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id - Single patient details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT p.id, p.name, p.hsa_balance,
        (
          SELECT json_build_object('id', a.id, 'status', a.status, 'clinic_id', a.clinic_id, 'copay_amount', a.copay_amount)
          FROM appointments a
          WHERE a.patient_id = p.id AND a.status IN ('WAITING', 'IN_CONSULTATION')
          LIMIT 1
        ) AS active_appointment
       FROM patients p WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ patient: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
