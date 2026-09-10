import { Request, Response } from "express";
import { Centre } from "../models/Centre";
import { sendSuccess, sendError } from "../utils/response.utils";
import { HttpStatus } from "../constants/http-status";

export const getCentre = async (req: Request, res: Response): Promise<void> => {
  const centreId = req.centreId || req.user?.centreId;

  if (!centreId) {
    sendError(res, "Centre context missing or user not assigned to a centre", HttpStatus.BAD_REQUEST);
    return;
  }

  const centre = await Centre.findById(centreId);
  if (!centre) {
    sendError(res, "Centre not found", HttpStatus.NOT_FOUND);
    return;
  }

  sendSuccess(res, "Centre profile fetched successfully", { centre });
};

export const updateCentre = async (req: Request, res: Response): Promise<void> => {
  const centreId = req.centreId || req.user?.centreId;

  if (!centreId) {
    sendError(res, "Centre context missing or user not assigned to a centre", HttpStatus.BAD_REQUEST);
    return;
  }

  const centre = await Centre.findById(centreId);
  if (!centre) {
    sendError(res, "Centre not found", HttpStatus.NOT_FOUND);
    return;
  }

  const { name, address, city, state, country, phone, email, logo } = req.body;

  if (name !== undefined) centre.name = name;
  if (address !== undefined) centre.address = address;
  if (city !== undefined) centre.city = city;
  if (state !== undefined) centre.state = state;
  if (country !== undefined) centre.country = country;
  if (phone !== undefined) centre.phone = phone;
  if (email !== undefined) centre.email = email;
  if (logo !== undefined) centre.logo = logo;

  await centre.save();

  sendSuccess(res, "Centre information updated successfully", { centre });
};
