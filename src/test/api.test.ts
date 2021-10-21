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

  before(async function() {
    this.timeout(10000);

    ({ server } = await createApp(3000));

    await Core.install({
      logger: new DefaultLogger('ERROR'),
    });

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
    const { workflowId } = await axios.post('http://localhost:3000/cart')
      .then(res => res.data as { workflowId: string });

    let { state } = await axios.get(`http://localhost:3000/cart/${workflowId}`)
      .then(res => res.data as { state: Cart });
    assert.equal(state.items.length, 0);

    await axios.put(`http://localhost:3000/cart/${workflowId}/add`, { productId: '0', quantity: 1 });

    ({ state } = await axios.get(`http://localhost:3000/cart/${workflowId}`)
      .then(res => res.data as { state: Cart }));
    assert.equal(state.items.length, 1);
    assert.equal(state.items[0].productId, '0');
    assert.equal(state.items[0].quantity, 1);
  });
});