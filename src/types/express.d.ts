import { AuthUser } from "./auth.types";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    centreId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      centreId?: string;
    }
  }
}
