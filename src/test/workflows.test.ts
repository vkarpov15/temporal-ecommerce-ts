import { WorkflowClient, WorkflowHandle, WorkflowExecutionFailedError } from '@temporalio/client';
import { Core, Worker, DefaultLogger } from '@temporalio/worker';
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

    await Core.install({
      logger: new DefaultLogger('ERROR'),
    });

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

    await workflow.signal(updateEmailSignal, 'test@temporal.io');
    state = await workflow.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });
    assert.equal(state.email, 'test@temporal.io');

    await workflow.signal(checkoutSignal);
    await workflow.result();

    state = await workflow.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });
  });

  it('throws if checking out with no email set', async function() {
    await workflow.start();

    await workflow.signal(checkoutSignal);
    const err: WorkflowExecutionFailedError | null = await workflow.result().then(() => null, err => err);

    assert.ok(err);
    assert.ok(err.cause);
    assert.equal(err.cause.message, 'Must have email to check out!');
  });
});