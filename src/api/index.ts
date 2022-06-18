import express, { Application } from 'express';
import { CartItem, CartItemDecoder, UpdateEmailSignal, UpdateEmailSignalDecoder } from '../interfaces';
import { Server } from 'http';
import { createExpressMiddleware, useValidator } from 'temporal-rest';
import { WorkflowClient } from '@temporalio/client';
import * as workflows from '../workflows';

export default async function createApp(port: number, client?: WorkflowClient): Promise<{ app: Application, server: Server }> {
  const taskQueue = 'ecommerce';
  if (client === undefined) {
    client = new WorkflowClient();
  }
  
  const app = express();

  useValidator(
    workflows.addToCartSignal,
    (data: any): CartItem => CartItemDecoder.check(data)
  );
  useValidator(
    workflows.removeFromCartSignal,
    (data: any): CartItem => CartItemDecoder.check(data)
  );
  useValidator(
    workflows.updateEmailSignal,
    (data: any): UpdateEmailSignal => UpdateEmailSignalDecoder.check(data)
  );

  app.use(createExpressMiddleware(workflows, client, taskQueue));

  app.use(function(err: Error, _req: express.Request, res: express.Response, _next: Function) {
    res.status(500).json({ message: err.message });
  });

  const server = await app.listen(port);

  return { app, server };
};