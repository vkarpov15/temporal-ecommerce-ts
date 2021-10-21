import { Worker } from '@temporalio/worker';
import assert from 'assert';
import { createActivities } from './activities';
import dotenv from 'dotenv';
import mailgun from 'mailgun-js';

dotenv.config();

assert.ok(process.env.MAILGUN_API);
assert.ok(process.env.MAILGUN_DOMAIN);
const apiKey: string = process.env.MAILGUN_API;
const domain: string = process.env.MAILGUN_DOMAIN;

const mg = mailgun({ apiKey, domain });

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function run() {
  const activities = createActivities(mg.messages(), `Temporal Bot <temporal@${domain}>`);

  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    taskQueue: 'ecommerce',
    activities,
  });

  await worker.run();
}
