import { WorkflowClient } from '@temporalio/client';

export const client = new WorkflowClient();
export const taskQueue = 'ecommerce';