import { Request, Response } from "express";
import { User } from "../models/User";
import { generateToken } from "../utils/jwt.utils";
import { sendSuccess, sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    sendError(res, "Email and password are required", HttpStatus.BAD_REQUEST);
    return;
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    sendError(res, "Invalid credentials", HttpStatus.UNAUTHORIZED);
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    sendError(res, "Invalid credentials", HttpStatus.UNAUTHORIZED);
    return;
  }

  if (!user.isActive) {
    sendError(res, "Account is disabled", HttpStatus.FORBIDDEN);
    return;
  }

  const token = generateToken({
    userId: (user._id as any).toString(),
    role: user.role,
    centreId: user.centreId ? (user.centreId as any).toString() : undefined
  });

  sendSuccess(res, "Login successful", {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      centreId: user.centreId
    }
  });
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, "Not authenticated", HttpStatus.UNAUTHORIZED);
    return;
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    sendError(res, "User not found", HttpStatus.NOT_FOUND);
    return;
  }

  sendSuccess(res, "Current user profile fetched successfully", { user });
};
