import { Request, Response } from "express";
import { sendSuccess } from "../utils/response.utils";

export const getHealthStatus = (_req: Request, res: Response) => {
  sendSuccess(res, "BixEdu API is running", {
    status: "healthy",
    timestamp: new Date().toISOString()
  });
};
