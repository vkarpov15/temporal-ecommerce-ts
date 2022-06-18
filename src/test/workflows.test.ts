import { TestWorkflowEnvironment } from '@temporalio/testing';
import { WorkflowHandle, WorkflowFailedError } from '@temporalio/client';
import { CartStatus } from '../interfaces';
import { Runtime, DefaultLogger, Worker } from '@temporalio/worker';
import { describe, before, after, it } from 'mocha';
import {
  cartWorkflow,
  addToCartSignal,
  removeFromCartSignal,
  updateEmailSignal,
  checkoutSignal,
  getCartQuery
} from '../workflows';
import assert from 'assert';
import { createActivities } from '../activities';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';

const taskQueue = 'test' + (new Date()).toLocaleDateString('en-US');

describe('cart workflow', function() {
  let runPromise: Promise<void>;
  let worker: Worker;
  let handle: WorkflowHandle<typeof cartWorkflow>;
  let sendStub: sinon.SinonStub<any[], Promise<any>>; // `any` because `@types/mailgun` doesn't export `SendResponse`
  let env: TestWorkflowEnvironment;

  before(async function() {
    this.timeout(10000);
    Runtime.install({ logger: new DefaultLogger('WARN') });
    env = await TestWorkflowEnvironment.create();

    sendStub = sinon.stub().callsFake(() => Promise.resolve());
    const activities = createActivities({ send: sendStub }, 'test@temporal.io');

    worker = await Worker.create({
      connection: env.nativeConnection,
      workflowsPath: require.resolve('../workflows'),
      taskQueue,
      activities,
    });

    runPromise = worker.run();
  });

  beforeEach(async function() {
    sendStub.resetHistory();

    const client = env.workflowClient;

    handle = await client.start(cartWorkflow, {
      taskQueue,
      workflowId: 'cart-test-' + uuidv4()
    });
  });

  after(async function() {
    worker.shutdown();
    await runPromise;

    await env.nativeConnection.close();
    await env.teardown();
  });

  it('handles adding and removing from cart', async function() {    
    let state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 0);

    await handle.signal(addToCartSignal, { productId: '1', quantity: 3 });
    state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '1', quantity: 3 });

    await handle.signal(removeFromCartSignal, { productId: '1', quantity: 1 });
    state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '1', quantity: 2 });

    await handle.terminate();
  });

  it('completes when it receives a checkout signal', async function() {    
    let state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 0);

    await handle.signal(addToCartSignal, { productId: '2', quantity: 2 });
    state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });

    await handle.signal(updateEmailSignal, { email: 'test@temporal.io' });
    state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });
    assert.equal(state.email, 'test@temporal.io');

    await handle.signal(checkoutSignal);
    await handle.result();

    state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });
  });

  it('sets error status if checking out with no email set', async function() {
    await handle.signal(checkoutSignal);
    
    let state = await handle.query(getCartQuery);
    assert.equal(state.status, CartStatus.ERROR);
    assert.equal(state.error, 'Must have email to check out!');
  });

  it('sends abandoned cart email', async function() {
    let state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 0);

    await handle.signal(addToCartSignal, { productId: '2', quantity: 2 });
    state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });

    await handle.signal(updateEmailSignal, { email: 'test@temporal.io' });
    state = await handle.query(getCartQuery);
    assert.equal(state.items.length, 1);
    assert.deepEqual(state.items[0], { productId: '2', quantity: 2 });
    assert.equal(state.email, 'test@temporal.io');

    await handle.result().catch(err => {
      if (err instanceof WorkflowFailedError) {
        return;
      }
      throw err;
    });

    assert.ok(sendStub.calledOnce);
    assert.equal(sendStub.getCalls()[0].args[0].to, 'test@temporal.io');
  });
});
