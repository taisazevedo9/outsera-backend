const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const db = require('../config/database');

/**
 * Imports movie data from a CSV file to the database
 * @param {string} csvFilePath - Path to the CSV file
 * @param {boolean} skipDuplicateCheck - If true, imports even if movies already exist
 * @param {boolean} clearBeforeImport - If true, deletes all records before importing
 */
function importMoviesFromCSV(csvFilePath, skipDuplicateCheck = false, clearBeforeImport = false) {
  return new Promise((resolve, reject) => {
    const movies = [];

    if (!fs.existsSync(csvFilePath)) {
      console.log(`CSV file not found: ${csvFilePath}`);
      return resolve(0);
    }

    fs.createReadStream(csvFilePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (row) => {
        movies.push({
          year: parseInt(row.year) || null,
          title: row.title ? row.title.trim() : '',
          studios: row.studios ? row.studios.trim() : null,
          producers: row.producers ? row.producers.trim() : null,
          winner: row.winner ? row.winner.trim() : null
        });
      })
      .on('end', () => {
        if (movies.length === 0) {
          console.log('No movies found in CSV');
          return resolve(0);
        }

        if (!skipDuplicateCheck) {
          db.get('SELECT COUNT(*) as count FROM movies', [], (err, row) => {
            if (err) {
              console.error('Error checking existing movies:', err.message);
              return reject(err);
            }

            if (row.count > 0) {
              console.log(`Database already contains ${row.count} movie(s). Import skipped.`);
              return resolve(row.count);
            }

            insertMovies();
          });
        } else {
          if (clearBeforeImport) {
            db.run('DELETE FROM movies', [], (err) => {
              if (err) {
                console.error('Error clearing movies table:', err.message);
                return reject(err);
              }
              console.log('All movie records have been deleted');
              insertMovies();
            });
          } else {
            insertMovies();
          }
        }

        function insertMovies() {
          const insertStmt = db.prepare(
            'INSERT INTO movies (year, title, studios, producers, winner) VALUES (?, ?, ?, ?, ?)'
          );

          let insertedCount = 0;
          movies.forEach((movie, index) => {
            insertStmt.run(
              [movie.year, movie.title, movie.studios, movie.producers, movie.winner],
              (err) => {
                if (err) {
                  console.error(`Error inserting movie "${movie.title}":`, err.message);
                } else {
                  insertedCount++;
                }

                if (index === movies.length - 1) {
                  insertStmt.finalize();
                  console.log(`${insertedCount} movie(s) successfully imported from CSV`);
                  resolve(insertedCount);
                }
              }
            );
          });
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error.message);
        reject(error);
      });
  });
}

module.exports = { importMoviesFromCSV };
