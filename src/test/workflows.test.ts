import { Connection, WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { CartWorkflow } from '../interfaces';
import { Worker, DefaultLogger } from '@temporalio/worker';
import { describe, before, after, afterEach, it } from 'mocha';
import { cartWorkflow } from '../workflows';
import assert from 'assert';

const taskQueue = 'test' + (new Date()).toLocaleDateString('en-US');

describe('cart workflow', function() {
  let runPromise: Promise<void>;
  let worker: Worker;
  let workflow: WorkflowHandle<CartWorkflow>;

  before(async function() {
    this.timeout(10000);
    worker = await Worker.create({
      workDir: `${__dirname}/../../lib`,
      taskQueue,
      logger: new DefaultLogger('ERROR'),
    });

    runPromise = worker.run();
  });

  beforeEach(function() {
    const connection = new Connection();
    const client = new WorkflowClient(connection.service);

    workflow = client.createWorkflowHandle(cartWorkflow, { taskQueue });
  });

  after(async function() {
    worker.shutdown();
    await runPromise;
  });

  it('handles adding and removing from cart', async function() {
    await workflow.start();
    
    let state = await workflow.query.getCart();
    assert.equal(state.items.length, 0);

    await workflow.signal.addToCart({ productId: '1', quantity: 3 });
    state = await workflow.query.getCart();
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '1', quantity: 3 });

    await workflow.signal.removeFromCart({ productId: '1', quantity: 1 });
    state = await workflow.query.getCart();
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '1', quantity: 2 });

    await workflow.cancel();
  });

  it('checkout', async function() {
    await workflow.start();
    
    let state = await workflow.query.getCart();
    assert.equal(state.items.length, 0);

    await workflow.signal.addToCart({ productId: '2', quantity: 2 });
    state = await workflow.query.getCart();
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });

    await workflow.signal.checkout();
    await workflow.result();

    state = await workflow.query.getCart();
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });
  });
});