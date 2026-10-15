const express = require('express');
const router = express.Router();
const { getDb } = require('../db/mongo');

// GET /api/nurses/nearest - Workflow 3: $geoNear geospatial query with 5km radius
router.get('/nearest', async (req, res, next) => {
  try {
    const db = getDb();

    // Default to Hyderabad coordinates from Assignment 1 seeder
    const lat = parseFloat(req.query.lat) || 17.3850;
    const lng = parseFloat(req.query.lng) || 78.4867;
    const maxDistance = parseFloat(req.query.maxDistance) || 5000; // 5000 meters = 5 km
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          key: 'location',
          distanceField: 'distanceInMeters',
          spherical: true,
          maxDistance: maxDistance,
          query: {
            isActive: true,
          },
        },
      },
      {
        $limit: limit,
      },
    ];

    const results = await db.collection('NursePings').aggregate(pipeline).toArray();

    // Format results with human-readable distance in kilometers and miles
    const formattedNurses = results.map((n) => ({
      id: n._id,
      nurseId: n.nurseId,
      location: {
        lat: n.location.coordinates[1],
        lng: n.location.coordinates[0],
      },
      isActive: n.isActive,
      createdAt: n.createdAt,
      distanceMeters: Math.round(n.distanceInMeters),
      distanceKm: (n.distanceInMeters / 1000).toFixed(2),
    }));

    res.json({
      origin: { lat, lng },
      radiusMeters: maxDistance,
      radiusKm: (maxDistance / 1000).toFixed(1),
      count: formattedNurses.length,
      nurses: formattedNurses,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/nurses/simulate-ping - Generates a fresh nurse ping for live demo
router.post('/simulate-ping', async (req, res, next) => {
  try {
    const db = getDb();
    const lat = parseFloat(req.body.lat) || 17.3850;
    const lng = parseFloat(req.body.lng) || 78.4867;
    const nurseId = req.body.nurseId || `N_LIVE_${Math.floor(100 + Math.random() * 900)}`;

    // Generate random jitter within ~2km of the origin
    const jitterLat = lat + (Math.random() - 0.5) * 0.02;
    const jitterLng = lng + (Math.random() - 0.5) * 0.02;

    const doc = {
      nurseId,
      location: {
        type: 'Point',
        coordinates: [jitterLng, jitterLat],
      },
      isActive: true,
      createdAt: new Date(),
    };

    const insertResult = await db.collection('NursePings').insertOne(doc);

    res.status(201).json({
      success: true,
      message: 'New live nurse ping dispatched!',
      nursePing: {
        id: insertResult.insertedId,
        ...doc,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
