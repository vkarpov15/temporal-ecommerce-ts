import { Request, Response } from 'express';
import { client, taskQueue } from './client';
import { cartWorkflow } from '../workflows';

export default async function postCart(req: Request, res: Response) {
  const workflow = client.createWorkflowHandle(cartWorkflow, { taskQueue });

  await workflow.start();

  res.json({ workflowId: workflow.workflowId });
}