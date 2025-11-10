const movieRepository = require('../src/repositories/movieRepository');

describe('MovieRepository Tests', () => {
  beforeEach(() => {
    // Clear repository before each test
    movieRepository.clear();
  });

  afterEach(() => {
    movieRepository.clear();
  });

  describe('insert()', () => {
    test('should insert a movie and return its ID', () => {
      const movie = {
        year: 1980,
        title: 'Test Movie',
        studios: 'Test Studio',
        producers: 'Test Producer',
        winner: 'yes'
      };

      const id = movieRepository.insert(movie);

      expect(id).toBe(1);
      expect(movieRepository.count()).toBe(1);
    });

    test('should auto-increment IDs', () => {
      const movie1 = { year: 1980, title: 'Movie 1', winner: 'yes' };
      const movie2 = { year: 1981, title: 'Movie 2', winner: 'no' };
      const movie3 = { year: 1982, title: 'Movie 3', winner: 'yes' };

      const id1 = movieRepository.insert(movie1);
      const id2 = movieRepository.insert(movie2);
      const id3 = movieRepository.insert(movie3);

      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(id3).toBe(3);
    });

    test('should add created_at timestamp', () => {
      const movie = {
        year: 1980,
        title: 'Test Movie',
        winner: 'yes'
      };

      movieRepository.insert(movie);
      const movies = movieRepository.findAll();

      expect(movies[0]).toHaveProperty('created_at');
      expect(typeof movies[0].created_at).toBe('string');
      expect(new Date(movies[0].created_at).toString()).not.toBe('Invalid Date');
    });

    test('should preserve all movie properties', () => {
      const movie = {
        year: 1980,
        title: 'Test Movie',
        studios: 'Test Studio',
        producers: 'Test Producer',
        winner: 'yes'
      };

      movieRepository.insert(movie);
      const movies = movieRepository.findAll();

      expect(movies[0].year).toBe(1980);
      expect(movies[0].title).toBe('Test Movie');
      expect(movies[0].studios).toBe('Test Studio');
      expect(movies[0].producers).toBe('Test Producer');
      expect(movies[0].winner).toBe('yes');
    });

    test('should handle null values', () => {
      const movie = {
        year: 1980,
        title: 'Test Movie',
        studios: null,
        producers: null,
        winner: 'no'
      };

      const id = movieRepository.insert(movie);
      const movies = movieRepository.findAll();

      expect(id).toBe(1);
      expect(movies[0].studios).toBeNull();
      expect(movies[0].producers).toBeNull();
    });

    test('should insert multiple movies', () => {
      for (let i = 0; i < 10; i++) {
        movieRepository.insert({
          year: 1980 + i,
          title: `Movie ${i}`,
          winner: i % 2 === 0 ? 'yes' : 'no'
        });
      }

      expect(movieRepository.count()).toBe(10);
    });
  });

  describe('findWinners()', () => {
    test('should return empty array when no movies exist', () => {
      const winners = movieRepository.findWinners();

      expect(winners).toEqual([]);
      expect(winners).toHaveLength(0);
    });

    test('should return only winning movies', () => {
      movieRepository.insert({ year: 1980, title: 'Winner 1', winner: 'yes' });
      movieRepository.insert({ year: 1981, title: 'Loser 1', winner: 'no' });
      movieRepository.insert({ year: 1982, title: 'Winner 2', winner: 'yes' });
      movieRepository.insert({ year: 1983, title: 'Loser 2', winner: 'no' });

      const winners = movieRepository.findWinners();

      expect(winners).toHaveLength(2);
      expect(winners[0].title).toBe('Winner 1');
      expect(winners[1].title).toBe('Winner 2');
    });

    test('should return all movies when all are winners', () => {
      movieRepository.insert({ year: 1980, title: 'Winner 1', winner: 'yes' });
      movieRepository.insert({ year: 1981, title: 'Winner 2', winner: 'yes' });
      movieRepository.insert({ year: 1982, title: 'Winner 3', winner: 'yes' });

      const winners = movieRepository.findWinners();

      expect(winners).toHaveLength(3);
    });

    test('should return empty array when no winners exist', () => {
      movieRepository.insert({ year: 1980, title: 'Loser 1', winner: 'no' });
      movieRepository.insert({ year: 1981, title: 'Loser 2', winner: 'no' });

      const winners = movieRepository.findWinners();

      expect(winners).toHaveLength(0);
    });

    test('should not include movies with winner !== "yes"', () => {
      movieRepository.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });
      movieRepository.insert({ year: 1981, title: 'Movie 2', winner: 'no' });
      movieRepository.insert({ year: 1982, title: 'Movie 3', winner: null });
      movieRepository.insert({ year: 1983, title: 'Movie 4', winner: '' });
      movieRepository.insert({ year: 1984, title: 'Movie 5', winner: 'YES' });

      const winners = movieRepository.findWinners();

      expect(winners).toHaveLength(1);
      expect(winners[0].title).toBe('Movie 1');
    });
  });

  describe('findAll()', () => {
    test('should return empty array when no movies exist', () => {
      const movies = movieRepository.findAll();

      expect(movies).toEqual([]);
      expect(movies).toHaveLength(0);
    });

    test('should return all movies', () => {
      movieRepository.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });
      movieRepository.insert({ year: 1981, title: 'Movie 2', winner: 'no' });
      movieRepository.insert({ year: 1982, title: 'Movie 3', winner: 'yes' });

      const movies = movieRepository.findAll();

      expect(movies).toHaveLength(3);
      expect(movies[0].title).toBe('Movie 1');
      expect(movies[1].title).toBe('Movie 2');
      expect(movies[2].title).toBe('Movie 3');
    });

    test('should return a copy of the array (not reference)', () => {
      movieRepository.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });

      const movies1 = movieRepository.findAll();
      const movies2 = movieRepository.findAll();

      expect(movies1).not.toBe(movies2); // Different array references
      expect(movies1).toEqual(movies2); // But same content
    });

    test('should not allow external modification of internal array', () => {
      movieRepository.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });

      const movies = movieRepository.findAll();
      movies.push({ year: 1981, title: 'Fake Movie', winner: 'yes' });

      const actualMovies = movieRepository.findAll();
      expect(actualMovies).toHaveLength(1); // Should still be 1
    });
  });

  describe('findByYearAndTitle()', () => {
    beforeEach(() => {
      movieRepository.insert({ year: 1980, title: 'Movie A', winner: 'yes' });
      movieRepository.insert({ year: 1981, title: 'Movie B', winner: 'no' });
      movieRepository.insert({ year: 1980, title: 'Movie C', winner: 'yes' });
    });

    test('should find movie by exact year and title', () => {
      const movie = movieRepository.findByYearAndTitle(1980, 'Movie A');

      expect(movie).not.toBeNull();
      expect(movie.year).toBe(1980);
      expect(movie.title).toBe('Movie A');
    });

    test('should return null when movie not found', () => {
      const movie = movieRepository.findByYearAndTitle(1990, 'Non-existent');

      expect(movie).toBeNull();
    });

    test('should return null when year matches but title does not', () => {
      const movie = movieRepository.findByYearAndTitle(1980, 'Wrong Title');

      expect(movie).toBeNull();
    });

    test('should return null when title matches but year does not', () => {
      const movie = movieRepository.findByYearAndTitle(1999, 'Movie A');

      expect(movie).toBeNull();
    });

    test('should be case-sensitive for title', () => {
      const movie = movieRepository.findByYearAndTitle(1980, 'movie a');

      expect(movie).toBeNull();
    });

    test('should return first match when duplicates exist', () => {
      movieRepository.insert({ year: 1985, title: 'Duplicate', winner: 'yes' });
      movieRepository.insert({ year: 1985, title: 'Duplicate', winner: 'no' });

      const movie = movieRepository.findByYearAndTitle(1985, 'Duplicate');

      expect(movie).not.toBeNull();
      expect(movie.winner).toBe('yes'); // First one inserted
    });
  });

  describe('clear()', () => {
    test('should remove all movies', () => {
      movieRepository.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });
      movieRepository.insert({ year: 1981, title: 'Movie 2', winner: 'no' });
      movieRepository.insert({ year: 1982, title: 'Movie 3', winner: 'yes' });

      expect(movieRepository.count()).toBe(3);

      movieRepository.clear();

      expect(movieRepository.count()).toBe(0);
      expect(movieRepository.findAll()).toEqual([]);
    });

    test('should reset ID counter', () => {
      movieRepository.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });
      movieRepository.insert({ year: 1981, title: 'Movie 2', winner: 'no' });

      expect(movieRepository.count()).toBe(2);

      movieRepository.clear();

      const id = movieRepository.insert({ year: 1982, title: 'Movie 3', winner: 'yes' });

      expect(id).toBe(1); // ID should restart from 1
    });

    test('should work on empty repository', () => {
      expect(() => {
        movieRepository.clear();
      }).not.toThrow();

      expect(movieRepository.count()).toBe(0);
    });
  });

  describe('count()', () => {
    test('should return 0 for empty repository', () => {
      expect(movieRepository.count()).toBe(0);
    });

    test('should return correct count after insertions', () => {
      expect(movieRepository.count()).toBe(0);

      movieRepository.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });
      expect(movieRepository.count()).toBe(1);

      movieRepository.insert({ year: 1981, title: 'Movie 2', winner: 'no' });
      expect(movieRepository.count()).toBe(2);

      movieRepository.insert({ year: 1982, title: 'Movie 3', winner: 'yes' });
      expect(movieRepository.count()).toBe(3);
    });

    test('should return 0 after clear', () => {
      movieRepository.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });
      movieRepository.insert({ year: 1981, title: 'Movie 2', winner: 'no' });

      expect(movieRepository.count()).toBe(2);

      movieRepository.clear();

      expect(movieRepository.count()).toBe(0);
    });
  });

  describe('Singleton behavior', () => {
    test('should maintain same instance across imports', () => {
      const repo1 = require('../src/repositories/movieRepository');
      const repo2 = require('../src/repositories/movieRepository');

      repo1.insert({ year: 1980, title: 'Movie 1', winner: 'yes' });

      expect(repo2.count()).toBe(1);
      expect(repo1).toBe(repo2);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complex movie data', () => {
      const movie = {
        year: 1990,
        title: "Can't Stop the Music",
        studios: 'Associated Film Distribution',
        producers: 'Allan Carr',
        winner: 'yes'
      };

      const id = movieRepository.insert(movie);
      const found = movieRepository.findByYearAndTitle(1990, "Can't Stop the Music");
      const winners = movieRepository.findWinners();

      expect(id).toBe(1);
      expect(found).not.toBeNull();
      expect(found.producers).toBe('Allan Carr');
      expect(winners).toHaveLength(1);
      expect(winners[0].id).toBe(id);
    });

    test('should handle large dataset', () => {
      // Insert 1000 movies
      for (let i = 0; i < 1000; i++) {
        movieRepository.insert({
          year: 1900 + i,
          title: `Movie ${i}`,
          winner: i % 3 === 0 ? 'yes' : 'no'
        });
      }

      expect(movieRepository.count()).toBe(1000);

      const winners = movieRepository.findWinners();
      expect(winners.length).toBeGreaterThan(0);

      const found = movieRepository.findByYearAndTitle(1950, 'Movie 50');
      expect(found).not.toBeNull();
    });
  });
});
