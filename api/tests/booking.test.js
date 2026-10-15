const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');
const { connectToMongo, client } = require('../db/mongo');
const postgres = require('../db/postgres');

const BASE_URL = 'http://localhost:5000';
let serverInstance = null;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: { Connection: 'close', ...(options.headers || {}) },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('CareConnect Automated Test Suite', () => {
  before(async () => {
    try {
      await makeRequest('/api/health');
    } catch {
      await connectToMongo();
      await new Promise((resolve) => {
        serverInstance = app.listen(5000, () => resolve());
      });
    }
  });

  after(async () => {
    if (serverInstance) {
      if (typeof serverInstance.closeAllConnections === 'function') {
        serverInstance.closeAllConnections();
      }
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    try {
      await client.close(true);
    } catch {}
    try {
      await postgres.pool.end();
    } catch {}
    setTimeout(() => process.exit(0), 100).unref();
  });

  test('1. Health check returns healthy and both databases connected', async () => {
    const res = await makeRequest('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'HEALTHY');
    assert.equal(res.body.databases.postgresql, 'CONNECTED');
    assert.equal(res.body.databases.mongodb, 'CONNECTED');
  });

  test('2. Paginated patients browsing respects limit and returns metadata', async () => {
    const res = await makeRequest('/api/patients?page=1&limit=5');
    assert.equal(res.status, 200);
    assert.equal(res.body.patients.length, 5);
    assert.equal(res.body.pagination.limit, 5);
    assert.ok(res.body.pagination.total >= 2000);
  });

  test('3. Booking transaction rejects when HSA balance is insufficient', async () => {
    // Fetch demo actors to find a low-balance patient
    const actorsRes = await makeRequest('/api/patients/demo/actors');
    const lowBalancePatient = actorsRes.body.actors.find(
      (a) => a.demo_category === 'LOW_BALANCE'
    );
    assert.ok(lowBalancePatient, 'Low balance patient must exist in seeded data');

    // Fetch active clinics
    const clinicsRes = await makeRequest('/api/clinics/active/list');
    const clinic = clinicsRes.body.clinics[0];

    // Attempt booking with a $100 copay
    const bookingRes = await makeRequest('/api/appointments/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        patientId: lowBalancePatient.id,
        clinicId: clinic.id,
        copayAmount: 100.0,
      },
    });

    assert.equal(bookingRes.status, 400);
    assert.equal(bookingRes.body.code, 'INSUFFICIENT_FUNDS');
  });

  test('4. Booking transaction rejects when active appointment conflict exists (partial unique index)', async () => {
    // Find a patient who already has an active appointment
    const actorsRes = await makeRequest('/api/patients/demo/actors');
    const activePatient = actorsRes.body.actors.find(
      (a) => a.demo_category === 'ACTIVE_CONSULT'
    );
    assert.ok(activePatient, 'Patient with active appointment must exist');

    const clinicsRes = await makeRequest('/api/clinics/active/list');
    const clinic = clinicsRes.body.clinics[0];

    // Attempt another booking for the same patient
    const bookingRes = await makeRequest('/api/appointments/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        patientId: activePatient.id,
        clinicId: clinic.id,
        copayAmount: 10.0,
      },
    });

    assert.equal(bookingRes.status, 409);
    assert.equal(bookingRes.body.code, 'ACTIVE_CONSULTATION_EXISTS');
  });

  test('5. Workflow 3 ($geoNear) returns active mobile nurses within 5 km radius', async () => {
    const res = await makeRequest(
      '/api/nurses/nearest?lat=17.3850&lng=78.4867&maxDistance=5000'
    );
    assert.equal(res.status, 200);
    assert.ok(res.body.nurses.length > 0);
    assert.ok(res.body.nurses[0].distanceMeters <= 5000);
    // Verify distance ordering
    for (let i = 0; i < res.body.nurses.length - 1; i++) {
      assert.ok(
        res.body.nurses[i].distanceMeters <= res.body.nurses[i + 1].distanceMeters
      );
    }
  });

  test('6. Workflow 4 ($facet) returns rating distribution across all 5 stars and frequent tags', async () => {
    const res = await makeRequest('/api/reviews/analytics');
    assert.equal(res.status, 200);
    assert.equal(res.body.ratingDistribution.length, 5);
    assert.ok(res.body.topTags.length > 0);
    assert.ok(res.body.totalReviews >= 100000);
  });
});

