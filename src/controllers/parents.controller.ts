import { Request, Response } from "express";
import { Parent } from "../models/Parent";
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

export const getParents = async (req: Request, res: Response): Promise<void> => {
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
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  const total = await Parent.countDocuments(query);
  const parents = await Parent.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const parentIds = parents.map((p) => p._id);
  const students = await Student.find({
    centreId: centreId as any,
    parents: { $in: parentIds } as any
  }).select("firstName lastName admissionNumber parents status batchId").lean();

  const parentChildrenMap: Record<string, any[]> = {};
  for (const s of students) {
    for (const pId of s.parents || []) {
      const pStr = pId.toString();
      if (!parentChildrenMap[pStr]) {
        parentChildrenMap[pStr] = [];
      }
      parentChildrenMap[pStr].push(s);
    }
  }

  const result = parents.map((p) => ({
    ...p,
    children: parentChildrenMap[p._id.toString()] || []
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(HttpStatus.OK).json({
    success: true,
    message: "Parents fetched successfully",
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

export const getParentById = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id))) {
    sendError(res, "Invalid parent ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const parent = await Parent.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any }).lean();
  if (!parent) {
    sendError(res, "Parent not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  const children = await Student.find({ centreId: centreId as any, parents: new Types.ObjectId(String(id)) as any })
    .populate("batchId", "name code")
    .lean();

  sendSuccess(res, "Parent details fetched successfully", {
    ...parent,
    children
  });
};

export const createParent = async (req: Request, res: Response): Promise<void> => {
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
    alternatePhone,
    relationship,
    address,
    city,
    state,
    status,
    notes,
    children
  } = req.body;

  if (!name || !phone) {
    sendError(res, "Name and Phone are required for parent record", HttpStatus.BAD_REQUEST);
    return;
  }

  const parent = await Parent.create({
    centreId,
    name: name.trim(),
    email: email ? email.trim().toLowerCase() : "",
    phone: phone.trim(),
    alternatePhone: alternatePhone ? alternatePhone.trim() : "",
    relationship: relationship || "FATHER",
    address: address ? address.trim() : "",
    city: city ? city.trim() : "",
    state: state ? state.trim() : "",
    status: status || "ACTIVE",
    notes: notes || ""
  });

  if (Array.isArray(children) && children.length > 0) {
    for (const childId of children) {
      const cStr = String(childId);
      if (Types.ObjectId.isValid(cStr)) {
        await Student.updateOne(
          { _id: new Types.ObjectId(cStr), centreId: centreId as any },
          { $addToSet: { parents: parent._id } }
        );
      }
    }
  }

  sendSuccess(res, "Parent created successfully", parent, HttpStatus.CREATED);
};

export const updateParent = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id))) {
    sendError(res, "Invalid parent ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const parent = await Parent.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!parent) {
    sendError(res, "Parent not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  const {
    name,
    email,
    phone,
    alternatePhone,
    relationship,
    address,
    city,
    state,
    status,
    notes,
    children
  } = req.body;

  if (name !== undefined) parent.name = name.trim();
  if (email !== undefined) parent.email = email.trim().toLowerCase();
  if (phone !== undefined) parent.phone = phone.trim();
  if (alternatePhone !== undefined) parent.alternatePhone = alternatePhone.trim();
  if (relationship !== undefined) parent.relationship = relationship;
  if (address !== undefined) parent.address = address.trim();
  if (city !== undefined) parent.city = city.trim();
  if (state !== undefined) parent.state = state.trim();
  if (status !== undefined) parent.status = status;
  if (notes !== undefined) parent.notes = notes;

  await parent.save();

  if (children !== undefined && Array.isArray(children)) {
    // Remove this parent from all students in centre first
    await Student.updateMany(
      { centreId: centreId as any, parents: parent._id as any },
      { $pull: { parents: parent._id } }
    );
    // Add to specified children
    for (const childId of children) {
      const cStr = String(childId);
      if (Types.ObjectId.isValid(cStr)) {
        await Student.updateOne(
          { _id: new Types.ObjectId(cStr), centreId: centreId as any },
          { $addToSet: { parents: parent._id } }
        );
      }
    }
  }

  sendSuccess(res, "Parent updated successfully", parent);
};

export const updateParentStatus = async (req: Request, res: Response): Promise<void> => {
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

  const parent = await Parent.findOneAndUpdate(
    { _id: new Types.ObjectId(String(id)), centreId: centreId as any },
    { status },
    { new: true }
  );

  if (!parent) {
    sendError(res, "Parent not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  sendSuccess(res, `Parent status updated to ${status}`, parent);
};

export const deleteParent = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const parent = await Parent.findOneAndDelete({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!parent) {
    sendError(res, "Parent not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  await Student.updateMany(
    { centreId: centreId as any, parents: new Types.ObjectId(String(id)) as any },
    { $pull: { parents: new Types.ObjectId(String(id)) } }
  );

  sendSuccess(res, "Parent deleted successfully", { id });
};
