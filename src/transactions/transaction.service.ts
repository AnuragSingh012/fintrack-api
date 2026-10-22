import { Types } from 'mongoose';
import {
  CreateTransactionInput,
  TransactionDocument,
} from './transaction.model';
import {
  createTransactionRecord,
  deleteTransactionsByUser,
  findTransactionsByUser,
  PaginatedTransactions,
  TransactionPaginationOptions,
} from './transaction.repository';

function toObjectId(userId: string | Types.ObjectId): Types.ObjectId {
  if (userId instanceof Types.ObjectId) {
    return userId;
  }

  if (!Types.ObjectId.isValid(userId)) {
    throw new TypeError('Invalid user ID');
  }

  return new Types.ObjectId(userId);
}

/** Creates a transaction for the given user. Amounts are integer minor units. */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<TransactionDocument> {
  return createTransactionRecord({
    ...input,
    userId: toObjectId(input.userId),
  });
}

/** Returns a page of transactions owned by a user. */
export async function getTransactionsByUser(
  userId: string | Types.ObjectId,
  pagination: TransactionPaginationOptions = {},
): Promise<PaginatedTransactions> {
  return findTransactionsByUser(toObjectId(userId), pagination);
}

/** Deletes all transactions owned by a user and returns the number removed. */
export async function deleteAllTransactionsByUser(
  userId: string | Types.ObjectId,
): Promise<number> {
  return deleteTransactionsByUser(toObjectId(userId));
}