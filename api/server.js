const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectToMongo } = require('./db/mongo');
const postgres = require('./db/postgres');

const patientsRouter = require('./routes/patients');
const clinicsRouter = require('./routes/clinics');
const appointmentsRouter = require('./routes/appointments');
const auditRouter = require('./routes/audit');
const analyticsRouter = require('./routes/analytics');
const nursesRouter = require('./routes/nurses');
const reviewsRouter = require('./routes/reviews');
const catalogsRouter = require('./routes/catalogs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Mount Routes
app.use('/api/patients', patientsRouter);
app.use('/api/clinics', clinicsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/nurses', nursesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/catalogs', catalogsRouter);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  let pgStatus = 'DISCONNECTED';
  let mongoStatus = 'DISCONNECTED';

  try {
    const pgRes = await postgres.query('SELECT 1');
    if (pgRes.rows.length > 0) pgStatus = 'CONNECTED';
  } catch (err) {
    pgStatus = `ERROR: ${err.message}`;
  }

  try {
    const { getDb } = require('./db/mongo');
    const mongoDb = getDb();
    await mongoDb.command({ ping: 1 });
    mongoStatus = 'CONNECTED';
  } catch (err) {
    mongoStatus = `ERROR: ${err.message}`;
  }

  res.json({
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    databases: {
      postgresql: pgStatus,
      mongodb: mongoStatus,
    },
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Start Server & Connect MongoDB
async function startServer() {
  try {
    await connectToMongo();
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 CareConnect API Server running on port ${PORT}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to start CareConnect API Server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
