import { Request, Response } from "express";
import { Student } from "../models/Student";
import { Parent } from "../models/Parent";
import { Batch } from "../models/Batch";
import { sendSuccess, sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";
import { Types } from "mongoose";

const getCentreIdStr = (req: Request): string => {
  const cid = req.centreId;
  if (typeof cid === "string") return cid;
  if (Array.isArray(cid)) return cid[0];
  return "";
};

export const getStudents = async (req: Request, res: Response): Promise<void> => {
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
  const batchId = req.query.batchId as string;

  const query: any = { centreId };

  if (status) {
    query.status = status;
  }

  if (batchId && Types.ObjectId.isValid(String(batchId))) {
    query.batchId = new Types.ObjectId(String(batchId));
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { admissionNumber: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  const total = await Student.countDocuments(query);
  const students = await Student.find(query)
    .populate("parents", "name phone email relationship")
    .populate("batchId", "name code course")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(total / limit) || 1;

  res.status(HttpStatus.OK).json({
    success: true,
    message: "Students fetched successfully",
    data: students,
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    timestamp: new Date().toISOString()
  });
};

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id))) {
    sendError(res, "Invalid student ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const student = await Student.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any })
    .populate("parents")
    .populate("batchId");

  if (!student) {
    sendError(res, "Student not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  sendSuccess(res, "Student details fetched successfully", student);
};

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const {
    admissionNumber,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    city,
    state,
    parents,
    batchId,
    status,
    admissionDate,
    profileImage,
    notes
  } = req.body;

  if (!firstName) {
    sendError(res, "First Name is required", HttpStatus.BAD_REQUEST);
    return;
  }

  let finalAdmissionNumber = admissionNumber ? admissionNumber.trim().toUpperCase() : "";

  if (finalAdmissionNumber) {
    const existing = await Student.findOne({ centreId: centreId as any, admissionNumber: finalAdmissionNumber });
    if (existing) {
      sendError(res, `Admission number '${finalAdmissionNumber}' already exists in this centre`, HttpStatus.CONFLICT);
      return;
    }
  } else {
    const count = await Student.countDocuments({ centreId: centreId as any });
    finalAdmissionNumber = `ADM${(count + 1).toString().padStart(3, "0")}`;
  }

  // Validate Parents match centreId
  const validParentIds: Types.ObjectId[] = [];
  if (Array.isArray(parents) && parents.length > 0) {
    for (const parentId of parents) {
      const pStr = String(parentId);
      if (Types.ObjectId.isValid(pStr)) {
        const parentDoc = await Parent.findOne({ _id: new Types.ObjectId(pStr), centreId: centreId as any });
        if (!parentDoc) {
          sendError(res, `Parent with ID ${pStr} does not belong to this centre`, HttpStatus.BAD_REQUEST);
          return;
        }
        validParentIds.push(parentDoc._id as Types.ObjectId);
      }
    }
  }

  // Validate Batch matches centreId & Capacity Check
  let validBatchId: Types.ObjectId | undefined = undefined;
  if (batchId && Types.ObjectId.isValid(String(batchId))) {
    const bStr = String(batchId);
    const batchDoc = await Batch.findOne({ _id: new Types.ObjectId(bStr), centreId: centreId as any });
    if (!batchDoc) {
      sendError(res, `Batch with ID ${bStr} does not belong to this centre`, HttpStatus.BAD_REQUEST);
      return;
    }
    if (batchDoc.capacity > 0) {
      const activeInBatch = await Student.countDocuments({ centreId: centreId as any, batchId: batchDoc._id, status: "ACTIVE" });
      if (activeInBatch >= batchDoc.capacity) {
        sendError(res, `Batch '${batchDoc.name}' capacity of ${batchDoc.capacity} has been reached`, HttpStatus.BAD_REQUEST);
        return;
      }
    }
    validBatchId = batchDoc._id as Types.ObjectId;
  }

  const student = await Student.create({
    centreId,
    admissionNumber: finalAdmissionNumber,
    firstName: firstName.trim(),
    lastName: lastName ? lastName.trim() : "",
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    gender: gender || "MALE",
    phone: phone ? phone.trim() : "",
    email: email ? email.trim().toLowerCase() : "",
    address: address ? address.trim() : "",
    city: city ? city.trim() : "",
    state: state ? state.trim() : "",
    parents: validParentIds,
    batchId: validBatchId,
    status: status || "ACTIVE",
    admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
    profileImage: profileImage || "",
    notes: notes || ""
  });

  sendSuccess(res, "Student created successfully", student, HttpStatus.CREATED);
};

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  if (!id || !Types.ObjectId.isValid(String(id))) {
    sendError(res, "Invalid student ID format", HttpStatus.BAD_REQUEST);
    return;
  }

  const student = await Student.findOne({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!student) {
    sendError(res, "Student not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  const {
    admissionNumber,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    city,
    state,
    parents,
    batchId,
    status,
    admissionDate,
    profileImage,
    notes
  } = req.body;

  if (admissionNumber && admissionNumber.trim().toUpperCase() !== student.admissionNumber) {
    const newAdmNo = admissionNumber.trim().toUpperCase();
    const existing = await Student.findOne({ centreId: centreId as any, admissionNumber: newAdmNo, _id: { $ne: new Types.ObjectId(String(id)) } });
    if (existing) {
      sendError(res, `Admission number '${newAdmNo}' already exists in this centre`, HttpStatus.CONFLICT);
      return;
    }
    student.admissionNumber = newAdmNo;
  }

  if (firstName !== undefined) student.firstName = firstName.trim();
  if (lastName !== undefined) student.lastName = lastName.trim();
  if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
  if (gender !== undefined) student.gender = gender;
  if (phone !== undefined) student.phone = phone.trim();
  if (email !== undefined) student.email = email.trim().toLowerCase();
  if (address !== undefined) student.address = address.trim();
  if (city !== undefined) student.city = city.trim();
  if (state !== undefined) student.state = state.trim();
  if (status !== undefined) student.status = status;
  if (admissionDate !== undefined) student.admissionDate = admissionDate ? new Date(admissionDate) : student.admissionDate;
  if (profileImage !== undefined) student.profileImage = profileImage;
  if (notes !== undefined) student.notes = notes;

  // Parents update validation
  if (parents !== undefined) {
    const validParentIds: Types.ObjectId[] = [];
    if (Array.isArray(parents)) {
      for (const parentId of parents) {
        const pStr = String(parentId);
        if (Types.ObjectId.isValid(pStr)) {
          const parentDoc = await Parent.findOne({ _id: new Types.ObjectId(pStr), centreId: centreId as any });
          if (!parentDoc) {
            sendError(res, `Parent with ID ${pStr} does not belong to this centre`, HttpStatus.BAD_REQUEST);
            return;
          }
          validParentIds.push(parentDoc._id as Types.ObjectId);
        }
      }
    }
    student.parents = validParentIds;
  }

  // Batch update validation
  if (batchId !== undefined) {
    if (batchId && Types.ObjectId.isValid(String(batchId))) {
      const bStr = String(batchId);
      if (!student.batchId || student.batchId.toString() !== bStr) {
        const batchDoc = await Batch.findOne({ _id: new Types.ObjectId(bStr), centreId: centreId as any });
        if (!batchDoc) {
          sendError(res, `Batch with ID ${bStr} does not belong to this centre`, HttpStatus.BAD_REQUEST);
          return;
        }
        if (batchDoc.capacity > 0) {
          const activeInBatch = await Student.countDocuments({ centreId: centreId as any, batchId: batchDoc._id, status: "ACTIVE" });
          if (activeInBatch >= batchDoc.capacity) {
            sendError(res, `Batch '${batchDoc.name}' capacity of ${batchDoc.capacity} has been reached`, HttpStatus.BAD_REQUEST);
            return;
          }
        }
        student.batchId = batchDoc._id as Types.ObjectId;
      }
    } else {
      student.batchId = undefined;
    }
  }

  await student.save();
  sendSuccess(res, "Student updated successfully", student);
};

export const updateStudentStatus = async (req: Request, res: Response): Promise<void> => {
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

  const student = await Student.findOneAndUpdate(
    { _id: new Types.ObjectId(String(id)), centreId: centreId as any },
    { status },
    { new: true }
  );

  if (!student) {
    sendError(res, "Student not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  sendSuccess(res, `Student status updated to ${status}`, student);
};

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  const centreIdStr = getCentreIdStr(req);
  const { id } = req.params;

  if (!centreIdStr || !Types.ObjectId.isValid(centreIdStr)) {
    sendError(res, "Centre context missing or invalid", HttpStatus.BAD_REQUEST);
    return;
  }
  const centreId = new Types.ObjectId(centreIdStr);

  const student = await Student.findOneAndDelete({ _id: new Types.ObjectId(String(id)), centreId: centreId as any });
  if (!student) {
    sendError(res, "Student not found or does not belong to your centre", HttpStatus.NOT_FOUND);
    return;
  }

  sendSuccess(res, "Student deleted successfully", { id });
};
