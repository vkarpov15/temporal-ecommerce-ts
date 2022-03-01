import express, { Application } from 'express';
import { Server } from 'http';
import { createExpressMiddleware } from 'temporal-rest';
import { WorkflowClient } from '@temporalio/client';
import * as workflows from '../workflows';

export default async function createApp(port: number): Promise<{ app: Application, server: Server }> {
  const taskQueue = 'ecommerce';
  const client = new WorkflowClient();
  
  const app = express();

  app.use(createExpressMiddleware(workflows, client, taskQueue));

  const server = await app.listen(port);

  return { app, server };
};