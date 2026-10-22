import { RequestHandler } from 'express';
import { z } from 'zod';
import { AuthenticationError } from '../middleware/error.middleware';
import {
  createSharedExpense,
  createSharedExpenseBodySchema,
  getBalancesForUser,
} from './expense.service';

function authenticatedUserId(req: Express.Request): string {
  if (!req.userId) {
    throw new AuthenticationError();
  }
  return req.userId;
}

/** Creates a shared expense owned by the authenticated creator. */
export const createSharedExpenseController: RequestHandler = async (
  req,
  res,
) => {
  const body = createSharedExpenseBodySchema.parse(req.body);
  const expense = await createSharedExpense(authenticatedUserId(req), body);
  res.status(201).json(expense);
};

/** Returns only the authenticated user's pairwise net balances. */
export const getBalancesController: RequestHandler = async (req, res) => {
  z.object({}).strict().parse(req.query);
  const balances = await getBalancesForUser(authenticatedUserId(req));
  res.status(200).json({ balances });
};