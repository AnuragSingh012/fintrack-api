import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

const loggerError = jest.fn();

jest.doMock('pino', () => ({
  __esModule: true,
  default: jest.fn(() => ({ error: loggerError })),
}));

let errorMiddleware: typeof import('../src/middleware/error.middleware').errorMiddleware;

beforeAll(() => {
  ({ errorMiddleware } = require(
    '../src/middleware/error.middleware',
  ) as typeof import('../src/middleware/error.middleware'));
});

afterAll(() => {
  jest.dontMock('pino');
});

beforeEach(() => {
  loggerError.mockClear();
});

describe('errorMiddleware', () => {
  it('logs unexpected errors internally and returns a sanitized response', async () => {
    const internalMessage = 'database password leaked in exception';
    const app = express();
    app.get('/failure', (_req, _res, next) => {
      next(new Error(internalMessage));
    });
    app.use(errorMiddleware);

    const response = await request(app).get('/failure?token=private-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { message: 'Internal server error' },
    });
    expect(JSON.stringify(response.body)).not.toContain(internalMessage);
    expect(JSON.stringify(response.body)).not.toContain('private-token');
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        method: 'GET',
        path: '/failure',
      }),
      'Unhandled server error',
    );
    expect(JSON.stringify(loggerError.mock.calls[0])).not.toContain(
      'private-token',
    );
  });
});
