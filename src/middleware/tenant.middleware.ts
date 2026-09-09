import { Request, Response, NextFunction } from "express";
import { UserRole } from "../constants/roles";
import { sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";

export const validateTenant = (req: Request, res: Response, next: NextFunction): void => {
  const headerCentreId = req.headers["x-centre-id"] as string;

  if (req.user) {
    if (req.user.role === UserRole.SUPER_ADMIN) {
      if (headerCentreId) {
        req.centreId = headerCentreId;
      }
      return next();
    }

    if (req.user.centreId) {
      req.centreId = req.user.centreId;
      return next();
    }
  } else if (headerCentreId) {
    req.centreId = headerCentreId;
    return next();
  }

  sendError(res, "Centre tenant context (centreId) is required.", HttpStatus.BAD_REQUEST);
};
