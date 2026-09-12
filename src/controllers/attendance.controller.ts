import { Request, Response } from "express";
import { Attendance } from "../models/Attendance";
import { Batch } from "../models/Batch";
import { Student } from "../models/Student";
import { UserRole } from "../constants/roles";
import { sendSuccess, sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";
import { Types } from "mongoose";

const getCentreIdStr = (req: Request): string => {
  const cid = req.centreId;
  if (typeof cid === "string") return cid;
  if (Array.isArray(cid)) return cid[0];
  return "";
};

const normalizeDate = (dateStr: string): Date => {
  if (!dateStr) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(Date.UTC(y, m, d));
  }
  const parsed = new Date(dateStr);
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
};

export const saveBatchAttendance = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const { batchId, date, records } = req.body;

  if (!batchId || !Types.ObjectId.isValid(String(batchId))) {
    sendError(res, "Valid Batch ID is required", HttpStatus.BAD_REQUEST);
    return;
  }
  const bObjId = new Types.ObjectId(String(batchId));

  const batchDoc = await Batch.findOne({ _id: bObjId, centreId: centreId as any });
  if (!batchDoc) {
    sendError(res, "Batch not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  // Teacher role restriction: Must be assigned to batch
  if (req.user && req.user.role === UserRole.TEACHER) {
    const userIdStr = req.user.id.toString();
    const isAssigned = (batchDoc.teacherIds || []).some(tId => tId.toString() === userIdStr);
    if (!isAssigned) {
      sendError(res, "Access denied. You are not assigned to mark attendance for this batch.", HttpStatus.FORBIDDEN);
      return;
    }
  }

  if (!Array.isArray(records) || records.length === 0) {
    sendError(res, "Attendance records array is required", HttpStatus.BAD_REQUEST);
    return;
  }

  const attendanceDate = normalizeDate(date);
  const markedByUserId = new Types.ObjectId(req.user!.id);

  // Fetch all valid students in batch
  const batchStudents = await Student.find({ centreId: centreId as any, batchId: bObjId, status: "ACTIVE" }).select("_id");
  const validStudentIdSet = new Set(batchStudents.map(s => s._id.toString()));

  const bulkOps = [];
  for (const item of records) {
    const sStr = String(item.studentId);
    if (Types.ObjectId.isValid(sStr) && validStudentIdSet.has(sStr)) {
      const sObjId = new Types.ObjectId(sStr);
      const status = ["PRESENT", "ABSENT", "LATE"].includes(item.status) ? item.status : "PRESENT";
      const remarks = item.remarks ? String(item.remarks).trim() : "";

      bulkOps.push({
        updateOne: {
          filter: {
            centreId,
            batchId: bObjId,
            studentId: sObjId,
            date: attendanceDate
          },
          update: {
            $set: {
              status,
              markedBy: markedByUserId,
              remarks,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          upsert: true
        }
      });
    }
  }

  if (bulkOps.length === 0) {
    sendError(res, "No valid student attendance records provided for this batch", HttpStatus.BAD_REQUEST);
    return;
  }

  await Attendance.bulkWrite(bulkOps);

  sendSuccess(res, `Attendance saved successfully for ${bulkOps.length} students`, {
    batchId: bObjId,
    date: attendanceDate.toISOString().substring(0, 10),
    count: bulkOps.length
  });
};

export const getBatchAttendance = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const { batchId } = req.params;
  const dateParam = req.query.date as string;

  if (!batchId || !Types.ObjectId.isValid(String(batchId))) {
    sendError(res, "Valid Batch ID is required", HttpStatus.BAD_REQUEST);
    return;
  }
  const bObjId = new Types.ObjectId(String(batchId));

  const batchDoc = await Batch.findOne({ _id: bObjId, centreId: centreId as any });
  if (!batchDoc) {
    sendError(res, "Batch not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  if (req.user && req.user.role === UserRole.TEACHER) {
    const userIdStr = req.user.id.toString();
    const isAssigned = (batchDoc.teacherIds || []).some(tId => tId.toString() === userIdStr);
    if (!isAssigned) {
      sendError(res, "Access denied. You are not assigned to this batch.", HttpStatus.FORBIDDEN);
      return;
    }
  }

  const targetDate = normalizeDate(dateParam);

  const students = await Student.find({ centreId: centreId as any, batchId: bObjId })
    .select("firstName lastName admissionNumber phone parents status profileImage")
    .sort({ firstName: 1, lastName: 1 })
    .lean();

  const existingAttendance = await Attendance.find({
    centreId: centreId as any,
    batchId: bObjId,
    date: targetDate
  }).lean();

  const attMap: Record<string, any> = {};
  for (const a of existingAttendance) {
    attMap[a.studentId.toString()] = a;
  }

  const resultRecords = students.map(s => {
    const sIdStr = s._id.toString();
    const existing = attMap[sIdStr];
    return {
      student: s,
      status: existing ? existing.status : "PRESENT",
      remarks: existing ? existing.remarks || "" : "",
      markedAt: existing ? existing.updatedAt : null,
      isRecorded: !!existing
    };
  });

  sendSuccess(res, "Batch attendance records fetched successfully", {
    batch: {
      id: batchDoc._id,
      name: batchDoc.name,
      code: batchDoc.code,
      course: batchDoc.course
    },
    date: targetDate.toISOString().substring(0, 10),
    studentsCount: students.length,
    records: resultRecords
  });
};

export const getAttendanceHistory = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const skip = (page - 1) * limit;

  const batchId = req.query.batchId as string;
  const studentId = req.query.studentId as string;
  const status = req.query.status as string;
  const date = req.query.date as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  const query: any = { centreId };

  if (req.user && req.user.role === UserRole.TEACHER) {
    const assignedBatches = await Batch.find({ centreId: centreId as any, teacherIds: req.user.id as any }).select("_id");
    const assignedBatchIds = assignedBatches.map(b => b._id);
    if (batchId && Types.ObjectId.isValid(String(batchId))) {
      const bObjId = new Types.ObjectId(String(batchId));
      if (!assignedBatchIds.some(id => id.equals(bObjId))) {
        sendError(res, "Access denied to batch attendance history", HttpStatus.FORBIDDEN);
        return;
      }
      query.batchId = bObjId;
    } else {
      query.batchId = { $in: assignedBatchIds };
    }
  } else if (batchId && Types.ObjectId.isValid(String(batchId))) {
    query.batchId = new Types.ObjectId(String(batchId));
  }

  if (studentId && Types.ObjectId.isValid(String(studentId))) {
    query.studentId = new Types.ObjectId(String(studentId));
  }

  if (status && ["PRESENT", "ABSENT", "LATE"].includes(status)) {
    query.status = status;
  }

  if (date) {
    query.date = normalizeDate(date);
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = normalizeDate(startDate);
    if (endDate) query.date.$lte = normalizeDate(endDate);
  }

  const total = await Attendance.countDocuments(query);
  const history = await Attendance.find(query)
    .populate("studentId", "firstName lastName admissionNumber phone")
    .populate("batchId", "name code")
    .populate("markedBy", "name email role")
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(HttpStatus.OK).json({
    success: true,
    message: "Attendance history fetched successfully",
    data: history,
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    timestamp: new Date().toISOString()
  });
};

export const getAttendanceStats = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const batchId = req.query.batchId as string;
  const studentId = req.query.studentId as string;

  const matchQuery: any = { centreId };

  if (batchId && Types.ObjectId.isValid(String(batchId))) {
    matchQuery.batchId = new Types.ObjectId(String(batchId));
  }
  if (studentId && Types.ObjectId.isValid(String(studentId))) {
    matchQuery.studentId = new Types.ObjectId(String(studentId));
  }

  const aggregateResult = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  let present = 0;
  let absent = 0;
  let late = 0;

  for (const row of aggregateResult) {
    if (row._id === "PRESENT") present = row.count;
    if (row._id === "ABSENT") absent = row.count;
    if (row._id === "LATE") late = row.count;
  }

  const total = present + absent + late;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  sendSuccess(res, "Attendance statistics fetched successfully", {
    total,
    present,
    absent,
    late,
    attendanceRate: rate
  });
};
