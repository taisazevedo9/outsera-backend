const movieRepository = require('../repositories/movieRepository');

class AwardService {
  /**
   * Calculates intervals between consecutive producer awards
   * @returns {Promise<Object>} Object with min and max intervals
   */
  async getProducersIntervals() {
    const winners = await movieRepository.findWinners();

    const producerWins = this._groupWinsByProducer(winners);

    const intervals = this._calculateConsecutiveIntervals(producerWins);

    if (intervals.length === 0) {
      return { min: [], max: [] };
    }

    return this._findMinMaxIntervals(intervals);
  }

  /**
   * Groups wins by producer
   * @private
   * @param {Array} winners - List of winning movies
   * @returns {Object} Object with producers and their winning years
   */
  _groupWinsByProducer(winners) {
    const producerWins = {};

    winners.forEach(movie => {
      if (!movie.producers) return;

      // Split producers (multiple separated by comma or "and")
      const producers = movie.producers
        .split(/,| and /)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      producers.forEach(producer => {
        if (!producerWins[producer]) {
          producerWins[producer] = [];
        }
        producerWins[producer].push(movie.year);
      });
    });

    return producerWins;
  }

  /**
   * Calculates consecutive intervals for each producer
   * @private
   * @param {Object} producerWins - Map of producer -> winning years
   * @returns {Array} List of intervals
   */
  _calculateConsecutiveIntervals(producerWins) {
    const intervals = [];

    Object.keys(producerWins).forEach(producer => {
      const years = producerWins[producer].sort((a, b) => a - b);

      if (years.length >= 2) {
        for (let i = 0; i < years.length - 1; i++) {
          const previousWin = years[i];
          const followingWin = years[i + 1];
          const interval = followingWin - previousWin;

          intervals.push({
            producer,
            interval,
            previousWin,
            followingWin
          });
        }
      }
    });

    return intervals;
  }

  /**
   * Finds minimum and maximum intervals
   * @private
   * @param {Array} intervals - List of all intervals
   * @returns {Object} Object with min and max arrays
   */
  _findMinMaxIntervals(intervals) {
    const minInterval = Math.min(...intervals.map(i => i.interval));
    const maxInterval = Math.max(...intervals.map(i => i.interval));

    const min = intervals.filter(i => i.interval === minInterval);
    const max = intervals.filter(i => i.interval === maxInterval);

    return { min, max };
  }
}

module.exports = new AwardService();
