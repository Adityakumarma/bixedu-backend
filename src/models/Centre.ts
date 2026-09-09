import { Schema, model, Document } from "mongoose";

export interface ICentre extends Document {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CentreSchema = new Schema<ICentre>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String },
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

export const Centre = model<ICentre>("Centre", CentreSchema);
