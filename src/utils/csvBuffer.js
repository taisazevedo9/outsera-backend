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
  return new Promise((resolve) => {
    const movies = [];
    let errorOccurred = false;
    let errorMessage = null;
    let backup = null;

    const handleError = (message) => {
      console.log(message);
      rollback();
      resolve(0);
    };

    const rollback = () => {
      if (backup) {
        console.log('Rolling back import - clearing buffer...');
        movieRepository.clear();
        backup.forEach(m => movieRepository.insert(m));
        console.log(`${backup.length} movies restored from backup`);
      }
    };

    const validateRow = (row) => {
      if (!row.year || !row.title) {
        return `Import not possible: missing required fields (year or title) - Row: ${JSON.stringify(row)}`;
      }

      const yearValue = parseInt(row.year, 10);
      if (isNaN(yearValue) || yearValue < 1900 || yearValue > 2100) {
        return `Import not possible: invalid year "${row.year}" for movie "${row.title}". Year must be between 1900 and 2100.`;
      }

      const titleValue = row.title?.trim();
      if (!titleValue) {
        return `Import not possible: empty title found - Row: ${JSON.stringify(row)}`;
      }

      const winnerValue = row.winner?.toLowerCase()?.trim();
      if (winnerValue && !['yes', 'no', ''].includes(winnerValue)) {
        return `Import not possible: invalid winner value "${row.winner}" for movie "${titleValue}". Must be "yes", "no", or empty.`;
      }

      return null;
    };

    Readable.from(buffer.toString('utf-8'))
      .pipe(csv({ separator: ';' }))
      .on('data', (row) => {
        if (errorOccurred) return;

        try {
          const error = validateRow(row);
          if (error) {
            errorOccurred = true;
            errorMessage = error;
            return;
          }

          movies.push({
            year: parseInt(row.year, 10),
            title: row.title.trim(),
            studios: row.studios?.trim() || null,
            producers: row.producers?.trim() || null,
            winner: row.winner?.toLowerCase()?.trim() === 'yes' ? 'yes' : 'no'
          });
        } catch (parseError) {
          errorOccurred = true;
          errorMessage = `Import not possible: critical error parsing row - ${parseError.message}`;
        }
      })
      .on('end', () => {
        if (errorOccurred) {
          if (errorMessage) console.log(errorMessage);
          resolve(0);
          return;
        }

        try {
          if (clearBeforeImport) {
            backup = movieRepository.findAll();
            movieRepository.clear();
            console.log('Existing movies cleared from memory');
          }

          let importedCount = 0;

          for (const movie of movies) {
            if (!movie.year || !movie.title || typeof movie.year !== 'number' || !['yes', 'no'].includes(movie.winner)) {
              return handleError(`Import not possible: invalid data for movie "${movie.title}"`);
            }

            if (skipDuplicateCheck || !movieRepository.findByYearAndTitle(movie.year, movie.title)) {
              movieRepository.insert(movie);
              importedCount++;
            }
          }

          console.log(`Successfully imported ${importedCount} movies into memory`);
          resolve(importedCount);
        } catch (error) {
          handleError(`Import not possible: unexpected error occurred - ${error.message}`);
        }
      })
      .on('error', (error) => {
        handleError(`Import not possible: error processing CSV - ${error.message}`);
      });
  });
}

module.exports = {
  importBuffer
};
