const csv = require('csv-parser');
const { Readable } = require('stream');
const movieRepository = require('../repositories/movieRepository');

/**
 * Imports movies from a CSV buffer
 * @param {Buffer} buffer - CSV file content as Buffer
 * @param {boolean} clearBeforeImport - Clear existing data before import
 * @param {boolean} skipDuplicateCheck - Skip checking for duplicates
 * @returns {Promise<number>} Number of movies imported
 */
async function importBuffer(buffer, clearBeforeImport = false, skipDuplicateCheck = false) {
  return new Promise((resolve, reject) => {
    const movies = [];
    let errorOccurred = false;

    // Convert Buffer to Readable Stream
    const stream = Readable.from(buffer.toString('utf-8'));

    stream
      .pipe(csv({ separator: ';' }))
      .on('data', (row) => {
        if (errorOccurred) return;

        // Validate required fields
        if (!row.year || !row.title) {
          console.warn('Skipping row with missing required fields:', row);
          return;
        }

        const movie = {
          year: parseInt(row.year, 10),
          title: row.title?.trim() || null,
          studios: row.studios?.trim() || null,
          producers: row.producers?.trim() || null,
          winner: row.winner?.toLowerCase() === 'yes' ? 'yes' : 'no'
        };

        // Validate year
        if (isNaN(movie.year) || movie.year < 1900 || movie.year > 2100) {
          console.warn('Invalid year value:', row.year);
          return;
        }

        movies.push(movie);
      })
      .on('end', () => {
        if (errorOccurred) return;

        try {
          if (clearBeforeImport) {
            movieRepository.clear();
            console.log('Existing movies cleared from memory');
          }

          let importedCount = 0;

          for (const movie of movies) {
            if (skipDuplicateCheck) {
              movieRepository.insert(movie);
              importedCount++;
            } else {
              const exists = movieRepository.findByYearAndTitle(movie.year, movie.title);
              if (!exists) {
                movieRepository.insert(movie);
                importedCount++;
              }
            }
          }

          console.log(`Successfully imported ${importedCount} movies into memory`);
          resolve(importedCount);
        } catch (error) {
          console.error('Error during import:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        errorOccurred = true;
        console.error('Error parsing CSV from buffer:', error);
        reject(error);
      });
  });
}

module.exports = {
  importBuffer
};
