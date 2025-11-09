/**
 * Repository for movie data access
 * Abstracts SQLite database access
 */

const db = require('../config/database');

class MovieRepository {
  /**
   * Find all winning movies
   * @returns {Promise<Array>} List of winning movies
   */
  async findWinners() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM movies WHERE winner = "yes" ORDER BY year', [], (err, rows) => {
        if (err) {
          reject(new Error(`Error accessing database: ${err.message}`));
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = new MovieRepository();
