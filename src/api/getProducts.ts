import express from 'express';
import { products } from '../products';

export default function getProducts(_req: express.Request, res: express.Response) {
  res.json({ products });
};