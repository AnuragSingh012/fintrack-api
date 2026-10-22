import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createTransactionController,
  deleteAllTransactionsController,
  getTransactionsController,
} from './transaction.controller';

const transactionRoutes = Router();

transactionRoutes.use(authMiddleware);
transactionRoutes.post('/', createTransactionController);
transactionRoutes.get('/', getTransactionsController);
transactionRoutes.delete('/', deleteAllTransactionsController);

export default transactionRoutes;