import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.utils";
import { UserRole } from "../constants/roles";
import { sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "Authentication required. Token missing.", HttpStatus.UNAUTHORIZED);
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      centreId: decoded.centreId,
      name: "",
      email: ""
    };
    if (decoded.centreId) {
      req.centreId = decoded.centreId;
    }
    next();
  } catch (error) {
    sendError(res, "Invalid or expired token.", HttpStatus.UNAUTHORIZED);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "User not authenticated.", HttpStatus.UNAUTHORIZED);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, "Access denied. Insufficient permissions.", HttpStatus.FORBIDDEN);
      return;
    }

    next();
  };
};
