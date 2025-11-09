const fs = require('fs');
const path = require('path');
const { importMoviesFromCSV } = require('../src/utils/csvImporter');
const db = require('../src/config/database');

describe('CSV Importer Tests', () => {
  const testCsvPath = path.join(__dirname, 'test-movies.csv');
  const nonExistentPath = path.join(__dirname, 'non-existent.csv');

  beforeEach((done) => {
    // Clear database before each test
    db.run('DELETE FROM movies', [], (err) => {
      if (err) console.error('Error clearing database:', err);
      done();
    });
  });

  afterEach(() => {
    // Clean up test CSV file if it exists
    if (fs.existsSync(testCsvPath)) {
      fs.unlinkSync(testCsvPath);
    }
  });

  afterAll(async () => {
    // Close database connection
    await new Promise((resolve) => {
      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        resolve();
      });
    });
  });

  describe('File validation', () => {
    test('should return 0 when CSV file does not exist', async () => {
      const result = await importMoviesFromCSV(nonExistentPath);
      expect(result).toBe(0);
    });

    test('should return 0 when CSV file is empty', async () => {
      // Create empty CSV file
      fs.writeFileSync(testCsvPath, 'year;title;studios;producers;winner\n');
      
      const result = await importMoviesFromCSV(testCsvPath, true);
      expect(result).toBe(0);
    });
  });

  describe('CSV parsing with semicolon separator', () => {
    test('should correctly parse CSV with semicolon separator', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Can't Stop the Music;Associated Film Distribution;Allan Carr;yes
1981;Mommie Dearest;Paramount Pictures;Frank Yablans;
1982;Inchon;MGM;Mitsuharu Ishii;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      const result = await importMoviesFromCSV(testCsvPath, true);
      expect(result).toBe(3);

      // Verify data was inserted correctly
      await new Promise((resolve) => {
        db.all('SELECT * FROM movies ORDER BY year', [], (err, rows) => {
          expect(err).toBeNull();
          expect(rows).toHaveLength(3);
          expect(rows[0].title).toBe("Can't Stop the Music");
          expect(rows[0].winner).toBe('yes');
          expect(rows[1].title).toBe('Mommie Dearest');
          expect(rows[1].winner).toBeNull(); // Empty value in CSV becomes null
          resolve();
        });
      });
    });

    test('should handle null and empty values correctly', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Test Movie;;;yes
;Another Movie;Test Studio;Test Producer;`;

      fs.writeFileSync(testCsvPath, csvContent);

      const result = await importMoviesFromCSV(testCsvPath, true);
      expect(result).toBe(2);

      await new Promise((resolve) => {
        db.all('SELECT * FROM movies ORDER BY title', [], (err, rows) => {
          expect(err).toBeNull();
          expect(rows).toHaveLength(2);
          // "Another Movie" has valid data but empty winner
          expect(rows[0].title).toBe('Another Movie');
          expect(rows[0].year).toBeNull(); // Invalid year becomes null
          expect(rows[0].studios).toBe('Test Studio');
          expect(rows[0].producers).toBe('Test Producer');
          expect(rows[0].winner).toBeNull(); // Empty field becomes null
          // "Test Movie" has empty studios/producers
          expect(rows[1].title).toBe('Test Movie');
          expect(rows[1].year).toBe(1980);
          expect(rows[1].studios).toBeNull(); // Empty field becomes null
          expect(rows[1].producers).toBeNull(); // Empty field becomes null
          expect(rows[1].winner).toBe('yes');
          resolve();
        });
      });
    });

    test('should trim whitespace from values', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;  Test Movie  ;  Test Studio  ;  Test Producer  ;  yes  `;

      fs.writeFileSync(testCsvPath, csvContent);

      const result = await importMoviesFromCSV(testCsvPath, true);
      expect(result).toBe(1);

      await new Promise((resolve) => {
        db.get('SELECT * FROM movies', [], (err, row) => {
          expect(err).toBeNull();
          expect(row.title).toBe('Test Movie');
          expect(row.studios).toBe('Test Studio');
          expect(row.producers).toBe('Test Producer');
          expect(row.winner).toBe('yes');
          resolve();
        });
      });
    });
  });

  describe('Duplicate check functionality', () => {
    test('should skip import when movies exist and skipDuplicateCheck is false', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;First Movie;Studio A;Producer A;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      // First import
      await importMoviesFromCSV(testCsvPath, true);

      // Second import with skipDuplicateCheck = false (default)
      const result = await importMoviesFromCSV(testCsvPath, false);
      
      // Should return count of existing movies, not import again
      expect(result).toBe(1);

      await new Promise((resolve) => {
        db.get('SELECT COUNT(*) as count FROM movies', [], (err, row) => {
          expect(err).toBeNull();
          expect(row.count).toBe(1);
          resolve();
        });
      });
    });

    test('should import when movies exist and skipDuplicateCheck is true', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;First Movie;Studio A;Producer A;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      // First import
      await importMoviesFromCSV(testCsvPath, true);

      // Second import with skipDuplicateCheck = true
      const result = await importMoviesFromCSV(testCsvPath, true);
      
      expect(result).toBe(1);

      await new Promise((resolve) => {
        db.get('SELECT COUNT(*) as count FROM movies', [], (err, row) => {
          expect(err).toBeNull();
          expect(row.count).toBe(2); // Should have duplicates
          resolve();
        });
      });
    });
  });

  describe('Clear before import functionality', () => {
    test('should clear all records when clearBeforeImport is true', async () => {
      const firstCsv = `year;title;studios;producers;winner
1980;First Movie;Studio A;Producer A;yes`;

      const secondCsv = `year;title;studios;producers;winner
1981;Second Movie;Studio B;Producer B;yes
1982;Third Movie;Studio C;Producer C;yes`;

      // First import
      fs.writeFileSync(testCsvPath, firstCsv);
      await importMoviesFromCSV(testCsvPath, true);

      // Second import with clearBeforeImport
      fs.writeFileSync(testCsvPath, secondCsv);
      const result = await importMoviesFromCSV(testCsvPath, true, true);

      expect(result).toBe(2);

      await new Promise((resolve) => {
        db.get('SELECT COUNT(*) as count FROM movies', [], (err, row) => {
          expect(err).toBeNull();
          expect(row.count).toBe(2); // Only second import data
          resolve();
        });
      });

      await new Promise((resolve) => {
        db.all('SELECT title FROM movies', [], (err, rows) => {
          expect(err).toBeNull();
          expect(rows[0].title).toBe('Second Movie');
          expect(rows[1].title).toBe('Third Movie');
          resolve();
        });
      });
    });

    test('should not clear records when clearBeforeImport is false', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Test Movie;Studio A;Producer A;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      // First import
      await importMoviesFromCSV(testCsvPath, true);

      // Second import with skipDuplicateCheck=true but clearBeforeImport=false
      await importMoviesFromCSV(testCsvPath, true, false);

      await new Promise((resolve) => {
        db.get('SELECT COUNT(*) as count FROM movies', [], (err, row) => {
          expect(err).toBeNull();
          expect(row.count).toBe(2); // Should have both imports
          resolve();
        });
      });
    });
  });

  describe('Data integrity', () => {
    test('should correctly parse year as integer', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Test Movie;Studio A;Producer A;yes
invalid;Another Movie;Studio B;Producer B;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      await importMoviesFromCSV(testCsvPath, true);

      await new Promise((resolve) => {
        db.all('SELECT year FROM movies ORDER BY title', [], (err, rows) => {
          expect(err).toBeNull();
          expect(rows[0].year).toBeNull(); // "Another Movie" with invalid year
          expect(rows[1].year).toBe(1980);
          resolve();
        });
      });
    });

    test('should handle multiple movies import', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Movie 1;Studio A;Producer A;yes
1981;Movie 2;Studio B;Producer B;
1982;Movie 3;Studio C;Producer C;yes
1983;Movie 4;Studio D;Producer D;
1984;Movie 5;Studio E;Producer E;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      const result = await importMoviesFromCSV(testCsvPath, true);
      expect(result).toBe(5);

      await new Promise((resolve) => {
        db.get('SELECT COUNT(*) as count FROM movies', [], (err, row) => {
          expect(err).toBeNull();
          expect(row.count).toBe(5);
          resolve();
        });
      });
    });

    test('should preserve winner status correctly', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Winner Movie;Studio A;Producer A;yes
1981;Non-Winner Movie;Studio B;Producer B;
1982;Another Winner;Studio C;Producer C;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      await importMoviesFromCSV(testCsvPath, true);

      await new Promise((resolve) => {
        db.all('SELECT title, winner FROM movies WHERE winner = "yes"', [], (err, rows) => {
          expect(err).toBeNull();
          expect(rows).toHaveLength(2);
          expect(rows[0].title).toBe('Winner Movie');
          expect(rows[1].title).toBe('Another Winner');
          resolve();
        });
      });
    });
  });

  describe('Error handling', () => {
    test('should handle malformed CSV gracefully', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Movie with "quotes" and; semicolons;Producer A;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      // Should not throw error
      await expect(importMoviesFromCSV(testCsvPath, true)).resolves.toBeDefined();
    });

    test('should handle special characters in movie data', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Movie: The Sequel (Part 2);Studio & Co.;Producer, Jr.;yes`;

      fs.writeFileSync(testCsvPath, csvContent);

      const result = await importMoviesFromCSV(testCsvPath, true);
      expect(result).toBe(1);

      await new Promise((resolve) => {
        db.get('SELECT * FROM movies', [], (err, row) => {
          expect(err).toBeNull();
          expect(row.title).toBe('Movie: The Sequel (Part 2)');
          expect(row.studios).toBe('Studio & Co.');
          expect(row.producers).toBe('Producer, Jr.');
          resolve();
        });
      });
    });
  });
});
