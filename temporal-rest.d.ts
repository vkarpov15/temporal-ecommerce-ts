declare module 'temporal-rest' {
  export function createExpressMiddleware(workflows: any, client: any, taskQueue: string);
}