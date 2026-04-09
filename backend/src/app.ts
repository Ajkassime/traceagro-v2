import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { router } from './routes';

const app = express();
const publicDir = path.resolve(__dirname, '../public');
const indexFile = path.join(publicDir, 'index.html');
const hasFrontendBuild = config.nodeEnv === 'production';

// Security
app.use(helmet());
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'https://trace.innov.studio'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes.' },
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api', router);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

if (hasFrontendBuild) {
  app.use(express.static(publicDir));

  // Let React Router handle non-API routes in production.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(indexFile);
  });
}

// Error handler
app.use(errorHandler);

export { app };
