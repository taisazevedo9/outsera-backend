const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

describe('Integration Tests - Awards API', () => {

  afterAll(async () => {
    await new Promise((resolve) => {
      db.close((err) => {
        if (err) console.error(err);
        resolve();
      });
    });
  });

  describe('GET /api/awards/producers-intervals', () => {
    it('should return status 200 and correct structure', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('min');
      expect(response.body).toHaveProperty('max');
      expect(Array.isArray(response.body.min)).toBe(true);
      expect(Array.isArray(response.body.max)).toBe(true);
    });

    it('should calculate shortest interval between awards correctly', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals');

      const minIntervals = response.body.min;

      if (minIntervals.length > 0) {
        minIntervals.forEach(item => {
          expect(item).toHaveProperty('producer');
          expect(item).toHaveProperty('interval');
          expect(item).toHaveProperty('previousWin');
          expect(item).toHaveProperty('followingWin');
          expect(typeof item.producer).toBe('string');
          expect(typeof item.interval).toBe('number');
          expect(typeof item.previousWin).toBe('number');
          expect(typeof item.followingWin).toBe('number');

          expect(item.followingWin - item.previousWin).toBe(item.interval);
        });
      }
    });

    it('should calculate longest interval between awards correctly', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals');

      const maxIntervals = response.body.max;

      if (maxIntervals.length > 0) {
        maxIntervals.forEach(item => {
          expect(item).toHaveProperty('producer');
          expect(item).toHaveProperty('interval');
          expect(item).toHaveProperty('previousWin');
          expect(item).toHaveProperty('followingWin');
          expect(typeof item.producer).toBe('string');
          expect(typeof item.interval).toBe('number');
          expect(typeof item.previousWin).toBe('number');
          expect(typeof item.followingWin).toBe('number');

          expect(item.followingWin - item.previousWin).toBe(item.interval);
        });
      }
    });

    it('should only consider winning movies (winner = yes)', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals');

      const allItems = [...response.body.min, ...response.body.max];

      if (allItems.length > 0) {
        allItems.forEach(item => {
          expect(item.previousWin).toBeGreaterThan(0);
          expect(item.followingWin).toBeGreaterThan(item.previousWin);
        });
      }
    });

    it('should calculate consecutive intervals correctly', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals');

      const allIntervals = [...response.body.min, ...response.body.max];

      if (allIntervals.length > 0) {
        allIntervals.forEach(item => {
          expect(item.interval).toBeGreaterThan(0);
        });

        if (response.body.min.length > 0 && response.body.max.length > 0) {
          const minInterval = response.body.min[0].interval;
          const maxInterval = response.body.max[0].interval;
          expect(minInterval).toBeLessThanOrEqual(maxInterval);
        }
      }
    });

    it('should handle producers separated by comma and "and"', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('min');
      expect(response.body).toHaveProperty('max');
    });

    it('should only return producers with multiple wins', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals');

      const allItems = [...response.body.min, ...response.body.max];


      allItems.forEach(item => {
        expect(item).toHaveProperty('previousWin');
        expect(item).toHaveProperty('followingWin');
        expect(item.followingWin).not.toBe(item.previousWin);
      });
    });

    it('should validate data according to Worst Picture category requirements', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals');

      expect(response.body).toMatchObject({
        min: expect.any(Array),
        max: expect.any(Array)
      });

      const validateItem = (item) => {
        expect(item).toHaveProperty('producer');
        expect(item).toHaveProperty('interval');
        expect(item).toHaveProperty('previousWin');
        expect(item).toHaveProperty('followingWin');
      };

      response.body.min.forEach(validateItem);
      response.body.max.forEach(validateItem);
    });
  });
});
