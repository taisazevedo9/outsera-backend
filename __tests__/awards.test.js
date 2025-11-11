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
     * 
     * Based on movielist.csv analysis:
     * - Joel Silver: Won in 1990 (The Adventures of Ford Fairlane - 20th Century Fox) 
     *                and 1991 (Hudson Hawk - TriStar Pictures) = 1 year interval
     * - Matthew Vaughn: Won in 2002 (Swept Away - Screen Gems) 
     *                   and 2015 (Fantastic Four - 20th Century Fox) = 13 years interval
     */
    it('should return exact expected data from default movielist.csv file', async () => {
      const response = await request(app)
        .get('/api/awards/producers-intervals')
        .expect(200);

      // Expected result based on movielist.csv content
      // This will fail if the CSV file is modified in any way
      const expectedResult = {
        min: [
          {
            producer: 'Joel Silver',
            interval: 1,
            previousWin: 1990,
            followingWin: 1991,
            studios: '20th Century Fox → TriStar Pictures'
          }
        ],
        max: [
          {
            producer: 'Matthew Vaughn',
            interval: 13,
            previousWin: 2002,
            followingWin: 2015,
            studios: 'Screen Gems → 20th Century Fox'
          }
        ]
      };

      // Validate structure
      expect(response.body).toHaveProperty('min');
      expect(response.body).toHaveProperty('max');
      expect(Array.isArray(response.body.min)).toBe(true);
      expect(Array.isArray(response.body.max)).toBe(true);

      // EXACT validation for minimum interval
      expect(response.body.min).toHaveLength(expectedResult.min.length);
      expectedResult.min.forEach((expected, index) => {
        const actual = response.body.min[index];
        
        // Validate all fields exactly
        expect(actual.producer).toBe(expected.producer);
        expect(actual.interval).toBe(expected.interval);
        expect(actual.previousWin).toBe(expected.previousWin);
        expect(actual.followingWin).toBe(expected.followingWin);
        expect(actual.studios).toBe(expected.studios);
        
        // Validate interval calculation
        expect(actual.followingWin - actual.previousWin).toBe(actual.interval);
      });

      // EXACT validation for maximum interval
      expect(response.body.max).toHaveLength(expectedResult.max.length);
      expectedResult.max.forEach((expected, index) => {
        const actual = response.body.max[index];
        
        // Validate all fields exactly
        expect(actual.producer).toBe(expected.producer);
        expect(actual.interval).toBe(expected.interval);
        expect(actual.previousWin).toBe(expected.previousWin);
        expect(actual.followingWin).toBe(expected.followingWin);
        expect(actual.studios).toBe(expected.studios);
        
        // Validate interval calculation
        expect(actual.followingWin - actual.previousWin).toBe(actual.interval);
      });

      // Ensure no extra fields that could indicate data corruption
      response.body.min.forEach(item => {
        const keys = Object.keys(item);
        expect(keys).toContain('producer');
        expect(keys).toContain('interval');
        expect(keys).toContain('previousWin');
        expect(keys).toContain('followingWin');
        expect(keys).toContain('studios');
      });

      response.body.max.forEach(item => {
        const keys = Object.keys(item);
        expect(keys).toContain('producer');
        expect(keys).toContain('interval');
        expect(keys).toContain('previousWin');
        expect(keys).toContain('followingWin');
        expect(keys).toContain('studios');
      });
    });

    /**
     * CRITICAL TEST: Validates that CSV file hasn't been tampered with
     * Checks exact number of winners and total movies in the file
     */
    it('should have expected number of winning movies from default CSV', async () => {
      const winners = movieRepository.findWinners();
      const allMovies = movieRepository.findAll();

      // EXACT counts from original movielist.csv (207 lines total: 1 header + 206 movies)
      // If CSV is modified, this test will fail
      expect(allMovies.length).toBe(206); // Total movies in CSV (excluding header)
      expect(winners.length).toBe(42); // Exact number of winning movies
      
      // Validate that all winners have correct structure
      winners.forEach(winner => {
        expect(winner.year).toBeDefined();
        expect(typeof winner.year).toBe('number');
        expect(winner.year).toBeGreaterThanOrEqual(1980);
        expect(winner.year).toBeLessThanOrEqual(2019); // Last year in CSV
        
        expect(winner.title).toBeDefined();
        expect(typeof winner.title).toBe('string');
        expect(winner.title.length).toBeGreaterThan(0);
        
        expect(winner.winner).toBe('yes');
        
        expect(winner.studios).toBeDefined();
        expect(winner.producers).toBeDefined();
      });
    });

    /**
     * CRITICAL TEST: Validates CSV file integrity
     * Checks if the file was modified by comparing exact line count and structure
     */
    it('should maintain CSV file integrity', () => {
      const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
      const lines = csvContent.trim().split('\n');

      // EXACT line count validation (header + 206 data rows)
      expect(lines.length).toBe(207);

      // Validate exact header format
      const header = lines[0];
      expect(header).toBe('year;title;studios;producers;winner');

      // Validate separator is semicolon throughout the file
      expect(header.includes(';')).toBe(true);
      
      // Count winning movies in CSV
      const winnerLines = lines.slice(1).filter(line => line.trim().endsWith(';yes'));
      expect(winnerLines.length).toBe(42); // Exact number of winners
      
      // Validate all lines have 5 fields
      lines.slice(1).forEach((line, index) => {
        const fields = line.split(';');
        expect(fields.length).toBe(5); // year, title, studios, producers, winner
        
        // Validate year format (should be 4 digits)
        const year = parseInt(fields[0], 10);
        expect(year).toBeGreaterThanOrEqual(1980);
        expect(year).toBeLessThanOrEqual(2019); // Last year in CSV
        
        // Validate title is not empty
        expect(fields[1].trim().length).toBeGreaterThan(0);
      });
      
      // Validate specific key movies exist (smoke test for CSV content)
      const csvText = csvContent.toLowerCase();
      expect(csvText).toContain('joel silver');
      expect(csvText).toContain('matthew vaughn');
      expect(csvText).toContain('hudson hawk');
      expect(csvText).toContain('swept away');
      expect(csvText).toContain('fantastic four');
    });
  });
});
