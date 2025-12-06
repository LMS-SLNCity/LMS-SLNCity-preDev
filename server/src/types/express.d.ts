/**
 * Express type extensions for better TypeScript support
 */

import * as express from 'express';

export { Request, Response, Router, Application } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
        permissions?: string[];
      };
      clientUser?: {
        id: number;
        clientId: number;
        username: string;
      };
    }
  }
}

