import { Response } from "express";
import { HttpStatus } from "../constants/http-status";

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T
): Response => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const sendSuccess = <T>(res: Response, message: string, data?: T, statusCode: number = HttpStatus.OK): Response => {
  return sendResponse(res, statusCode, true, message, data);
};

export const sendError = (res: Response, message: string, statusCode: number = HttpStatus.BAD_REQUEST, data?: any): Response => {
  return sendResponse(res, statusCode, false, message, data);
};
