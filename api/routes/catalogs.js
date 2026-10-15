const express = require('express');
const router = express.Router();
const { getDb } = require('../db/mongo');

// GET /api/catalogs - Flexible MedicalCatalogs (Specialists & Medications)
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const type = req.query.type; // 'SPECIALIST' or 'MEDICATION'

    const filter = type ? { catalogType: type } : {};
    const catalogs = await db.collection('MedicalCatalogs').find(filter).toArray();

    res.json({ catalogs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
