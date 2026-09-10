import { Request, Response } from "express";
import { User } from "../models/User";
import { Centre } from "../models/Centre";
import { UserRole } from "../constants/roles";
import { generateToken } from "../utils/jwt.utils";
import { sendSuccess, sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";

export const register = async (req: Request, res: Response): Promise<void> => {
  const {
    centreName,
    centreCode,
    centreEmail,
    centrePhone,
    address,
    city,
    state,
    country,
    adminName,
    name,
    adminEmail,
    email,
    adminPhone,
    phone,
    password
  } = req.body;

  const finalName = adminName || name;
  const finalEmail = adminEmail || email;
  const finalPhone = adminPhone || phone;

  if (!centreName || !finalName || !finalEmail || !password) {
    sendError(res, "Centre Name, Admin Name, Email, and Password are required", HttpStatus.BAD_REQUEST);
    return;
  }

  const existingUser = await User.findOne({ email: finalEmail.toLowerCase() });
  if (existingUser) {
    sendError(res, "An account with this email already exists", HttpStatus.CONFLICT);
    return;
  }

  let codeToUse = centreCode ? centreCode.trim().toUpperCase() : "";
  if (codeToUse) {
    const existingCentre = await Centre.findOne({ code: codeToUse });
    if (existingCentre) {
      sendError(res, "Centre code already exists. Please choose a different code.", HttpStatus.CONFLICT);
      return;
    }
  } else {
    const prefix = centreName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "CENT";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    codeToUse = `${prefix}-${randomSuffix}`;
  }

  const centre = await Centre.create({
    name: centreName,
    code: codeToUse,
    email: centreEmail || finalEmail,
    phone: centrePhone || finalPhone,
    address: address || "",
    city: city || "",
    state: state || "",
    country: country || "India"
  });

  const user = await User.create({
    name: finalName,
    email: finalEmail.toLowerCase(),
    phone: finalPhone,
    password,
    role: UserRole.CENTRE_ADMIN,
    centreId: centre._id
  });

  centre.adminId = user._id as any;
  await centre.save();

  const token = generateToken({
    userId: (user._id as any).toString(),
    role: user.role,
    centreId: (centre._id as any).toString()
  });

  sendSuccess(
    res,
    "Registration successful",
    {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        centreId: user.centreId
      },
      centre: {
        id: centre._id,
        name: centre.name,
        code: centre.code,
        email: centre.email,
        phone: centre.phone,
        address: centre.address,
        city: centre.city,
        state: centre.state,
        country: centre.country
      }
    },
    HttpStatus.CREATED
  );
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    sendError(res, "Email and password are required", HttpStatus.BAD_REQUEST);
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    sendError(res, "Invalid email or password", HttpStatus.UNAUTHORIZED);
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    sendError(res, "Invalid email or password", HttpStatus.UNAUTHORIZED);
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

  let centreData = null;
  if (user.centreId) {
    centreData = await Centre.findById(user.centreId);
  }

  sendSuccess(res, "Login successful", {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      centreId: user.centreId
    },
    centre: centreData
      ? {
          id: centreData._id,
          name: centreData.name,
          code: centreData.code,
          email: centreData.email,
          phone: centreData.phone,
          address: centreData.address,
          city: centreData.city,
          state: centreData.state,
          country: centreData.country
        }
      : null
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

  let centreData = null;
  if (user.centreId) {
    centreData = await Centre.findById(user.centreId);
  }

  sendSuccess(res, "Current user profile fetched successfully", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      centreId: user.centreId,
      isActive: user.isActive
    },
    centre: centreData
  });
};

