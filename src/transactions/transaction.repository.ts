import { Types } from 'mongoose';
import {
  CreateTransactionInput,
  TransactionDocument,
  TransactionModel,
} from './transaction.model';

/** Persists a transaction in MongoDB. */
export async function createTransactionRecord(
  input: Omit<CreateTransactionInput, 'userId'> & { userId: Types.ObjectId },
): Promise<TransactionDocument> {
  return TransactionModel.create(input);
}

/** Finds a user's transactions, newest occurrence first. */
export async function findTransactionsByUser(
  userId: Types.ObjectId,
): Promise<TransactionDocument[]> {
  return TransactionModel.find({ userId }).sort({ occurredAt: -1 }).exec();
}

/** Deletes only the transactions owned by the specified user. */
export async function deleteTransactionsByUser(
  userId: Types.ObjectId,
): Promise<number> {
  const result = await TransactionModel.deleteMany({ userId }).exec();
  return result.deletedCount;
}