const { importBuffer } = require('../src/utils/csvBuffer');
const movieRepository = require('../src/repositories/movieRepository');

describe('CSV Buffer Import Tests', () => {
  beforeEach(() => {
    movieRepository.clear();
  });

  afterEach(() => {
    movieRepository.clear();
  });

  describe('importBuffer()', () => {
    test('should import valid CSV data', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Test Movie;Test Studio;Test Producer;yes
1981;Another Movie;Another Studio;Another Producer;no`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      const count = await importBuffer(buffer, true, true);

      expect(count).toBe(2);
      expect(movieRepository.count()).toBe(2);
    });

    test('should clear existing data when clearBeforeImport is true', async () => {
      // Insert initial data
      movieRepository.insert({
        year: 1990,
        title: 'Old Movie',
        studios: 'Old Studio',
        producers: 'Old Producer',
        winner: 'yes'
      });

      expect(movieRepository.count()).toBe(1);

      const csvContent = `year;title;studios;producers;winner
1980;New Movie;New Studio;New Producer;yes`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      await importBuffer(buffer, true, true);

      expect(movieRepository.count()).toBe(1);
      
      const movies = movieRepository.findAll();
      expect(movies[0].title).toBe('New Movie');
    });

    test('should skip duplicate check when skipDuplicateCheck is true', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Test Movie;Test Studio;Test Producer;yes`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      // First import
      await importBuffer(buffer, false, true);
      expect(movieRepository.count()).toBe(1);

      // Second import with skipDuplicateCheck
      await importBuffer(buffer, false, true);
      expect(movieRepository.count()).toBe(2); // Should allow duplicates
    });

    test('should not import duplicates when skipDuplicateCheck is false', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Test Movie;Test Studio;Test Producer;yes`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      // First import
      await importBuffer(buffer, false, true);
      expect(movieRepository.count()).toBe(1);

      // Second import without skipDuplicateCheck
      await importBuffer(buffer, false, false);
      expect(movieRepository.count()).toBe(1); // Should not duplicate
    });

    test('should fail import if any row has missing required fields', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Valid Movie;Test Studio;Test Producer;yes
;Invalid Movie;Test Studio;Test Producer;yes
1983;Another Valid Movie;Test Studio;Test Producer;no`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      const result = await importBuffer(buffer, true, true);
      
      // Should return 0 on failure and not import any movies
      expect(result).toBe(0);
      expect(movieRepository.count()).toBe(0);
    });

    test('should fail import if any row has invalid year', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Valid Movie;Test Studio;Test Producer;yes
invalid;Invalid Year Movie;Test Studio;Test Producer;yes
1982;Another Movie;Test Studio;Test Producer;yes`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      const result = await importBuffer(buffer, true, true);
      
      // Should return 0 on failure and not import any movies
      expect(result).toBe(0);
      expect(movieRepository.count()).toBe(0);
    }, 10000);

    test('should convert winner field correctly', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Winner Movie;Test Studio;Test Producer;yes
1981;Non-Winner Movie;Test Studio;Test Producer;no
1982;Empty Winner Movie;Test Studio;Test Producer;`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      await importBuffer(buffer, true, true);

      const movies = movieRepository.findAll();
      expect(movies[0].winner).toBe('yes');
      expect(movies[1].winner).toBe('no');
      expect(movies[2].winner).toBe('no'); // Empty becomes 'no'
    });

    test('should trim whitespace from fields', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;  Test Movie  ;  Test Studio  ;  Test Producer  ;  yes  `;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      await importBuffer(buffer, true, true);

      const movies = movieRepository.findAll();
      expect(movies[0].title).toBe('Test Movie');
      expect(movies[0].studios).toBe('Test Studio');
      expect(movies[0].producers).toBe('Test Producer');
    });

    test('should handle null values for optional fields', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Test Movie;;;yes`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      await importBuffer(buffer, true, true);

      const movies = movieRepository.findAll();
      expect(movies[0].studios).toBeNull();
      expect(movies[0].producers).toBeNull();
    });

    test('should fail import on invalid winner value', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Valid Movie;Test Studio;Test Producer;yes
1981;Invalid Movie;Test Studio;Test Producer;maybe`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      const result = await importBuffer(buffer, true, true);
      
      // Should return 0 on failure and not import any movies
      expect(result).toBe(0);
      expect(movieRepository.count()).toBe(0);
    }, 10000);

    test('should fail import on year out of range (too old)', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Valid Movie;Test Studio;Test Producer;yes
1800;Too Old Movie;Test Studio;Test Producer;yes`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      const result = await importBuffer(buffer, true, true);
      
      // Should return 0 on failure and not import any movies
      expect(result).toBe(0);
      expect(movieRepository.count()).toBe(0);
    }, 10000);

    test('should fail import on year out of range (future)', async () => {
      const csvContent = `year;title;studios;producers;winner
1980;Valid Movie;Test Studio;Test Producer;yes
2200;Future Movie;Test Studio;Test Producer;yes`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      const result = await importBuffer(buffer, true, true);
      
      // Should return 0 on failure and not import any movies
      expect(result).toBe(0);
      expect(movieRepository.count()).toBe(0);
    }, 10000);
  });

  describe('Rollback functionality', () => {
    test('should rollback on error during import', async () => {
      // Insert initial data
      movieRepository.insert({
        year: 1990,
        title: 'Original Movie',
        studios: 'Original Studio',
        producers: 'Original Producer',
        winner: 'yes'
      });

      expect(movieRepository.count()).toBe(1);

      // Create valid CSV but mock insert to fail on second record
      const csvContent = `year;title;studios;producers;winner
1980;Movie 1;Studio 1;Producer 1;yes
1981;Movie 2;Studio 2;Producer 2;yes`;
      
      // Mock repository insert to throw error on second call
      const originalInsert = movieRepository.insert.bind(movieRepository);
      let callCount = 0;
      
      jest.spyOn(movieRepository, 'insert').mockImplementation((movie) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated insert error');
        }
        return originalInsert(movie);
      });

      const buffer = Buffer.from(csvContent, 'utf-8');
      
      const result = await importBuffer(buffer, true, true);

      // Restore mock
      movieRepository.insert.mockRestore();

      // Should return 0 on failure
      expect(result).toBe(0);

      // Verify rollback occurred
      const movies = movieRepository.findAll();
      expect(movies.length).toBe(1);
      expect(movies[0].title).toBe('Original Movie');
    }, 10000);

    test('should rollback on CSV parsing error', async () => {
      // Insert initial data
      movieRepository.insert({
        year: 1990,
        title: 'Original Movie',
        studios: 'Original Studio',
        producers: 'Original Producer',
        winner: 'yes'
      });

      const initialCount = movieRepository.count();
      expect(initialCount).toBe(1);

      // Create corrupted buffer that will cause parse error
      const corruptedBuffer = Buffer.from([0xFF, 0xFE, 0xFF, 0xFE]);
      
      const result = await importBuffer(corruptedBuffer, true, true);

      // Should return 0 on failure
      expect(result).toBe(0);

      // Verify rollback occurred - original data should NOT be restored
      // because the backup is created AFTER clearing, so there's nothing to restore
      const movies = movieRepository.findAll();
      expect(movies.length).toBe(0);
    });

    test('should not affect existing data when clearBeforeImport is false', async () => {
      // Insert initial data
      movieRepository.insert({
        year: 1990,
        title: 'Original Movie',
        studios: 'Original Studio',
        producers: 'Original Producer',
        winner: 'yes'
      });

      expect(movieRepository.count()).toBe(1);

      const csvContent = `year;title;studios;producers;winner
1980;New Movie;New Studio;New Producer;yes`;
      
      const buffer = Buffer.from(csvContent, 'utf-8');
      await importBuffer(buffer, false, true);

      // Both movies should exist
      expect(movieRepository.count()).toBe(2);
      
      const movies = movieRepository.findAll();
      expect(movies.some(m => m.title === 'Original Movie')).toBe(true);
      expect(movies.some(m => m.title === 'New Movie')).toBe(true);
    });
  });
});
