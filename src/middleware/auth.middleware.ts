import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { jwtConfig } from '../config/jwt.config';
import { AuthenticationError } from './error.middleware';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function bearerToken(authorization: string | undefined): string | undefined {
  if (!authorization) {
    return undefined;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  return match?.[1];
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = bearerToken(req.get('authorization'));
  if (!token) {
    next(new AuthenticationError());
    return;
  }

  let claims: string | JwtPayload;
  try {
    claims = jwt.verify(token, jwtConfig.publicKey, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError());
      return;
    }

    next(error);
    return;
  }

  const expiration =
    typeof claims === 'object' && claims !== null ? claims.exp : undefined;
  if (typeof expiration !== 'number' || !Number.isFinite(expiration)) {
    next(new AuthenticationError());
    return;
  }

  const identity: unknown =
    typeof claims === 'object' && claims !== null
      ? claims[jwtConfig.identityClaim]
      : undefined;

  if (
    typeof identity !== 'string' ||
    identity.trim().length === 0 ||
    !Types.ObjectId.isValid(identity)
  ) {
    next(new AuthenticationError());
    return;
  }

  req.userId = identity;
  next();
}
