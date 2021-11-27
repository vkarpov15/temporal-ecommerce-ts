import { addAsync } from '@awaitjs/express';
import express, { Application } from 'express';
import { Server } from 'http';

import addToCart from './addToCart';
import getCart from './getCart';
import getProducts from './getProducts';
import createCart from './createCart';

export default async function createApp(port: number): Promise<{ app: Application, server: Server }> {
  const app = addAsync(express());

  app.use(express.json());

  const server = await app.listen(port);

  app.get('/products', getProducts);
  app.getAsync('/cart/:workflowId', getCart);

  app.postAsync('/cart', createCart);

  app.putAsync('/cart/:workflowId/add', addToCart);

  return { app, server };
};