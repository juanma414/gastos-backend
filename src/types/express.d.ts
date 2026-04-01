import type { AuthPayload } from "../middleware/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export {};
