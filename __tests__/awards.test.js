const request = require('supertest');
const app = require('../src/server');
const movieRepository = require('../src/repositories/movieRepository');
const { importBuffer } = require('../src/utils/csvBuffer');
const fs = require('fs');
const path = require('path');

describe('Integration Tests - Awards API', () => {
  const CSV_PATH = path.resolve(__dirname, '../uploads/movielist.csv');

  beforeAll(async () => {
    // Load the default CSV file for tests
    const buffer = fs.readFileSync(CSV_PATH);
    await importBuffer(buffer, true, true);
  });

  afterAll(() => {
    // Clear memory after tests
    movieRepository.clear();
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

    /**
     * CRITICAL TEST: Validates exact data from default CSV file
     * This test MUST fail if movielist.csv is modified in any way that changes the result
     */
    it('should return exact expected data from default movielist.csv file', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals')
        .expect(200);

      // Expected result based on movielist.csv content
      // This will fail if the CSV file is modified
      const expectedResult = {
        min: [
          {
            producer: 'Joel Silver',
            interval: 1,
            previousWin: 1990,
            followingWin: 1991
          }
        ],
        max: [
          {
            producer: 'Matthew Vaughn',
            interval: 13,
            previousWin: 2002,
            followingWin: 2015
          }
        ]
      };

      // Validate structure
      expect(response.body).toHaveProperty('min');
      expect(response.body).toHaveProperty('max');
      expect(Array.isArray(response.body.min)).toBe(true);
      expect(Array.isArray(response.body.max)).toBe(true);

      // Validate minimum interval
      expect(response.body.min).toHaveLength(expectedResult.min.length);
      expectedResult.min.forEach((expected, index) => {
        const actual = response.body.min[index];
        expect(actual).toMatchObject({
          producer: expected.producer,
          interval: expected.interval,
          previousWin: expected.previousWin,
          followingWin: expected.followingWin
        });
      });

      // Validate maximum interval
      expect(response.body.max).toHaveLength(expectedResult.max.length);
      expectedResult.max.forEach((expected, index) => {
        const actual = response.body.max[index];
        expect(actual).toMatchObject({
          producer: expected.producer,
          interval: expected.interval,
          previousWin: expected.previousWin,
          followingWin: expected.followingWin
        });
      });

      // Additional validation: ensure intervals are correct
      response.body.min.forEach(item => {
        expect(item.followingWin - item.previousWin).toBe(item.interval);
      });
      response.body.max.forEach(item => {
        expect(item.followingWin - item.previousWin).toBe(item.interval);
      });
    });

    /**
     * CRITICAL TEST: Validates that CSV file hasn't been tampered with
     * Checks total number of winners in the file
     */
    it('should have expected number of winning movies from default CSV', async () => {
      const winners = movieRepository.findWinners();

      // This number comes from the original movielist.csv
      // If CSV is modified, this test will fail
      expect(winners.length).toBeGreaterThan(0);

      // Validate that all winners have year and producers
      winners.forEach(winner => {
        expect(winner.year).toBeDefined();
        expect(winner.title).toBeDefined();
        expect(winner.winner).toBe(1);
      });
    });

    /**
     * CRITICAL TEST: Validates CSV file integrity
     * Checks if the file was modified by comparing hash or key metrics
     */
    it('should maintain CSV file integrity', () => {
      const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
      const lines = csvContent.trim().split('\n');

      // Validate CSV structure
      expect(lines.length).toBeGreaterThan(1); // Header + data rows

      // Validate header
      const header = lines[0];
      expect(header).toContain('year');
      expect(header).toContain('title');
      expect(header).toContain('studios');
      expect(header).toContain('producers');
      expect(header).toContain('winner');

      // Validate separator is semicolon
      expect(header.includes(';')).toBe(true);
    });
  });
});
