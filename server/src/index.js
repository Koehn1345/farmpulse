import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { clerk, requireAuth, requireFarm } from './middleware/auth.js';
import customerRoutes from './routes/customers.js';
import fieldRoutes from './routes/fields.js';
import commodityRoutes from './routes/commodities.js';
import loadRoutes from './routes/loads.js';
import incomeRoutes from './routes/income.js';
import expenseRoutes from './routes/expenses.js';
import miscRoutes from './routes/misc.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(clerk);

// All API routes require auth + farm context
const api = express.Router();
api.use(requireAuth, requireFarm);

api.use('/customers', customerRoutes);
api.use('/fields', fieldRoutes);
api.use('/commodities', commodityRoutes);
api.use('/loads', loadRoutes);
api.use('/income', incomeRoutes);
api.use('/expenses', expenseRoutes);
api.use('/', miscRoutes);

app.use('/api', api);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🌾 FarmPulse API running on port ${PORT}`));
