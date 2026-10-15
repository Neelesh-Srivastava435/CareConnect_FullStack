const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// GET /api/clinics - Paginated list of clinics with filter
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const accepting = req.query.accepting; // 'true', 'false', or undefined
    const search = (req.query.search || '').trim();

    const conditions = [];
    const params = [];

    if (accepting === 'true' || accepting === 'false') {
      params.push(accepting === 'true');
      conditions.push(`is_accepting_patients = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR id::text ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT id, name, latitude, longitude, is_accepting_patients
      FROM clinics
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countText = `SELECT count(*) FROM clinics ${whereClause}`;

    const [rowsResult, countResult] = await Promise.all([
      db.query(queryText, [...params, limit, offset]),
      db.query(countText, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    res.json({
      clinics: rowsResult.rows,
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

// GET /api/clinics/active/list - Accepting clinics for appointment booking selector
router.get('/active/list', async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    const onlyActive = req.query.onlyActive !== 'false'; // Default to true
    let query = `
      SELECT id, name, latitude, longitude, is_accepting_patients
      FROM clinics
      WHERE 1=1
    `;
    const params = [];
    if (onlyActive) {
      query += ` AND is_accepting_patients = true`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR id::text ILIKE $${params.length})`;
    }
    query += ` ORDER BY name ASC LIMIT 50`;

    const result = await db.query(query, params);
    res.json({ clinics: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/clinics/search - Search any clinic with optional onlyActive filter
router.get('/search', async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    const onlyActive = req.query.onlyActive === 'true';
    let query = `
      SELECT id, name, latitude, longitude, is_accepting_patients
      FROM clinics
      WHERE 1=1
    `;
    const params = [];
    if (onlyActive) {
      query += ` AND is_accepting_patients = true`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR id::text ILIKE $${params.length})`;
    }
    query += ` ORDER BY name ASC LIMIT 50`;

    const result = await db.query(query, params);
    res.json({ clinics: result.rows });
  } catch (err) {
    next(err);
  }
});


// GET /api/clinics/:id - Single clinic details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id, name, latitude, longitude, is_accepting_patients FROM clinics WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    res.json({ clinic: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
