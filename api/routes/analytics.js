const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

let lastRefreshedTimestamp = new Date();

// GET /api/analytics/moving-average - Workflow 2: Window Analytics & DENSE_RANK
router.get('/moving-average', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;

    const query = `
      WITH daily_revenue AS (
          SELECT
              a.clinic_id,
              c.name AS clinic_name,
              a.created_at::date AS day,
              SUM(a.copay_amount) AS revenue
          FROM appointments a
          JOIN clinics c ON c.id = a.clinic_id
          WHERE a.created_at >= (CURRENT_DATE - INTERVAL '1 day' * $1)
          GROUP BY a.clinic_id, c.name, a.created_at::date
      ),
      moving_avg AS (
          SELECT
              clinic_id,
              clinic_name,
              day,
              revenue,
              AVG(revenue) OVER (
                  PARTITION BY clinic_id
                  ORDER BY day
                  ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
              ) AS revenue_7day_avg
          FROM daily_revenue
      )
      SELECT
          clinic_id,
          clinic_name,
          day,
          ROUND(revenue, 2) AS daily_revenue,
          ROUND(revenue_7day_avg, 2) AS revenue_7day_avg,
          DENSE_RANK() OVER (
              PARTITION BY day
              ORDER BY revenue_7day_avg DESC
          ) AS clinic_rank_that_day
      FROM moving_avg
      ORDER BY day DESC, clinic_rank_that_day ASC
    `;

    const result = await db.query(query, [days]);
    res.json({
      daysAnalyzed: days,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/discharges - Query the Materialized View
router.get('/discharges', async (req, res, next) => {
  try {
    const query = `
      SELECT clinic_id, clinic_name, month, total_discharges
      FROM clinic_monthly_discharges
      ORDER BY month DESC, total_discharges DESC
    `;

    const result = await db.query(query);

    res.json({
      lastRefreshedAt: lastRefreshedTimestamp.toISOString(),
      discharges: result.rows,
      totalDischargesOverall: result.rows.reduce(
        (sum, row) => sum + parseInt(row.total_discharges, 10),
        0
      ),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/analytics/refresh-discharges - Trigger REFRESH MATERIALIZED VIEW CONCURRENTLY
router.post('/refresh-discharges', async (req, res, next) => {
  try {
    await db.query('SELECT refresh_clinic_monthly_discharges();');
    lastRefreshedTimestamp = new Date();

    const result = await db.query(`
      SELECT clinic_id, clinic_name, month, total_discharges
      FROM clinic_monthly_discharges
      ORDER BY month DESC, total_discharges DESC
    `);

    res.json({
      success: true,
      message: 'Materialized view clinic_monthly_discharges refreshed concurrently!',
      lastRefreshedAt: lastRefreshedTimestamp.toISOString(),
      discharges: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
