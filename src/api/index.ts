import express, { Application } from 'express';
import { CartItem, CartItemDecoder, UpdateEmailSignal, UpdateEmailSignalDecoder } from '../interfaces';
import { Server } from 'http';
import { createExpressMiddleware, useValidator } from 'temporal-rest';
import { WorkflowClient } from '@temporalio/client';
import * as workflows from '../workflows';
import { pipe } from 'fp-ts/function';
import { fold } from 'fp-ts/Either';

export default async function createApp(port: number): Promise<{ app: Application, server: Server }> {
  const taskQueue = 'ecommerce';
  const client = new WorkflowClient();
  
  const app = express();

  useValidator(
    workflows.addToCartSignal,
    (data: any): CartItem => pipe(
      CartItemDecoder.decode(data),
      fold(() => { throw new Error('Validation failed'); }, (val: CartItem) => val)
    )
  );
  useValidator(
    workflows.removeFromCartSignal,
    (data: any): CartItem => pipe(
      CartItemDecoder.decode(data),
      fold(() => { throw new Error('Validation failed'); }, (val: CartItem) => val)
    )
  );
  useValidator(
    workflows.updateEmailSignal,
    (data: any): UpdateEmailSignal => pipe(
      UpdateEmailSignalDecoder.decode(data),
      fold(() => { throw new Error('Validation failed'); }, (val: UpdateEmailSignal) => val)
    )
  );

  app.use(createExpressMiddleware(workflows, client, taskQueue));

  app.use(function(err: Error, _req: express.Request, res: express.Response, _next: Function) {
    res.status(500).json({ message: err.message });
  });

  const server = await app.listen(port);

  return { app, server };
};