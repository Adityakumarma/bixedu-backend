import { Router } from "express";
import { register, login, getCurrentUser } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", authenticate, asyncHandler(getCurrentUser));

export default router;

