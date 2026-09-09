import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { UserRole } from "../constants/roles";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  centreId?: Types.ObjectId;
  phone?: string;
  isActive: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CENTRE_ADMIN
    },
    centreId: { type: Schema.Types.ObjectId, ref: "Centre", required: false },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>("User", UserSchema);
