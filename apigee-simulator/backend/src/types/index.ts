export interface AuthedRequest extends Express.Request {
  user?: { id: string; email: string; role: string };
}
