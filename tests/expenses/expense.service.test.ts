import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Types } from 'mongoose';
import { ZodError } from 'zod';
import { SharedExpenseModel } from '../../src/expenses/shared-expense.model';
import type {
  createSharedExpenseRecord as CreateSharedExpenseRecord,
  findSharedExpensesForUser as FindSharedExpensesForUser,
} from '../../src/expenses/expense.repository';
import type { CreateSharedExpenseBody } from '../../src/expenses/expense.service';

jest.mock('../../src/expenses/expense.repository', () => ({
  createSharedExpenseRecord: jest.fn(),
  findSharedExpensesForUser: jest.fn(),
}));

const creatorId = new Types.ObjectId('507f1f77bcf86cd799439011');
const userB = new Types.ObjectId('507f1f77bcf86cd799439012');
const userC = new Types.ObjectId('507f1f77bcf86cd799439013');

describe('expense service', () => {
  let createRecord: jest.MockedFunction<typeof CreateSharedExpenseRecord>;
  let findForUser: jest.MockedFunction<typeof FindSharedExpensesForUser>;
  let createSharedExpense: typeof import('../../src/expenses/expense.service').createSharedExpense;
  let getBalancesForUser: typeof import('../../src/expenses/expense.service').getBalancesForUser;

  beforeEach(() => {
    const repository = require('../../src/expenses/expense.repository') as {
      createSharedExpenseRecord: jest.MockedFunction<
        typeof CreateSharedExpenseRecord
      >;
      findSharedExpensesForUser: jest.MockedFunction<
        typeof FindSharedExpensesForUser
      >;
    };
    createRecord = repository.createSharedExpenseRecord;
    findForUser = repository.findSharedExpensesForUser;
    const service = require('../../src/expenses/expense.service') as typeof import('../../src/expenses/expense.service');
    createSharedExpense = service.createSharedExpense;
    getBalancesForUser = service.getBalancesForUser;
    createRecord.mockImplementation(async (input) => new SharedExpenseModel(input));
  });

  it('splits integer remainders deterministically in participant order', async () => {
    const body: CreateSharedExpenseBody = {
      description: 'Dinner',
      totalAmount: 101,
      splitType: 'equal',
      participants: [
        { userId: creatorId.toHexString() },
        { userId: userB.toHexString() },
        { userId: userC.toHexString() },
      ],
    };

    await createSharedExpense(creatorId, body);

    expect(createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId,
        totalAmount: 101,
        splitType: 'equal',
        participants: [
          { userId: creatorId, shareAmount: 34 },
          { userId: userB, shareAmount: 34 },
          { userId: userC, shareAmount: 33 },
        ],
      }),
    );
  });

  it('accepts custom shares that exactly equal the total', async () => {
    const body: CreateSharedExpenseBody = {
      description: 'Tickets',
      totalAmount: 1000,
      splitType: 'custom',
      participants: [
        { userId: creatorId.toHexString(), shareAmount: 600 },
        { userId: userB.toHexString(), shareAmount: 400 },
      ],
    };

    await createSharedExpense(creatorId, body);

    expect(createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        totalAmount: 1000,
        participants: [
          { userId: creatorId, shareAmount: 600 },
          { userId: userB, shareAmount: 400 },
        ],
      }),
    );
  });

  it('rejects custom shares that do not sum to the total', async () => {
    const body: CreateSharedExpenseBody = {
      description: 'Tickets',
      totalAmount: 1000,
      splitType: 'custom',
      participants: [
        { userId: creatorId.toHexString(), shareAmount: 500 },
        { userId: userB.toHexString(), shareAmount: 400 },
      ],
    };

    await expect(createSharedExpense(creatorId, body)).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('rejects zero custom shares and equal splits too small for all participants', async () => {
    const zeroCustomShare: CreateSharedExpenseBody = {
      description: 'Tickets',
      totalAmount: 100,
      splitType: 'custom',
      participants: [
        { userId: creatorId.toHexString(), shareAmount: 100 },
        { userId: userB.toHexString(), shareAmount: 0 },
      ],
    };
    const tooSmallEqualSplit: CreateSharedExpenseBody = {
      description: 'Snack',
      totalAmount: 1,
      splitType: 'equal',
      participants: [
        { userId: creatorId.toHexString() },
        { userId: userB.toHexString() },
      ],
    };

    await expect(
      createSharedExpense(creatorId, zeroCustomShare),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      createSharedExpense(creatorId, tooSmallEqualSplit),
    ).rejects.toBeInstanceOf(ZodError);
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('rejects fewer than two participants, duplicate IDs, and missing creator participation', async () => {
    const oneParticipant: CreateSharedExpenseBody = {
      description: 'Lunch',
      totalAmount: 100,
      splitType: 'equal',
      participants: [{ userId: creatorId.toHexString() }],
    };
    const duplicateParticipants: CreateSharedExpenseBody = {
      ...oneParticipant,
      participants: [
        { userId: creatorId.toHexString() },
        { userId: creatorId.toHexString() },
      ],
    };
    const missingCreator: CreateSharedExpenseBody = {
      ...oneParticipant,
      participants: [{ userId: userB.toHexString() }, { userId: userC.toHexString() }],
    };

    await expect(
      createSharedExpense(creatorId, oneParticipant),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      createSharedExpense(creatorId, duplicateParticipants),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      createSharedExpense(creatorId, missingCreator),
    ).rejects.toBeInstanceOf(ZodError);
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('nets opposing debts across expenses and removes zero balances', async () => {
    findForUser.mockResolvedValue([
      new SharedExpenseModel({
        creatorId,
        description: 'First',
        totalAmount: 100,
        splitType: 'custom',
        participants: [
          { userId: creatorId, shareAmount: 60 },
          { userId: userB, shareAmount: 40 },
        ],
      }),
      new SharedExpenseModel({
        creatorId: userB,
        description: 'Second',
        totalAmount: 80,
        splitType: 'custom',
        participants: [
          { userId: userB, shareAmount: 50 },
          { userId: creatorId, shareAmount: 30 },
        ],
      }),
      new SharedExpenseModel({
        creatorId,
        description: 'Third',
        totalAmount: 100,
        splitType: 'custom',
        participants: [
          { userId: creatorId, shareAmount: 50 },
          { userId: userC, shareAmount: 50 },
        ],
      }),
      new SharedExpenseModel({
        creatorId: userC,
        description: 'Fourth',
        totalAmount: 100,
        splitType: 'custom',
        participants: [
          { userId: userC, shareAmount: 50 },
          { userId: creatorId, shareAmount: 50 },
        ],
      }),
    ]);

    await expect(getBalancesForUser(creatorId)).resolves.toEqual([
      {
        otherUserId: userB.toHexString(),
        direction: 'owed',
        amount: 10,
      },
    ]);
    expect(findForUser).toHaveBeenCalledWith(creatorId);
  });
});
