import { Router } from 'express';
import { healthRouter } from './health';

export const apiRouter = Router();

// Root health check endpoint directly at /api/health
apiRouter.use('/', healthRouter);

// Versioned API v1 router
const v1Router = Router();
v1Router.use('/', healthRouter);

// Mount versioned router
apiRouter.use('/v1', v1Router);
