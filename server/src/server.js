import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Root & Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'BudgetPH API', version: '2.0.0' });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`🚀 BudgetPH Server listening on http://localhost:${PORT}`);
});
