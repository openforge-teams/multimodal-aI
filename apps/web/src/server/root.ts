import { createTRPCRouter } from '../lib/trpc';
import { taskRouter } from './routers/task';
import { assetRouter } from './routers/asset';
import { providerRouter } from './routers/provider';
import { creditsRouter, workflowRouter } from './routers/credits';

export const appRouter = createTRPCRouter({
  task: taskRouter,
  asset: assetRouter,
  provider: providerRouter,
  credits: creditsRouter,
  workflow: workflowRouter,
});

export type AppRouter = typeof appRouter;
