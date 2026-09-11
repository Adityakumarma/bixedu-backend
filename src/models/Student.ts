import { Schema, model, Document, Types } from "mongoose";

export interface IStudent extends Document {
  centreId: Types.ObjectId;
  admissionNumber: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  parents: Types.ObjectId[];
  batchId?: Types.ObjectId;
  status: "ACTIVE" | "INACTIVE";
  admissionDate: Date;
  profileImage?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    centreId: { type: Schema.Types.ObjectId, ref: "Centre", required: true },
    admissionNumber: { type: String, required: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], default: "MALE" },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    parents: [{ type: Schema.Types.ObjectId, ref: "Parent" }],
    batchId: { type: Schema.Types.ObjectId, ref: "Batch" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    admissionDate: { type: Date, default: Date.now },
    profileImage: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

StudentSchema.index({ centreId: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index({ centreId: 1, status: 1 });
StudentSchema.index({ centreId: 1, batchId: 1 });

export const Student = model<IStudent>("Student", StudentSchema);
