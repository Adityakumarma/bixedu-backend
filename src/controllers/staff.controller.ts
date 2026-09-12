import { Request, Response } from "express";
import { Staff } from "../models/Staff";
import { User } from "../models/User";
import { Batch } from "../models/Batch";
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

export const getStaffList = async (req: Request, res: Response): Promise<void> => {
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
      { employeeId: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { designation: { $regex: search, $options: "i" } }
    ];
  }

  const total = await Staff.countDocuments(query);
  const staffList = await Staff.find(query)
    .populate("userId", "name email role isActive")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const userIds = staffList.map((s) => s.userId._id || s.userId);
  const assignedBatches = await Batch.find({
    centreId: centreId as any,
    teacherIds: { $in: userIds } as any
  }).select("name code teacherIds").lean();

  const userBatchMap: Record<string, any[]> = {};
  for (const b of assignedBatches) {
    for (const tId of b.teacherIds || []) {
      const tStr = tId.toString();
      if (!userBatchMap[tStr]) userBatchMap[tStr] = [];
      userBatchMap[tStr].push(b);
    }
  }

  const result = staffList.map((s) => {
    const uIdStr = s.userId._id ? s.userId._id.toString() : s.userId.toString();
    return {
      ...s,
      assignedBatches: userBatchMap[uIdStr] || []
    };
  });

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(HttpStatus.OK).json({
    success: true,
    message: "Staff list fetched successfully",
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

export const getStaffById = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id))) {
    sendError(res, "Invalid staff ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const staff = await Staff.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any })
    .populate("userId", "name email role isActive")
    .lean();

  if (!staff) {
    sendError(res, "Staff member not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  const userId = staff.userId._id || staff.userId;
  const assignedBatches = await Batch.find({
    centreId: centreId as any,
    teacherIds: userId as any
  }).lean();

  sendSuccess(res, "Staff details fetched successfully", {
    ...staff,
    assignedBatches
  });
};

export const createStaff = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const {
    name,
    email,
    phone,
    password,
    employeeId,
    designation,
    joiningDate,
    status,
    address,
    qualification,
    notes
  } = req.body;

  if (!name || !email) {
    sendError(res, "Name and Email are required for staff creation", HttpStatus.BAD_REQUEST);
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if User already exists with email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    sendError(res, `User with email '${normalizedEmail}' already exists`, HttpStatus.CONFLICT);
    return;
  }

  let finalEmpId = employeeId ? employeeId.trim().toUpperCase() : "";
  if (finalEmpId) {
    const existingEmp = await Staff.findOne({ centreId: centreId as any, employeeId: finalEmpId });
    if (existingEmp) {
      sendError(res, `Employee ID '${finalEmpId}' already exists in this centre`, HttpStatus.CONFLICT);
      return;
    }
  } else {
    const count = await Staff.countDocuments({ centreId: centreId as any });
    finalEmpId = `EMP${(count + 1).toString().padStart(3, "0")}`;
  }

  // Create User Account with TEACHER role
  const initialPassword = password && password.length >= 6 ? password : "Password123!";
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: initialPassword,
    role: UserRole.TEACHER,
    centreId,
    phone: phone ? phone.trim() : "",
    isActive: status !== "INACTIVE"
  });

  // Create Staff Profile
  const staff = await Staff.create({
    userId: user._id,
    centreId,
    employeeId: finalEmpId,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : "",
    designation: designation ? designation.trim() : "Faculty",
    joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    status: status || "ACTIVE",
    address: address ? address.trim() : "",
    qualification: qualification ? qualification.trim() : "",
    notes: notes ? notes.trim() : ""
  });

  sendSuccess(res, "Staff / Teacher profile created successfully", {
    id: staff._id,
    userId: user._id,
    name: staff.name,
    email: staff.email,
    employeeId: staff.employeeId,
    designation: staff.designation,
    status: staff.status,
    role: user.role
  }, HttpStatus.CREATED);
};

export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id))) {
    sendError(res, "Invalid staff ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const staff = await Staff.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!staff) {
    sendError(res, "Staff member not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  const {
    name,
    email,
    phone,
    employeeId,
    designation,
    joiningDate,
    status,
    address,
    qualification,
    notes
  } = req.body;

  if (employeeId && employeeId.trim().toUpperCase() !== staff.employeeId) {
    const newEmpId = employeeId.trim().toUpperCase();
    const existing = await Staff.findOne({ centreId: centreId as any, employeeId: newEmpId, _id: { $ne: staff._id } });
    if (existing) {
      sendError(res, `Employee ID '${newEmpId}' already exists in this centre`, HttpStatus.CONFLICT);
      return;
    }
    staff.employeeId = newEmpId;
  }

  if (email && email.trim().toLowerCase() !== staff.email) {
    const newEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: newEmail, _id: { $ne: staff.userId } });
    if (existingUser) {
      sendError(res, `Email '${newEmail}' is already in use`, HttpStatus.CONFLICT);
      return;
    }
    staff.email = newEmail;
    await User.updateOne({ _id: staff.userId }, { email: newEmail });
  }

  if (name !== undefined) {
    staff.name = name.trim();
    await User.updateOne({ _id: staff.userId }, { name: name.trim() });
  }
  if (phone !== undefined) {
    staff.phone = phone.trim();
    await User.updateOne({ _id: staff.userId }, { phone: phone.trim() });
  }
  if (designation !== undefined) staff.designation = designation.trim();
  if (joiningDate !== undefined) staff.joiningDate = joiningDate ? new Date(joiningDate) : staff.joiningDate;
  if (status !== undefined) {
    staff.status = status;
    await User.updateOne({ _id: staff.userId }, { isActive: status === "ACTIVE" });
  }
  if (address !== undefined) staff.address = address.trim();
  if (qualification !== undefined) staff.qualification = qualification.trim();
  if (notes !== undefined) staff.notes = notes.trim();

  await staff.save();
  sendSuccess(res, "Staff details updated successfully", staff);
};

export const updateStaffStatus = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;
  const { status } = req.body;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!status || !["ACTIVE", "INACTIVE"].includes(status)) {
    sendError(res, "Valid status ('ACTIVE' or 'INACTIVE') is required", HttpStatus.BAD_REQUEST);
    return;
  }

  const staff = await Staff.findOneAndUpdate(
    { _id: new Types.ObjectId(String(id)), centreId: centreId as any },
    { status },
    { new: true }
  );

  if (!staff) {
    sendError(res, "Staff member not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  await User.updateOne({ _id: staff.userId }, { isActive: status === "ACTIVE" });

  sendSuccess(res, `Staff status updated to ${status}`, staff);
};

export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const staff = await Staff.findOneAndDelete({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!staff) {
    sendError(res, "Staff member not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  // Remove teacher user from active batches
  await Batch.updateMany(
    { centreId: centreId as any, teacherIds: staff.userId as any },
    { $pull: { teacherIds: staff.userId } }
  );

  // Deactivate User account
  await User.findByIdAndUpdate(staff.userId, { isActive: false });

  sendSuccess(res, "Staff profile deleted successfully", { id });
};
