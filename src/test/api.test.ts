import { Core, Worker, DefaultLogger } from '@temporalio/worker';
import { createActivities } from '../activities';
import { describe, before, after, it } from 'mocha';
import createApp from '../api';
import assert from 'assert';
import axios from 'axios';
import { Server } from 'http';
import sinon from 'sinon';
import { Cart } from '../interfaces';

describe('API', function() {
  let runPromise: Promise<void>;
  let worker: Worker;
  let sendStub: sinon.SinonStub<any[], Promise<any>>; // `any` because `@types/mailgun` doesn't export `SendResponse`
  let server: Server;

  const port = 3000;
  const client = axios.create({ baseURL: 'http://localhost:' + port });

  before(async function() {
    this.timeout(10000);

    ({ server } = await createApp(3000));

    // Suppress default log output to avoid logger polluting test output
    await Core.install({ logger: new DefaultLogger('ERROR') });

    sendStub = sinon.stub().callsFake(() => Promise.resolve());
    const activities = createActivities({ send: sendStub }, 'test@temporal.io');

    worker = await Worker.create({
      workflowsPath: require.resolve('../workflows'),
      taskQueue: 'ecommerce',
      activities,
    });

    runPromise = worker.run();
  });

  after(async function() {
    worker.shutdown();
    await runPromise;
    await server.close();
  });

  it('handles adding and removing from cart', async function() {
    const { data: { workflowId } } = await client.post<{ workflowId: string }>('/cart');

    await new Promise(resolve => setTimeout(resolve, 100));

    let { data: { state } } = await client.get<{ state: Cart }>(`/cart/${workflowId}`);
    assert.equal(state.items.length, 0);

    await client.put(`/cart/${workflowId}/add`, { productId: '0', quantity: 1 });

    ({ data: { state } } = await client.get<{ state: Cart }>(`/cart/${workflowId}`));
    assert.equal(state.items.length, 1);
    assert.equal(state.items[0].productId, '0');
    assert.equal(state.items[0].quantity, 1);
  });
});