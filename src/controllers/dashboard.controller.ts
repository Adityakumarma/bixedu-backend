import { Request, Response } from "express";
import { Student } from "../models/Student";
import { Parent } from "../models/Parent";
import { Batch } from "../models/Batch";
import { User } from "../models/User";
import { UserRole } from "../constants/roles";
import { sendSuccess, sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";
import { Types } from "mongoose";

const getCentreId = (req: Request): string => {
  const cid = req.centreId;
  if (typeof cid === "string") return cid;
  if (Array.isArray(cid)) return (cid as any)[0];
  return "";
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreId(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const [totalStudents, activeBatches, totalParents, totalTeachers] = await Promise.all([
    Student.countDocuments({ centreId, status: "ACTIVE" }),
    Batch.countDocuments({ centreId, status: "ACTIVE" }),
    Parent.countDocuments({ centreId, status: "ACTIVE" }),
    User.countDocuments({ centreId, role: UserRole.TEACHER, isActive: true })
  ]);

  sendSuccess(res, "Dashboard stats fetched successfully", {
    totalStudents,
    activeBatches,
    totalParents,
    totalTeachers,
    pendingFeesAmount: 0
  });
};
