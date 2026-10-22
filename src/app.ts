import express from 'express';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use(errorMiddleware);

export default app;
