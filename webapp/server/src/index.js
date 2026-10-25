import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectDB } from './config/db.js';
import authRoutes from './routes/index.js';
import ticketRoutes from './routes/tickets.js';
import adminRoutes from './routes/admin.js';
import facultyRoutes from './routes/faculty.js';
import projectPulseRoutes from './routes/projectPulse.js';
import { runSlaSweep } from './services/sla.js';

dotenv.config();

const app = express();

/* ------------------------------- middleware ------------------------------ */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

/* --------------------------------- routes -------------------------------- */
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'academic-helpdesk-api', time: new Date().toISOString() })
);
app.use('/api', authRoutes);
app.use('/api', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/project-pulse', projectPulseRoutes);

/* ------------------------------ error handler ---------------------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

/* --------------------------------- start --------------------------------- */
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/academic_helpdesk';

async function start() {
  await connectDB(MONGO_URI);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Academic Helpdesk API`);
    console.log(`  ────────────────────────────────`);
    console.log(`  Listening : http://localhost:${PORT}`);
    console.log(`  MongoDB   : ${MONGO_URI}`);
    console.log(`  SLA sweep : every 15 min (24 working-hour rule)\n`);
  });

  // SLA sweep — every 15 minutes during working days.
  cron.schedule('*/15 * * * 1-5', async () => {
    try {
      const r = await runSlaSweep(process.env);
      if (r.warned || r.escalated) console.log('[sla]', JSON.stringify(r));
    } catch (e) {
      console.error('[sla] sweep failed:', e.message);
    }
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;
