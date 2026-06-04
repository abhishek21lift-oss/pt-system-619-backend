import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

import clientsRouter from './routes/clients.js';
import trainersRouter from './routes/trainers.js';
import revenueRouter from './routes/revenue.js';
import crmRouter from './routes/crm.js';
import attendanceRouter from './routes/attendance.js';
import programsRouter from './routes/programs.js';
import powerliftingRouter from './routes/powerlifting.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
