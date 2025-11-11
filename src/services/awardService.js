const movieRepository = require('../repositories/movieRepository');

class AwardService {

  /**
   * Calculates consecutive intervals for each producer
   * @private
   * @param {Object} producerWins - Map of producer -> array of {year, studios}
   * @returns {Array} List of intervals
   */
  _calculateConsecutiveIntervals(producerWins) {

    const intervals = Object.entries(producerWins)
      .flatMap(([producer, wins]) => {
        wins.sort((a, b) => a.year - b.year);
        return wins.slice(1).map((win, i) => ({
          producer,
          interval: win.year - wins[i].year,
          previousWin: wins[i].year,
          followingWin: win.year,
          studios: `${wins[i].studios} → ${win.studios}`
        }));
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

    const min = intervals.filter(i => i.interval === minInterval).slice(0, 2);
    const max = intervals.filter(i => i.interval === maxInterval).slice(0, 2);

    return { min, max };
  }


  async getProducerIntervals() {
    const movies = movieRepository.findAll();

    const csv = ['year;title;studios;producers;winner']
      .concat(
        movies.map(m =>
          `${m.year};${m.title || ''};${m.studios || ''};${m.producers || ''};${m.winner || ''}`
        )
      )
      .join('\n');

    const producerWins = csv
      .trim()
      .split("\n")
      .slice(1)
      .reduce((acc, line) => {
        const [year, , studios, producers, winner] = line.split(";");
        if (winner?.trim() !== "yes") return acc;

        producers
          .split(/,| and /)
          .map(p => p.trim())
          .forEach(p => {
            acc[p] ??= [];
            acc[p].push({
              year: +year,
              studios: studios?.trim() || 'Unknown'
            });
          });
        return acc;
      }, {});


    const intervals = this._calculateConsecutiveIntervals(producerWins);

    if (!intervals.length) return { min: [], max: [] };

    return this._findMinMaxIntervals(intervals);
  }

}

module.exports = new AwardService();
