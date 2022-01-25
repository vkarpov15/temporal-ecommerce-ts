import { Request, Response } from 'express';
import { client, taskQueue } from './client';
import { cartWorkflow } from '../workflows';
import { v4 as uuidv4 } from 'uuid';

export default async function postCart(_req: Request, res: Response) {
  const workflowId = uuidv4();
  await client.start(cartWorkflow, {
    taskQueue,
    workflowId
  });

  res.json({ workflowId });
}