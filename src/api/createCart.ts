import { Request, Response } from 'express';
import { client, taskQueue } from './client';
import { cartWorkflow } from '../workflows';

export default async function postCart(req: Request, res: Response) {
  const workflowId = 'create-cart-' + Date.now();
  await client.start(cartWorkflow, {
    taskQueue,
    workflowId
  });

  res.json({ workflowId });
}