import { ErrorRequestHandler } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ZodError } from 'zod';

interface ValidationDetail {
  field: string;
  message: string;
}

interface ErrorResponse {
  error: {
    message: string;
    details?: ValidationDetail[];
  };
}

function validationDetail(field: string): ValidationDetail {
  return { field, message: 'Invalid value' };
}

function isMalformedJsonError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return (
    'type' in error &&
    error.type === 'entity.parse.failed' &&
    'status' in error &&
    error.status === 400
  );
}

function isObjectIdCastError(error: unknown): error is MongooseError.CastError {
  return (
    error instanceof MongooseError.CastError &&
    error.kind === 'ObjectId'
  );
}

function createResponse(
  message: string,
  details?: ValidationDetail[],
): ErrorResponse {
  return {
    error: details ? { message, details } : { message },
  };
}

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) =>
      validationDetail(issue.path.map(String).join('.')),
    );
    res.status(400).json(createResponse('Request validation failed', details));
    return;
  }

  if (error instanceof MongooseError.ValidationError) {
    const details = Object.keys(error.errors).map(validationDetail);
    res.status(400).json(createResponse('Request validation failed', details));
    return;
  }

  if (isObjectIdCastError(error)) {
    res.status(400).json(createResponse('Invalid identifier'));
    return;
  }

  if (isMalformedJsonError(error)) {
    res.status(400).json(createResponse('Malformed JSON request'));
    return;
  }

  res.status(500).json(createResponse('Internal server error'));
};
