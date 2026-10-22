import { generateKeyPairSync } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { errorMiddleware } from '../src/middleware/error.middleware';

const issuer = 'https://identity.example.test/';
const audience = 'fintrack-api-test';
const userId = '507f1f77bcf86cd799439011';
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

function signToken(
  claims: Record<string, unknown>,
  options: jwt.SignOptions = {},
  key = privateKeyPem,
): string {
  return jwt.sign(claims, key, {
    algorithm: 'RS256',
    issuer,
    audience,
    expiresIn: '1h',
    ...options,
  });
}

describe('authMiddleware', () => {
  let app: express.Express;

  beforeAll(() => {
    jest.doMock('../src/config/jwt.config', () => ({
      jwtConfig: {
        issuer,
        audience,
        publicKey: publicKeyPem,
        identityClaim: 'sub',
        algorithm: 'RS256',
      },
    }));
    const authModule = require(
      '../src/middleware/auth.middleware',
    ) as typeof import('../src/middleware/auth.middleware.js');
    const { authMiddleware } = authModule;
    app = express();
    app.get('/protected', authMiddleware, (req, res) => {
      res.json({ userId: req.userId });
    });
    app.use(errorMiddleware);
  });

  it('accepts a valid token and attaches its verified ObjectId identity', async () => {
    const token = signToken({ sub: userId });
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId });
  });

  it('rejects a missing bearer token', async () => {
    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { message: 'Authentication required' },
    });
  });

  it('rejects a malformed authorization header', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic token');

    expect(response.status).toBe(401);
  });

  it('rejects a malformed bearer token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not.a.jwt');

    expect(response.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const token = signToken({ sub: userId }, { expiresIn: '-1s' });
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a token without an expiration claim', async () => {
    const token = jwt.sign(
      { sub: userId, iss: issuer, aud: audience },
      privateKeyPem,
      { algorithm: 'RS256' },
    );
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a token from an unexpected issuer', async () => {
    const token = signToken(
      { sub: userId },
      { issuer: 'https://unexpected.example.test/' },
    );
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a token for an unexpected audience', async () => {
    const token = signToken(
      { sub: userId },
      { audience: 'another-service' },
    );
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects an invalid token signature', async () => {
    const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    const otherPrivateKeyPem = otherKey.export({
      type: 'pkcs8',
      format: 'pem',
    });
    const token = signToken({ sub: userId }, {}, otherPrivateKeyPem);
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a token without the configured identity claim', async () => {
    const token = signToken({ otherClaim: 'user-123' });
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a non-string identity claim', async () => {
    const token = signToken({ sub: 123 });
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a blank identity claim', async () => {
    const token = signToken({ sub: '   ' });
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a string identity claim that is not a MongoDB ObjectId', async () => {
    const token = signToken({ sub: 'provider-subject-123' });
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { message: 'Authentication required' },
    });
  });
});
