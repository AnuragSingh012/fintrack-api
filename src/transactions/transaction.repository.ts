import { Types } from 'mongoose';
import {
  CreateTransactionInput,
  TransactionDocument,
  TransactionModel,
} from './transaction.model';

export const DEFAULT_TRANSACTION_PAGE = 1;
export const DEFAULT_TRANSACTION_PAGE_SIZE = 20;
export const MAX_TRANSACTION_PAGE_SIZE = 100;

export interface TransactionPaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedTransactions {
  transactions: TransactionDocument[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

/** Persists a transaction in MongoDB. */
export async function createTransactionRecord(
  input: Omit<CreateTransactionInput, 'userId'> & { userId: Types.ObjectId },
): Promise<TransactionDocument> {
  return TransactionModel.create(input);
}

/** Finds one page of a user's transactions, newest occurrence first. */
export async function findTransactionsByUser(
  userId: Types.ObjectId,
  options: TransactionPaginationOptions = {},
): Promise<PaginatedTransactions> {
  const page = options.page ?? DEFAULT_TRANSACTION_PAGE;
  const requestedPageSize = options.pageSize ?? DEFAULT_TRANSACTION_PAGE_SIZE;

  if (!Number.isSafeInteger(page) || page < 1) {
    throw new RangeError('Page must be a positive integer');
  }

  if (!Number.isSafeInteger(requestedPageSize) || requestedPageSize < 1) {
    throw new RangeError('Page size must be a positive integer');
  }

  const pageSize = Math.min(requestedPageSize, MAX_TRANSACTION_PAGE_SIZE);
  const skip = (page - 1) * pageSize;
  if (!Number.isSafeInteger(skip)) {
    throw new RangeError('Page is too large');
  }

  const filter = { userId };
  const [transactions, totalRecords] = await Promise.all([
    TransactionModel.find(filter)
      .sort({ occurredAt: -1, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec(),
    TransactionModel.countDocuments(filter).exec(),
  ]);

  return {
    transactions,
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize),
    },
  };
}

/** Deletes only the transactions owned by the specified user. */
export async function deleteTransactionsByUser(
  userId: Types.ObjectId,
): Promise<number> {
  const result = await TransactionModel.deleteMany({ userId }).exec();
  return result.deletedCount;
}