import { HydratedDocument, model, Schema, Types } from 'mongoose';

export type TransactionType = 'income' | 'expense';

export interface TransactionFields {
  userId: Types.ObjectId;
  amount: number;
  description: string;
  type: TransactionType;
  category?: string;
  occurredAt: Date;
}

export type TransactionDocument = HydratedDocument<TransactionFields>;

export type CreateTransactionInput = Omit<TransactionFields, 'userId' | 'occurredAt'> & {
  userId: string | Types.ObjectId;
  occurredAt?: Date;
};

const transactionSchema = new Schema<TransactionFields>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Amount must be an integer number of minor units',
      },
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    category: {
      type: String,
      trim: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const TransactionModel = model<TransactionFields>(
  'Transaction',
  transactionSchema,
);