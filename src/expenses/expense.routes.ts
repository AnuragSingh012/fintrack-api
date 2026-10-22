import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createSharedExpenseController,
  getBalancesController,
} from './expense.controller';

const expenseRoutes = Router();

expenseRoutes.use(authMiddleware);
expenseRoutes.post('/', createSharedExpenseController);
expenseRoutes.get('/balances', getBalancesController);

export default expenseRoutes;