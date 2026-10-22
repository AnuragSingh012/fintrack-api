import { Types } from 'mongoose';
import {
  SharedExpenseDocument,
  SharedExpenseFields,
  SharedExpenseModel,
} from './shared-expense.model';

/** Persists a shared expense as one atomic MongoDB document. */
export async function createSharedExpenseRecord(
  input: Omit<SharedExpenseFields, 'createdAt'>,
): Promise<SharedExpenseDocument> {
  return SharedExpenseModel.create(input);
}

/** Finds expenses involving a participant, in deterministic creation order. */
export async function findSharedExpensesForUser(
  userId: Types.ObjectId,
): Promise<SharedExpenseDocument[]> {
  return SharedExpenseModel.find({ 'participants.userId': userId })
    .sort({ createdAt: 1, _id: 1 })
    .exec();
}