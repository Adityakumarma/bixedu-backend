import { Schema, model, Document, Types } from "mongoose";

export interface ICentre extends Document {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  logo?: string;
  adminId?: Types.ObjectId;
  status: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CentreSchema = new Schema<ICentre>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    logo: { type: String, trim: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, default: "ACTIVE" },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

CentreSchema.index({ adminId: 1 });

export const Centre = model<ICentre>("Centre", CentreSchema);


