import { generateKeyPairSync } from 'node:crypto';
import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import request from 'supertest';
import { TransactionModel } from '../src/transactions/transaction.model';
import type {
  createTransaction as CreateTransaction,
  deleteAllTransactionsByUser as DeleteAllTransactionsByUser,
  getTransactionsByUser as GetTransactionsByUser,
} from '../src/transactions/transaction.service';

jest.mock('../src/transactions/transaction.service', () => ({
  createTransaction: jest.fn(),
  deleteAllTransactionsByUser: jest.fn(),
  getTransactionsByUser: jest.fn(),
}));

const issuer = 'https://identity.example.test/';
const audience = 'fintrack-api-test';
const userId = '507f1f77bcf86cd799439011';
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

describe('transaction routes', () => {
  let app: typeof import('../src/app').default;
  let createTransaction: jest.MockedFunction<typeof CreateTransaction>;
  let getTransactionsByUser: jest.MockedFunction<typeof GetTransactionsByUser>;
  let deleteAllTransactionsByUser: jest.MockedFunction<
    typeof DeleteAllTransactionsByUser
  >;

  const token = (): string =>
    jwt.sign(
      { sub: userId },
      privateKeyPem,
      { algorithm: 'RS256', issuer, audience, expiresIn: '1h' },
    );

  beforeAll(() => {
    process.env.JWT_ISSUER = issuer;
    process.env.JWT_AUDIENCE = audience;
    process.env.JWT_PUBLIC_KEY = publicKeyPem;
    process.env.JWT_IDENTITY_CLAIM = 'sub';

    const service = require('../src/transactions/transaction.service') as {
      createTransaction: jest.MockedFunction<typeof CreateTransaction>;
      getTransactionsByUser: jest.MockedFunction<typeof GetTransactionsByUser>;
      deleteAllTransactionsByUser: jest.MockedFunction<
        typeof DeleteAllTransactionsByUser
      >;
    };
    createTransaction = service.createTransaction;
    getTransactionsByUser = service.getTransactionsByUser;
    deleteAllTransactionsByUser = service.deleteAllTransactionsByUser;
    app = require('../src/app').default as typeof app;
  });

  it('creates a transaction using only the authenticated owner', async () => {
    const created = new TransactionModel({
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      amount: 1250,
      description: 'Groceries',
      type: 'expense',
    });
    createTransaction.mockResolvedValue(created);

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token()}`)
      .send({ amount: 1250, description: ' Groceries ', type: 'expense' });

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(userId);
    expect(response.body.description).toBe('Groceries');
    expect(createTransaction).toHaveBeenCalledWith({
      amount: 1250,
      description: 'Groceries',
      type: 'expense',
      userId,
    });
  });

  it('returns paginated transactions for the authenticated owner', async () => {
    const result = {
      transactions: [
        new TransactionModel({
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(userId),
          amount: 100,
          description: 'Test',
          type: 'expense',
        }),
      ],
      pagination: {
        page: 2,
        pageSize: 5,
        totalRecords: 6,
        totalPages: 2,
      },
    };
    getTransactionsByUser.mockResolvedValue(result);

    const response = await request(app)
      .get('/api/transactions?page=2&pageSize=5')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(JSON.parse(JSON.stringify(result)));
    expect(getTransactionsByUser).toHaveBeenCalledWith(userId, {
      page: 2,
      pageSize: 5,
    });
  });

  it('uses existing pagination defaults', async () => {
    getTransactionsByUser.mockResolvedValue({
      transactions: [],
      pagination: { page: 1, pageSize: 20, totalRecords: 0, totalPages: 0 },
    });

    const response = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(getTransactionsByUser).toHaveBeenCalledWith(userId, {
      page: 1,
      pageSize: 20,
    });
  });

  it('deletes all transactions for the authenticated owner', async () => {
    deleteAllTransactionsByUser.mockResolvedValue(3);

    const response = await request(app)
      .delete('/api/transactions')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deletedCount: 3 });
    expect(deleteAllTransactionsByUser).toHaveBeenCalledWith(userId);
  });

  it('rejects requests without authentication using the nested 401 response', async () => {
    const response = await request(app)
      .get('/api/transactions');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { message: 'Authentication required' },
    });
  });

  it('rejects invalid transaction input', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token()}`)
      .send({ amount: 1.5, description: ' ', type: 'transfer' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Request validation failed');
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('rejects pagination values that are not positive integers', async () => {
    const response = await request(app)
      .get('/api/transactions?page=0&pageSize=2.5')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Request validation failed');
    expect(getTransactionsByUser).not.toHaveBeenCalled();
  });

  it('rejects attempts to spoof ownership in the request body', async () => {
    const spoofedUserId = '507f191e810c19729de860ea';
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        amount: 1250,
        description: 'Groceries',
        type: 'expense',
        userId: spoofedUserId,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Request validation failed');
    expect(createTransaction).not.toHaveBeenCalled();
  });
});
