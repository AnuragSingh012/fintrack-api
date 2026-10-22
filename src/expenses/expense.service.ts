import { Types } from 'mongoose';
import { z } from 'zod';
import {
  createSharedExpenseRecord,
  findSharedExpensesForUser,
} from './expense.repository';
import { SharedExpenseDocument } from './shared-expense.model';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Participant ID must be a valid ObjectId');

const commonExpenseFields = {
  description: z.string().trim().min(1),
  totalAmount: z.number().int().positive().safe(),
};

export const createSharedExpenseBodySchema = z.discriminatedUnion('splitType', [
  z
    .object({
      ...commonExpenseFields,
      splitType: z.literal('equal'),
      participants: z.array(z.object({ userId: objectIdSchema }).strict()).min(2),
    })
    .strict(),
  z
    .object({
      ...commonExpenseFields,
      splitType: z.literal('custom'),
      participants: z
        .array(
          z
            .object({
              userId: objectIdSchema,
              shareAmount: z.number().int().positive().safe(),
            })
            .strict(),
        )
        .min(2),
    })
    .strict(),
]);

export type CreateSharedExpenseBody = z.infer<
  typeof createSharedExpenseBodySchema
>;

export interface UserPairBalance {
  otherUserId: string;
  direction: 'owes' | 'owed';
  amount: number;
}

function toObjectId(value: string | Types.ObjectId): Types.ObjectId {
  if (value instanceof Types.ObjectId) {
    return value;
  }
  if (!Types.ObjectId.isValid(value)) {
    throw new TypeError('Invalid user ID');
  }
  return new Types.ObjectId(value);
}

function validateParticipants(
  creatorId: Types.ObjectId,
  input: CreateSharedExpenseBody,
): Types.ObjectId[] {
  const participantIds = input.participants.map(
    (participant) => new Types.ObjectId(participant.userId),
  );
  const participantKeys = participantIds.map((id) => id.toHexString());

  if (new Set(participantKeys).size !== participantKeys.length) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['participants'],
        message: 'Participants must be distinct',
      },
    ]);
  }

  if (!participantKeys.includes(creatorId.toHexString())) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['participants'],
        message: 'Creator must be a participant',
      },
    ]);
  }

  return participantIds;
}

function buildShares(
  creatorId: Types.ObjectId,
  input: CreateSharedExpenseBody,
  participantIds: Types.ObjectId[],
): Array<{ userId: Types.ObjectId; shareAmount: number }> {
  if (input.splitType === 'equal') {
    if (input.totalAmount < participantIds.length) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['totalAmount'],
          message: 'Equal split must provide at least one minor unit per participant',
        },
      ]);
    }
    const baseShare = Math.floor(input.totalAmount / participantIds.length);
    const remainder = input.totalAmount % participantIds.length;
    return participantIds.map((userId, index) => ({
      userId,
      shareAmount: baseShare + (index < remainder ? 1 : 0),
    }));
  }

  const totalShares = input.participants.reduce(
    (sum, participant) => sum + participant.shareAmount,
    0,
  );
  if (!Number.isSafeInteger(totalShares) || totalShares !== input.totalAmount) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['participants'],
        message: 'Custom shares must sum exactly to the total amount',
      },
    ]);
  }

  return input.participants.map((participant, index) => ({
    userId: participantIds[index],
    shareAmount: participant.shareAmount,
  }));
}

/** Creates a shared expense and assigns participant shares. */
export async function createSharedExpense(
  creatorId: string | Types.ObjectId,
  body: CreateSharedExpenseBody,
): Promise<SharedExpenseDocument> {
  const creatorObjectId = toObjectId(creatorId);
  const parsed = createSharedExpenseBodySchema.parse(body);
  const participantIds = validateParticipants(creatorObjectId, parsed);
  const participants = buildShares(creatorObjectId, parsed, participantIds);

  return createSharedExpenseRecord({
    creatorId: creatorObjectId,
    description: parsed.description,
    totalAmount: parsed.totalAmount,
    splitType: parsed.splitType,
    participants,
  });
}

function addPairDebt(
  balances: Map<string, number>,
  debtorId: Types.ObjectId,
  creditorId: Types.ObjectId,
  amount: number,
): void {
  if (amount === 0) {
    return;
  }

  const debtor = debtorId.toHexString();
  const creditor = creditorId.toHexString();
  const firstId = debtor < creditor ? debtor : creditor;
  const secondId = debtor < creditor ? creditor : debtor;
  const key = `${firstId}:${secondId}`;
  const signedAmount = debtor === firstId ? amount : -amount;
  const nextAmount = (balances.get(key) ?? 0) + signedAmount;

  if (!Number.isSafeInteger(nextAmount)) {
    throw new RangeError('Net balance exceeds the safe integer range');
  }
  balances.set(key, nextAmount);
}

/** Calculates the authenticated user's net balance with each counterparty. */
export async function getBalancesForUser(
  userId: string | Types.ObjectId,
): Promise<UserPairBalance[]> {
  const userObjectId = toObjectId(userId);
  const expenses = await findSharedExpensesForUser(userObjectId);
  const pairBalances = new Map<string, number>();

  for (const expense of expenses) {
    for (const participant of expense.participants) {
      if (!participant.userId.equals(expense.creatorId)) {
        addPairDebt(
          pairBalances,
          participant.userId,
          expense.creatorId,
          participant.shareAmount,
        );
      }
    }
  }

  const currentUserId = userObjectId.toHexString();
  const result: UserPairBalance[] = [];
  for (const [key, signedAmount] of pairBalances) {
    if (signedAmount === 0) {
      continue;
    }
    const [firstId, secondId] = key.split(':');
    if (currentUserId === firstId) {
      result.push({
        otherUserId: secondId,
        direction: signedAmount > 0 ? 'owes' : 'owed',
        amount: Math.abs(signedAmount),
      });
    } else if (currentUserId === secondId) {
      result.push({
        otherUserId: firstId,
        direction: signedAmount > 0 ? 'owed' : 'owes',
        amount: Math.abs(signedAmount),
      });
    }
  }

  return result.sort((left, right) =>
    left.otherUserId.localeCompare(right.otherUserId),
  );
}