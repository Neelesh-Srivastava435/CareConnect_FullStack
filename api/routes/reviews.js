const express = require('express');
const router = express.Router();
const { getDb } = require('../db/mongo');

// GET /api/reviews/analytics - Workflow 4: Multi-Faceted Review Analytics ($facet)
router.get('/analytics', async (req, res, next) => {
  try {
    const db = getDb();
    const clinicId = req.query.clinicId;

    const matchStage = clinicId ? [{ $match: { clinicId } }] : [];

    const pipeline = [
      ...matchStage,
      {
        $facet: {
          // 1. Rating distribution
          ratingBuckets: [
            {
              $group: {
                _id: '$rating',
                count: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 },
            },
          ],

          // 2. Most frequent bedside-manner tags
          frequentTags: [
            {
              $unwind: '$bedsideMannerTags',
            },
            {
              $group: {
                _id: '$bedsideMannerTags',
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
            {
              $limit: 10,
            },
          ],

          // 3. Global average rating
          globalAverage: [
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];

    const result = await db.collection('PatientReviews').aggregate(pipeline).toArray();
    const facets = result[0] || {
      ratingBuckets: [],
      frequentTags: [],
      globalAverage: [],
    };

    // Normalize rating distribution from 1 to 5 stars
    const countsByStar = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (facets.ratingBuckets || []).forEach((b) => {
      if (b._id >= 1 && b._id <= 5) {
        countsByStar[b._id] = b.count;
      }
    });

    const normalizedDistribution = [1, 2, 3, 4, 5].map((star) => ({
      star,
      count: countsByStar[star],
    }));

    const globalAvg = facets.globalAverage[0] || {
      averageRating: 0,
      totalReviews: 0,
    };

    res.json({
      averageRating: parseFloat((globalAvg.averageRating || 0).toFixed(2)),
      totalReviews: globalAvg.totalReviews || 0,
      ratingDistribution: normalizedDistribution,
      topTags: facets.frequentTags.map((t) => ({
        tag: t._id,
        count: t.count,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/recent - Recent patient reviews
router.get('/recent', async (req, res, next) => {
  try {
    const db = getDb();
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 15);

    const reviews = await db
      .collection('PatientReviews')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
