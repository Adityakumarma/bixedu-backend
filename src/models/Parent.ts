import { Schema, model, Document, Types } from "mongoose";

export interface IParent extends Document {
  centreId: Types.ObjectId;
  name: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  address?: string;
  city?: string;
  state?: string;
  userId?: Types.ObjectId;
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema = new Schema<IParent>(
  {
    centreId: { type: Schema.Types.ObjectId, ref: "Centre", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    relationship: {
      type: String,
      enum: ["FATHER", "MOTHER", "GUARDIAN", "OTHER"],
      default: "FATHER"
    },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

ParentSchema.index({ centreId: 1, phone: 1 });
ParentSchema.index({ centreId: 1, name: 1 });

export const Parent = model<IParent>("Parent", ParentSchema);
