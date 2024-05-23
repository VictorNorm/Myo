import { Request } from 'express';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  // Add other user properties if needed
}

interface AuthenticatedRequest extends Request {
  user?: User;
}