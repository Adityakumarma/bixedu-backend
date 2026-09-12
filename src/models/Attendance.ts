import { Schema, model, Document, Types } from "mongoose";

export interface IAttendance extends Document {
  centreId: Types.ObjectId;
  batchId: Types.ObjectId;
  studentId: Types.ObjectId;
  date: Date;
  status: "PRESENT" | "ABSENT" | "LATE";
  markedBy: Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    centreId: { type: Schema.Types.ObjectId, ref: "Centre", required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["PRESENT", "ABSENT", "LATE"], default: "PRESENT" },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    remarks: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

// Unique constraint preventing duplicate attendance for a student in a batch on the same calendar date
AttendanceSchema.index({ centreId: 1, batchId: 1, studentId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ centreId: 1, batchId: 1, date: 1 });
AttendanceSchema.index({ centreId: 1, studentId: 1, date: 1 });

export const Attendance = model<IAttendance>("Attendance", AttendanceSchema);
