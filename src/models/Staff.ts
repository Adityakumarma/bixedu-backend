import { Schema, model, Document, Types } from "mongoose";

export interface IStaff extends Document {
  userId: Types.ObjectId;
  centreId: Types.ObjectId;
  employeeId?: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  joiningDate?: Date;
  status: "ACTIVE" | "INACTIVE";
  address?: string;
  qualification?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    centreId: { type: Schema.Types.ObjectId, ref: "Centre", required: true },
    employeeId: { type: String, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true, default: "Faculty" },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    address: { type: String, trim: true },
    qualification: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

StaffSchema.index({ centreId: 1, employeeId: 1 });
StaffSchema.index({ centreId: 1, status: 1 });
StaffSchema.index({ centreId: 1, name: 1 });
StaffSchema.index({ userId: 1 });

export const Staff = model<IStaff>("Staff", StaffSchema);
