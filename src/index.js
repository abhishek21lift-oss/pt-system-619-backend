import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

import clientsRouter from './routes/clients.js';
import trainersRouter from './routes/trainers.js';
import revenueRouter from './routes/revenue.js';
import crmRouter from './routes/crm.js';
import attendanceRouter from './routes/attendance.js';
import programsRouter from './routes/programs.js';
import powerliftingRouter from './routes/powerlifting.js';
import aiRouter from './routes/ai.js';

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('short'));

const limiter = rateLimit({
  windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false,
});
app.use(limiter);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use((req, _res, next) => {
  req.supabase = supabase;
  next();
});

app.use('/api/clients', clientsRouter);
app.use('/api/trainers', trainersRouter);
app.use('/api/revenue', revenueRouter);
app.use('/api/crm', crmRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/programs', programsRouter);
app.use('/api/powerlifting', powerliftingRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('trainers').select('count', { count: 'exact', head: true });
    res.json({ status: error ? 'degraded' : 'ok', db: !error, timestamp: new Date().toISOString() });
  } catch {
    res.json({ status: 'degraded', db: false, timestamp: new Date().toISOString() });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
