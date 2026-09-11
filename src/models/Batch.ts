import { Schema, model, Document, Types } from "mongoose";

export interface IBatch extends Document {
  centreId: Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  course?: string;
  startDate?: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  days?: string[];
  room?: string;
  capacity: number;
  status: "ACTIVE" | "INACTIVE" | "COMPLETED";
  teacherIds?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    centreId: { type: Schema.Types.ObjectId, ref: "Centre", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, uppercase: true, trim: true },
    description: { type: String, trim: true },
    course: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    days: [{ type: String }],
    room: { type: String, trim: true },
    capacity: { type: Number, default: 0 },
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "COMPLETED"], default: "ACTIVE" },
    teacherIds: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  {
    timestamps: true
  }
);

BatchSchema.index({ centreId: 1, status: 1 });
BatchSchema.index({ centreId: 1, name: 1 });

export const Batch = model<IBatch>("Batch", BatchSchema);
