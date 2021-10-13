import { WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { Worker } from '@temporalio/worker';
import { describe, before, after, afterEach, it } from 'mocha';
import {
  cartWorkflow,
  addToCartSignal,
  removeFromCartSignal,
  updateEmailSignal,
  checkoutSignal,
  getCartQuery
} from '../workflows';
import assert from 'assert';

const taskQueue = 'test' + (new Date()).toLocaleDateString('en-US');

describe('cart workflow', function() {
  let runPromise: Promise<void>;
  let worker: Worker;
  let workflow: WorkflowHandle<typeof cartWorkflow>;

  before(async function() {
    this.timeout(10000);
    worker = await Worker.create({
      workflowsPath: require.resolve('../workflows'),
      taskQueue,
    });

    runPromise = worker.run();
  });

  beforeEach(function() {
    const client = new WorkflowClient();

    workflow = client.createWorkflowHandle(cartWorkflow, { taskQueue });
  });

  after(async function() {
    worker.shutdown();
    await runPromise;
  });

  it('handles adding and removing from cart', async function() {
    await workflow.start();
    
    let state = await workflow.query(getCartQuery);
    assert.equal(state.items.length, 0);

    await workflow.signal(addToCartSignal, { productId: '1', quantity: 3 });
    state = await workflow.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '1', quantity: 3 });

    await workflow.signal(removeFromCartSignal, { productId: '1', quantity: 1 });
    state = await workflow.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '1', quantity: 2 });

    await workflow.terminate();
  });

  it('completes when it receives a checkout signal', async function() {
    await workflow.start();
    
    let state = await workflow.query(getCartQuery);
    assert.equal(state.items.length, 0);

    await workflow.signal(addToCartSignal, { productId: '2', quantity: 2 });
    state = await workflow.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });

    await workflow.signal(checkoutSignal);
    await workflow.result();

    state = await workflow.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });
  });
});