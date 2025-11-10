/**
 * In-memory movie repository
 * Stores movies in memory without database
 */
class MovieRepository {
  constructor() {
    this.movies = [];
    this.nextId = 1;
  }

  /**
   * Add movie to memory
   * @param {Object} movie - Movie object
   * @returns {number} Movie ID
   */
  insert(movie) {
    const movieWithId = {
      id: this.nextId++,
      ...movie,
      created_at: new Date().toISOString()
    };
    this.movies.push(movieWithId);
    return movieWithId.id;
  }

  /**
   * Find all winning movies
   * @returns {Array} Array of winning movies
   */
  findWinners() {
    return this.movies.filter(movie => movie.winner === 'yes');
  }

  /**
   * Find all movies
   * @returns {Array} Array of all movies
   */
  findAll() {
    return [...this.movies];
  }

  /**
   * Find movie by year and title
   * @param {number} year - Movie year
   * @param {string} title - Movie title
   * @returns {Object|null} Movie or null
   */
  findByYearAndTitle(year, title) {
    return this.movies.find(m => m.year === year && m.title === title) || null;
  }

  /**
   * Clear all movies from memory
   */
  clear() {
    this.movies = [];
    this.nextId = 1;
  }

  /**
   * Get total count
   * @returns {number} Total movies in memory
   */
  count() {
    return this.movies.length;
  }
}

// Singleton instance
module.exports = new MovieRepository();
