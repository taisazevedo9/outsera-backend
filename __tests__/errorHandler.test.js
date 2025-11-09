const { errorHandler, asyncHandler } = require('../src/middlewares/errorHandler');
const { HTTP_STATUS } = require('../src/config/constants');

describe('Error Handler Middleware Tests', () => {
  let req, res, next, consoleErrorSpy;

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/test'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false
    };

    next = jest.fn();

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete process.env.NODE_ENV;
  });

  describe('errorHandler', () => {
    test('should return 500 status by default when no statusCode is provided', () => {
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Test error'
      });
    });

    test('should use custom statusCode when provided in error', () => {
      const error = new Error('Not found');
      error.statusCode = 404;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not found'
      });
    });

    test('should return default error message when error.message is empty', () => {
      const error = new Error();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    test('should include error details when err.errors array is provided', () => {
      const error = new Error('Validation error');
      error.statusCode = 400;
      error.errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' }
      ];

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Password too short' }
        ]
      });
    });

    test('should not include details when err.errors is not an array', () => {
      const error = new Error('Test error');
      error.errors = 'not an array';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Test error'
      });
    });

    test('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:5';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Test error',
        stack: 'Error: Test error\n    at test.js:10:5'
      });
    });

    test('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:5';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Test error'
      });
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('stack');
    });

    test('should not include stack trace when NODE_ENV is not set', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:5';

      errorHandler(error, req, res, next);

      expect(res.json.mock.calls[0][0]).not.toHaveProperty('stack');
    });

    test('should call next if headers already sent', () => {
      res.headersSent = true;
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should log error information to console', () => {
      const error = new Error('Test error');
      error.statusCode = 400;

      errorHandler(error, req, res, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', {
        message: 'Test error',
        stack: undefined,
        statusCode: 400
      });
    });

    test('should log stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:5';

      errorHandler(error, req, res, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', {
        message: 'Test error',
        stack: 'Error: Test error\n    at test.js:10:5',
        statusCode: undefined
      });
    });

    test('should handle error with all properties', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Complex error');
      error.statusCode = 422;
      error.errors = [{ field: 'name', message: 'Required' }];
      error.stack = 'Error stack';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Complex error',
        details: [{ field: 'name', message: 'Required' }],
        stack: 'Error stack'
      });
    });
  });

  describe('asyncHandler', () => {
    test('should call async function and return result', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('should catch errors from async function and pass to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle synchronous errors thrown in async context', async () => {
      const error = new Error('Sync error');
      const asyncFn = jest.fn().mockImplementation(() => {
        return Promise.reject(error);
      });
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should work with async functions that modify response', async () => {
      const asyncFn = jest.fn().mockImplementation(async (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle multiple wrapped async functions', async () => {
      const asyncFn1 = jest.fn().mockResolvedValue('result1');
      const asyncFn2 = jest.fn().mockResolvedValue('result2');

      const wrappedFn1 = asyncHandler(asyncFn1);
      const wrappedFn2 = asyncHandler(asyncFn2);

      await wrappedFn1(req, res, next);
      await wrappedFn2(req, res, next);

      expect(asyncFn1).toHaveBeenCalledWith(req, res, next);
      expect(asyncFn2).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle errors with custom statusCode', async () => {
      const error = new Error('Not found');
      error.statusCode = 404;
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(next.mock.calls[0][0].statusCode).toBe(404);
    });

    test('should return a function that can be used as middleware', () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      expect(typeof wrappedFn).toBe('function');
      expect(wrappedFn.length).toBe(3); // Should accept (req, res, next)
    });
  });

  describe('Integration: asyncHandler with errorHandler', () => {
    test('should properly handle async errors through the chain', async () => {
      const error = new Error('Database error');
      error.statusCode = 500;

      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      // Simulate Express error handling chain
      const mockNext = jest.fn((err) => {
        errorHandler(err, req, res, next);
      });

      await wrappedFn(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Database error'
      });
    });

    test('should handle validation errors with details', async () => {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.errors = [
        { field: 'email', message: 'Invalid format' }
      ];

      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      const mockNext = jest.fn((err) => {
        errorHandler(err, req, res, next);
      });

      await wrappedFn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: [{ field: 'email', message: 'Invalid format' }]
      });
    });
  });
});
