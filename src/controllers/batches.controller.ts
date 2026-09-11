import { Request, Response } from "express";
import { Batch } from "../models/Batch";
import { Student } from "../models/Student";
import { sendSuccess, sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";
import { Types } from "mongoose";

const getCentreIdStr = (req: Request): string => {
  const cid = req.centreId;
  if (typeof cid === "string") return cid;
  if (Array.isArray(cid)) return cid[0];
  return "";
};

export const getBatches = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const skip = (page - 1) * limit;

  const search = (req.query.search as string || "").trim();
  const status = req.query.status as string;

  const query: any = { centreId };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
      { course: { $regex: search, $options: "i" } },
      { room: { $regex: search, $options: "i" } }
    ];
  }

  const total = await Batch.countDocuments(query);
  const batches = await Batch.find(query)
    .populate("teacherIds", "name email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const batchIds = batches.map((b) => b._id);
  const studentCounts = await Student.aggregate([
    { $match: { centreId: centreId as any, batchId: { $in: batchIds }, status: "ACTIVE" } },
    { $group: { _id: "$batchId", count: { $sum: 1 } } }
  ]);

  const countMap: Record<string, number> = {};
  for (const item of studentCounts) {
    countMap[item._id.toString()] = item.count;
  }

  const result = batches.map((b) => ({
    ...b,
    studentCount: countMap[b._id.toString()] || 0
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(HttpStatus.OK).json({
    success: true,
    message: "Batches fetched successfully",
    data: result,
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    timestamp: new Date().toISOString()
  });
};

export const getBatchById = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id))) {
    sendError(res, "Invalid batch ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const batch = await Batch.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any }).populate("teacherIds", "name email phone").lean();

  if (!batch) {
    sendError(res, "Batch not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  const students = await Student.find({ centreId: centreId as any, batchId: new Types.ObjectId(String(id)) as any })
    .populate("parents", "name phone")
    .lean();

  sendSuccess(res, "Batch details fetched successfully", {
    ...batch,
    students,
    studentCount: students.length
  });
};

export const createBatch = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const {
    name,
    code,
    description,
    course,
    startDate,
    endDate,
    startTime,
    endTime,
    days,
    room,
    capacity,
    status,
    teacherIds
  } = req.body;

  if (!name) {
    sendError(res, "Batch Name is required", HttpStatus.BAD_REQUEST);
    return;
  }

  const validTeacherIds: Types.ObjectId[] = [];
  if (Array.isArray(teacherIds)) {
    for (const t of teacherIds) {
      const tStr = String(t);
      if (Types.ObjectId.isValid(tStr)) {
        validTeacherIds.push(new Types.ObjectId(tStr));
      }
    }
  }

  const batch = await Batch.create({
    centreId,
    name: name.trim(),
    code: code ? code.trim().toUpperCase() : "",
    description: description ? description.trim() : "",
    course: course ? course.trim() : "",
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    startTime: startTime ? startTime.trim() : "",
    endTime: endTime ? endTime.trim() : "",
    days: Array.isArray(days) ? days : [],
    room: room ? room.trim() : "",
    capacity: capacity !== undefined ? Number(capacity) : 0,
    status: status || "ACTIVE",
    teacherIds: validTeacherIds
  });

  sendSuccess(res, "Batch created successfully", batch, HttpStatus.CREATED);
};

export const updateBatch = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id))) {
    sendError(res, "Invalid batch ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const batch = await Batch.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!batch) {
    sendError(res, "Batch not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  const {
    name,
    code,
    description,
    course,
    startDate,
    endDate,
    startTime,
    endTime,
    days,
    room,
    capacity,
    status,
    teacherIds
  } = req.body;

  if (capacity !== undefined && Number(capacity) > 0) {
    const activeCount = await Student.countDocuments({ centreId: centreId as any, batchId: new Types.ObjectId(String(id)) as any, status: "ACTIVE" });
    if (activeCount > Number(capacity)) {
      sendError(res, `Cannot reduce capacity to ${capacity}. Current active enrollment is ${activeCount}.`, HttpStatus.BAD_REQUEST);
      return;
    }
  }

  if (name !== undefined) batch.name = name.trim();
  if (code !== undefined) batch.code = code.trim().toUpperCase();
  if (description !== undefined) batch.description = description.trim();
  if (course !== undefined) batch.course = course.trim();
  if (startDate !== undefined) batch.startDate = startDate ? new Date(startDate) : undefined;
  if (endDate !== undefined) batch.endDate = endDate ? new Date(endDate) : undefined;
  if (startTime !== undefined) batch.startTime = startTime.trim();
  if (endTime !== undefined) batch.endTime = endTime.trim();
  if (days !== undefined) batch.days = Array.isArray(days) ? days : [];
  if (room !== undefined) batch.room = room.trim();
  if (capacity !== undefined) batch.capacity = Number(capacity);
  if (status !== undefined) batch.status = status;
  if (teacherIds !== undefined && Array.isArray(teacherIds)) {
    const validTeacherIds: Types.ObjectId[] = [];
    for (const t of teacherIds) {
      const tStr = String(t);
      if (Types.ObjectId.isValid(tStr)) {
        validTeacherIds.push(new Types.ObjectId(tStr));
      }
    }
    batch.teacherIds = validTeacherIds;
  }

  await batch.save();
  sendSuccess(res, "Batch updated successfully", batch);
};

export const updateBatchStatus = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;
  const { status } = req.body;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!status || !["ACTIVE", "INACTIVE", "COMPLETED"].includes(status)) {
    sendError(res, "Valid status ('ACTIVE', 'INACTIVE', or 'COMPLETED') is required", HttpStatus.BAD_REQUEST);
    return;
  }

  const batch = await Batch.findOneAndUpdate(
    { _id: new Types.ObjectId(String(id)), centreId: centreId as any },
    { status },
    { new: true }
  );

  if (!batch) {
    sendError(res, "Batch not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  sendSuccess(res, `Batch status updated to ${status}`, batch);
};

export const deleteBatch = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const batch = await Batch.findOneAndDelete({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!batch) {
    sendError(res, "Batch not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  // Unassign students from this batch
  await Student.updateMany(
    { centreId: centreId as any, batchId: new Types.ObjectId(String(id)) as any },
    { $unset: { batchId: 1 } }
  );

  sendSuccess(res, "Batch deleted successfully", { id });
};

export const assignStudentToBatch = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;
  const { studentId } = req.body;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id)) || !studentId || !Types.ObjectId.isValid(String(studentId))) {
    sendError(res, "Invalid batch or student ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const batch = await Batch.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!batch) {
    sendError(res, "Batch not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  const student = await Student.findOne({ _id: new Types.ObjectId(String(studentId)), centreId: centreId as any });
  if (!student) {
    sendError(res, "Student not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  if (student.batchId && student.batchId.toString() === String(id)) {
    sendError(res, "Student is already assigned to this batch", HttpStatus.BAD_REQUEST);
    return;
  }

  // Capacity check
  if (batch.capacity > 0) {
    const activeInBatch = await Student.countDocuments({ centreId: centreId as any, batchId: batch._id, status: "ACTIVE" });
    if (activeInBatch >= batch.capacity) {
      sendError(res, `Batch '${batch.name}' capacity of ${batch.capacity} has been reached`, HttpStatus.BAD_REQUEST);
      return;
    }
  }

  student.batchId = batch._id as Types.ObjectId;
  await student.save();

  sendSuccess(res, `Student '${student.firstName} ${student.lastName || ""}' assigned to batch '${batch.name}'`, {
    studentId: student._id,
    batchId: batch._id
  });
};

export const removeStudentFromBatch = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id, studentId } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id)) || !studentId || !Types.ObjectId.isValid(String(studentId))) {
    sendError(res, "Invalid batch or student ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const student = await Student.findOne({ _id: new Types.ObjectId(String(studentId)), centreId: centreId as any, batchId: new Types.ObjectId(String(id)) as any });
  if (!student) {
    sendError(res, "Student is not assigned to this batch or not in your centre", HttpStatus.NOT_FOUND);
    return;
  }

  student.batchId = undefined;
  await student.save();

  sendSuccess(res, "Student removed from batch successfully", { studentId, batchId: id });
};
