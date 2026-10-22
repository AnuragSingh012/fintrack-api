import { HydratedDocument, model, Schema, Types } from 'mongoose';

export type ExpenseSplitType = 'equal' | 'custom';

export interface SharedExpenseParticipant {
  userId: Types.ObjectId;
  shareAmount: number;
}

export interface SharedExpenseFields {
  creatorId: Types.ObjectId;
  description: string;
  totalAmount: number;
  splitType: ExpenseSplitType;
  participants: SharedExpenseParticipant[];
  createdAt: Date;
}

export type SharedExpenseDocument = HydratedDocument<SharedExpenseFields>;

const participantSchema = new Schema<SharedExpenseParticipant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    shareAmount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Share amount must be an integer number of minor units',
      },
    },
  },
  { _id: false },
);

const sharedExpenseSchema = new Schema<SharedExpenseFields>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Total amount must be an integer number of minor units',
      },
    },
    splitType: {
      type: String,
      enum: ['equal', 'custom'],
      required: true,
    },
    participants: {
      type: [participantSchema],
      required: true,
      validate: {
        validator: (participants: SharedExpenseParticipant[]) =>
          participants.length >= 2,
        message: 'At least two participants are required',
      },
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SharedExpenseModel = model<SharedExpenseFields>(
  'SharedExpense',
  sharedExpenseSchema,
);