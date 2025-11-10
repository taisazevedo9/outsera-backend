const awardService = require('../src/services/awardService');
const movieRepository = require('../src/repositories/movieRepository');

describe('AwardService Tests', () => {
  beforeEach(() => {
    // Clear repository before each test
    movieRepository.clear();
  });

  afterEach(() => {
    movieRepository.clear();
  });

  describe('getProducerIntervals()', () => {
    test('should return empty arrays when no movies exist', async () => {
      const result = await awardService.getProducerIntervals();

      expect(result).toEqual({ min: [], max: [] });
    });

    test('should return empty arrays when no winners exist', async () => {
      movieRepository.insert({
        year: 1980,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: 'Producer A',
        winner: 'no'
      });

      const result = await awardService.getProducerIntervals();

      expect(result).toEqual({ min: [], max: [] });
    });

    test('should return empty arrays when only one winner exists', async () => {
      movieRepository.insert({
        year: 1980,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: 'Producer A',
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      expect(result).toEqual({ min: [], max: [] });
    });

    test('should calculate interval for producer with two wins', async () => {
      movieRepository.insert({
        year: 1990,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: 'Joel Silver',
        winner: 'yes'
      });

      movieRepository.insert({
        year: 1991,
        title: 'Movie 2',
        studios: 'Studio A',
        producers: 'Joel Silver',
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      expect(result.min).toHaveLength(1);
      expect(result.min[0]).toMatchObject({
        producer: 'Joel Silver',
        interval: 1,
        previousWin: 1990,
        followingWin: 1991
      });

      expect(result.max).toHaveLength(1);
      expect(result.max[0]).toMatchObject({
        producer: 'Joel Silver',
        interval: 1,
        previousWin: 1990,
        followingWin: 1991
      });
    });

    test('should calculate min and max intervals for multiple producers', async () => {
      // Producer with min interval (1 year)
      movieRepository.insert({
        year: 1990,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: 'Joel Silver',
        winner: 'yes'
      });
      movieRepository.insert({
        year: 1991,
        title: 'Movie 2',
        studios: 'Studio A',
        producers: 'Joel Silver',
        winner: 'yes'
      });

      // Producer with max interval (13 years)
      movieRepository.insert({
        year: 2002,
        title: 'Movie 3',
        studios: 'Studio B',
        producers: 'Matthew Vaughn',
        winner: 'yes'
      });
      movieRepository.insert({
        year: 2015,
        title: 'Movie 4',
        studios: 'Studio B',
        producers: 'Matthew Vaughn',
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      expect(result.min).toHaveLength(1);
      expect(result.min[0]).toMatchObject({
        producer: 'Joel Silver',
        interval: 1,
        previousWin: 1990,
        followingWin: 1991
      });

      expect(result.max).toHaveLength(1);
      expect(result.max[0]).toMatchObject({
        producer: 'Matthew Vaughn',
        interval: 13,
        previousWin: 2002,
        followingWin: 2015
      });
    });

    test('should handle multiple producers in same movie', async () => {
      movieRepository.insert({
        year: 1990,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: 'Producer A, Producer B',
        winner: 'yes'
      });

      movieRepository.insert({
        year: 1992,
        title: 'Movie 2',
        studios: 'Studio A',
        producers: 'Producer A',
        winner: 'yes'
      });

      movieRepository.insert({
        year: 1995,
        title: 'Movie 3',
        studios: 'Studio A',
        producers: 'Producer B',
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      expect(result.min).toHaveLength(1);
      expect(result.min[0].producer).toBe('Producer A');
      expect(result.min[0].interval).toBe(2);

      expect(result.max).toHaveLength(1);
      expect(result.max[0].producer).toBe('Producer B');
      expect(result.max[0].interval).toBe(5);
    });

    test('should handle producers separated by "and"', async () => {
      movieRepository.insert({
        year: 1990,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: 'Producer A and Producer B',
        winner: 'yes'
      });

      movieRepository.insert({
        year: 1993,
        title: 'Movie 2',
        studios: 'Studio A',
        producers: 'Producer A',
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      expect(result.min[0].producer).toBe('Producer A');
      expect(result.min[0].interval).toBe(3);
    });

    test('should handle producer with three wins (multiple intervals)', async () => {
      movieRepository.insert({
        year: 1990,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: 'Producer A',
        winner: 'yes'
      });

      movieRepository.insert({
        year: 1992,
        title: 'Movie 2',
        studios: 'Studio A',
        producers: 'Producer A',
        winner: 'yes'
      });

      movieRepository.insert({
        year: 1998,
        title: 'Movie 3',
        studios: 'Studio A',
        producers: 'Producer A',
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      // Should have two intervals: 1990->1992 (2 years) and 1992->1998 (6 years)
      expect(result.min[0]).toMatchObject({
        producer: 'Producer A',
        interval: 2,
        previousWin: 1990,
        followingWin: 1992
      });

      expect(result.max[0]).toMatchObject({
        producer: 'Producer A',
        interval: 6,
        previousWin: 1992,
        followingWin: 1998
      });
    });

    test('should limit results to maximum 2 records for min and max', async () => {
      // Create 3 producers with same min interval (1 year)
      movieRepository.insert({ year: 1990, title: 'Movie 1', producers: 'Producer A', winner: 'yes' });
      movieRepository.insert({ year: 1991, title: 'Movie 2', producers: 'Producer A', winner: 'yes' });

      movieRepository.insert({ year: 2000, title: 'Movie 3', producers: 'Producer B', winner: 'yes' });
      movieRepository.insert({ year: 2001, title: 'Movie 4', producers: 'Producer B', winner: 'yes' });

      movieRepository.insert({ year: 2010, title: 'Movie 5', producers: 'Producer C', winner: 'yes' });
      movieRepository.insert({ year: 2011, title: 'Movie 6', producers: 'Producer C', winner: 'yes' });

      const result = await awardService.getProducerIntervals();

      // Should return at most 2 results
      expect(result.min.length).toBeLessThanOrEqual(2);
      expect(result.max.length).toBeLessThanOrEqual(2);
    });

    test('should ignore movies without producers', async () => {
      movieRepository.insert({
        year: 1990,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: null,
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      expect(result).toEqual({ min: [], max: [] });
    });

    test('should trim whitespace from producer names', async () => {
      movieRepository.insert({
        year: 1990,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: '  Producer A  ',
        winner: 'yes'
      });

      movieRepository.insert({
        year: 1993,
        title: 'Movie 2',
        studios: 'Studio A',
        producers: 'Producer A',
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      expect(result.min[0].producer).toBe('Producer A');
      expect(result.min[0].interval).toBe(3);
    });

    test('should handle empty producer strings', async () => {
      movieRepository.insert({
        year: 1990,
        title: 'Movie 1',
        studios: 'Studio A',
        producers: '',
        winner: 'yes'
      });

      const result = await awardService.getProducerIntervals();

      expect(result).toEqual({ min: [], max: [] });
    });
  });

  describe('_calculateConsecutiveIntervals()', () => {
    test('should calculate intervals correctly for single producer', () => {
      const producerWins = {
        'Producer A': [1990, 1992, 1995]
      };

      const intervals = awardService._calculateConsecutiveIntervals(producerWins);

      expect(intervals).toHaveLength(2);
      expect(intervals[0]).toMatchObject({
        producer: 'Producer A',
        interval: 2,
        previousWin: 1990,
        followingWin: 1992
      });
      expect(intervals[1]).toMatchObject({
        producer: 'Producer A',
        interval: 3,
        previousWin: 1992,
        followingWin: 1995
      });
    });

    test('should return empty array for producer with only one win', () => {
      const producerWins = {
        'Producer A': [1990]
      };

      const intervals = awardService._calculateConsecutiveIntervals(producerWins);

      expect(intervals).toHaveLength(0);
    });

    test('should handle multiple producers', () => {
      const producerWins = {
        'Producer A': [1990, 1992],
        'Producer B': [2000, 2005]
      };

      const intervals = awardService._calculateConsecutiveIntervals(producerWins);

      expect(intervals).toHaveLength(2);
      expect(intervals.find(i => i.producer === 'Producer A')).toBeDefined();
      expect(intervals.find(i => i.producer === 'Producer B')).toBeDefined();
    });
  });

  describe('_findMinMaxIntervals()', () => {
    test('should find min and max intervals', () => {
      const intervals = [
        { producer: 'A', interval: 1, previousWin: 1990, followingWin: 1991 },
        { producer: 'B', interval: 5, previousWin: 2000, followingWin: 2005 },
        { producer: 'C', interval: 3, previousWin: 2010, followingWin: 2013 }
      ];

      const result = awardService._findMinMaxIntervals(intervals);

      expect(result.min).toHaveLength(1);
      expect(result.min[0].producer).toBe('A');
      expect(result.min[0].interval).toBe(1);

      expect(result.max).toHaveLength(1);
      expect(result.max[0].producer).toBe('B');
      expect(result.max[0].interval).toBe(5);
    });

    test('should handle multiple producers with same min interval', () => {
      const intervals = [
        { producer: 'A', interval: 1, previousWin: 1990, followingWin: 1991 },
        { producer: 'B', interval: 1, previousWin: 2000, followingWin: 2001 },
        { producer: 'C', interval: 5, previousWin: 2010, followingWin: 2015 }
      ];

      const result = awardService._findMinMaxIntervals(intervals);

      expect(result.min.length).toBeLessThanOrEqual(2);
      result.min.forEach(item => {
        expect(item.interval).toBe(1);
      });
    });

    test('should limit results to 2 records', () => {
      const intervals = [
        { producer: 'A', interval: 1, previousWin: 1990, followingWin: 1991 },
        { producer: 'B', interval: 1, previousWin: 2000, followingWin: 2001 },
        { producer: 'C', interval: 1, previousWin: 2010, followingWin: 2011 },
        { producer: 'D', interval: 10, previousWin: 1990, followingWin: 2000 },
        { producer: 'E', interval: 10, previousWin: 2000, followingWin: 2010 },
        { producer: 'F', interval: 10, previousWin: 2010, followingWin: 2020 }
      ];

      const result = awardService._findMinMaxIntervals(intervals);

      expect(result.min.length).toBeLessThanOrEqual(2);
      expect(result.max.length).toBeLessThanOrEqual(2);
    });
  });
});
