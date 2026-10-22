import { generateKeyPairSync } from 'node:crypto';
import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { SharedExpenseModel } from '../../src/expenses/shared-expense.model';
import type {
  createSharedExpense as CreateSharedExpense,
  getBalancesForUser as GetBalancesForUser,
} from '../../src/expenses/expense.service';

jest.mock('../../src/expenses/expense.service', () => {
  const actual = jest.requireActual(
    '../../src/expenses/expense.service',
  ) as typeof import('../../src/expenses/expense.service');
  return {
    ...actual,
    createSharedExpense: jest.fn(),
    getBalancesForUser: jest.fn(),
  };
});

const issuer = 'https://identity.example.test/';
const audience = 'fintrack-api-test';
const userId = '507f1f77bcf86cd799439011';
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

describe('expense routes', () => {
  let app: typeof import('../../src/app').default;
  let createExpense: jest.MockedFunction<typeof CreateSharedExpense>;
  let getBalances: jest.MockedFunction<typeof GetBalancesForUser>;

  const token = (): string =>
    jwt.sign(
      { sub: userId },
      privateKeyPem,
      { algorithm: 'RS256', issuer, audience, expiresIn: '1h' },
    );

  beforeAll(() => {
    jest.doMock('../../src/config/jwt.config', () => ({
      jwtConfig: {
        issuer,
        audience,
        publicKey: publicKeyPem,
        identityClaim: 'sub',
        algorithm: 'RS256',
      },
    }));

    const service = require('../../src/expenses/expense.service') as {
      createSharedExpense: jest.MockedFunction<typeof CreateSharedExpense>;
      getBalancesForUser: jest.MockedFunction<typeof GetBalancesForUser>;
    };
    createExpense = service.createSharedExpense;
    getBalances = service.getBalancesForUser;
    app = require('../../src/app').default as typeof app;
  });

  it('creates an expense as the authenticated user', async () => {
    createExpense.mockResolvedValue(
      new SharedExpenseModel({
        creatorId: userId,
        description: 'Dinner',
        totalAmount: 101,
        splitType: 'equal',
        participants: [
          { userId, shareAmount: 51 },
          { userId: '507f1f77bcf86cd799439012', shareAmount: 50 },
        ],
      }),
    );

    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        description: 'Dinner',
        totalAmount: 101,
        splitType: 'equal',
        participants: [{ userId }, { userId: '507f1f77bcf86cd799439012' }],
      });

    expect(response.status).toBe(201);
    expect(response.body.creatorId).toBe(userId);
    expect(createExpense).toHaveBeenCalledWith(userId, {
      description: 'Dinner',
      totalAmount: 101,
      splitType: 'equal',
      participants: [{ userId }, { userId: '507f1f77bcf86cd799439012' }],
    });
  });

  it('returns only balances requested for the authenticated user', async () => {
    getBalances.mockResolvedValue([
      {
        otherUserId: '507f1f77bcf86cd799439012',
        direction: 'owed',
        amount: 40,
      },
    ]);

    const response = await request(app)
      .get('/api/expenses/balances')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      balances: [
        {
          otherUserId: '507f1f77bcf86cd799439012',
          direction: 'owed',
          amount: 40,
        },
      ],
    });
    expect(getBalances).toHaveBeenCalledWith(userId);
  });

  it('rejects unauthenticated create and balance requests', async () => {
    const createResponse = await request(app).post('/api/expenses').send({});
    const balanceResponse = await request(app).get('/api/expenses/balances');

    expect(createResponse.status).toBe(401);
    expect(createResponse.body).toEqual({
      error: { message: 'Authentication required' },
    });
    expect(balanceResponse.status).toBe(401);
    expect(createExpense).not.toHaveBeenCalled();
    expect(getBalances).not.toHaveBeenCalled();
  });

  it('rejects malformed expense data and attempts to spoof the creator', async () => {
    const invalidResponse = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        description: ' ',
        totalAmount: 1.5,
        splitType: 'other',
        participants: [],
      });
    const spoofedResponse = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        description: 'Dinner',
        totalAmount: 100,
        splitType: 'equal',
        creatorId: '507f1f77bcf86cd799439099',
        participants: [{ userId }, { userId: '507f1f77bcf86cd799439012' }],
      });

    expect(invalidResponse.status).toBe(400);
    expect(spoofedResponse.status).toBe(400);
    expect(createExpense).not.toHaveBeenCalled();
  });

  it('does not allow a client to select another user balance', async () => {
    const response = await request(app)
      .get('/api/expenses/balances?userId=507f1f77bcf86cd799439012')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(400);
    expect(getBalances).not.toHaveBeenCalled();
  });
});
