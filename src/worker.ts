import { Worker } from '@temporalio/worker';

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    taskQueue: 'ecommerce',
  });

  await worker.run();
}
