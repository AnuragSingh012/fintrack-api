import { RequestHandler } from 'express';
import { z } from 'zod';
import {
  DEFAULT_TRANSACTION_PAGE,
  DEFAULT_TRANSACTION_PAGE_SIZE,
  MAX_TRANSACTION_PAGE_SIZE,
} from './transaction.repository';
import {
  createTransaction,
  deleteAllTransactionsByUser,
  getTransactionsByUser,
} from './transaction.service';
import { AuthenticationError } from '../middleware/error.middleware';

const createTransactionSchema = z
  .object({
    amount: z.number().int().positive().safe(),
    description: z.string().trim().min(1),
    type: z.enum(['income', 'expense']),
    category: z.string().optional(),
    occurredAt: z.string().datetime().transform((value) => new Date(value)).optional(),
  })
  .strict();

const positiveIntegerQuery = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine((value) => Number.isSafeInteger(value) && value > 0);

const paginationSchema = z
  .object({
    page: positiveIntegerQuery.optional(),
    pageSize: positiveIntegerQuery.optional(),
  })
  .strict()
  .superRefine(({ page, pageSize }, context) => {
    const effectivePageSize = Math.min(
      pageSize ?? DEFAULT_TRANSACTION_PAGE_SIZE,
      MAX_TRANSACTION_PAGE_SIZE,
    );
    if (
      page !== undefined &&
      !Number.isSafeInteger((page - 1) * effectivePageSize)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['page'],
        message: 'Page is too large',
      });
    }
  });

function authenticatedUserId(req: Express.Request): string {
  if (!req.userId) {
    throw new AuthenticationError();
  }

  return req.userId;
}

/** Creates a transaction owned by the authenticated user. */
export const createTransactionController: RequestHandler = async (req, res) => {
  const input = createTransactionSchema.parse(req.body);
  const transaction = await createTransaction({
    ...input,
    userId: authenticatedUserId(req),
  });

  res.status(201).json(transaction);
};

/** Returns a page of transactions owned by the authenticated user. */
export const getTransactionsController: RequestHandler = async (req, res) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await getTransactionsByUser(authenticatedUserId(req), {
    page: pagination.page ?? DEFAULT_TRANSACTION_PAGE,
    pageSize: pagination.pageSize ?? DEFAULT_TRANSACTION_PAGE_SIZE,
  });

  res.status(200).json(result);
};

/** Deletes all transactions owned by the authenticated user. */
export const deleteAllTransactionsController: RequestHandler = async (
  req,
  res,
) => {
  const deletedCount = await deleteAllTransactionsByUser(
    authenticatedUserId(req),
  );

  res.status(200).json({ deletedCount });
};