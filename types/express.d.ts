import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: any; // Use a more specific type if known
  }
}