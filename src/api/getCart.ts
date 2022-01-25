import { Request, Response } from 'express';
import { client } from './client';
import { cartWorkflow, getCartQuery } from '../workflows';
import assert from 'assert';

export default async function getCart(req: Request, res: Response) {
  const workflowId: string = req.params.workflowId;
  assert.ok(workflowId);

  const handle = client.getHandle<typeof cartWorkflow>(workflowId);

  const state = await handle.query(getCartQuery);
  res.json({ state });
}