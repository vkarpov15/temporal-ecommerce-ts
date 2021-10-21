import { Request, Response } from 'express';
import { client } from './client';
import { cartWorkflow, addToCartSignal } from '../workflows';
import assert from 'assert';

export default async function getCart(req: Request, res: Response) {
  const workflowId: string = req.params.workflowId;
  const productId: string = req.body.productId;
  const quantity: number = req.body.quantity;
  assert.ok(workflowId);

  const workflow = client.createWorkflowHandle<typeof cartWorkflow>({ workflowId });

  await workflow.signal(addToCartSignal, { productId, quantity });
  res.json({ ok: 1 });
}