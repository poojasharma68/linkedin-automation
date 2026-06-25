import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import categoryRoutes from './routes/categoryRoutes.js';
import postsRoutes from './routes/postsRoutes.js';
import linkedinPostRoutes from './routes/linkedinPostRoutes.js';
import linkedinSessionRoutes from './routes/linkedinSessionRoutes.js';
import processPostsRoutes from './routes/processPostsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import env from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');
// Serve the built client from this same server whenever a build exists, so the
// frontend and API run on one origin/port. If there's no build yet, the server
// stays API-only (use the Vite dev server with its proxy for frontend HMR).
const hasClientBuild = fs.existsSync(clientIndexPath);

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: env.isProduction ? undefined : false,
  })
);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'LinkedIn Post Automation System is running',
    timestamp: new Date().toISOString(),
  });
});

if (env.isDevelopment) {
  app.use('/screenshots', express.static(path.resolve(__dirname, '../screenshots')));
}

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/linkedin-posts', linkedinPostRoutes);
app.use('/api/linkedin-session', linkedinSessionRoutes);
app.use('/api/process', processPostsRoutes);

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(clientIndexPath);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
