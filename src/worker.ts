import { Worker } from '@temporalio/worker';

run().catch((err) => console.log(err));

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    taskQueue: 'ecommerce',
  });

  await worker.run();
}
