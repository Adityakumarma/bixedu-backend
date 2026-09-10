import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validateTenant } from "../middleware/tenant.middleware";
import { getCentre, updateCentre } from "../controllers/centres.controller";
import { UserRole } from "../constants/roles";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.use(authenticate);

router.get(
  "/me",
  authorize(UserRole.CENTRE_ADMIN, UserRole.SUPER_ADMIN),
  validateTenant,
  asyncHandler(getCentre)
);

router.put(
  "/me",
  authorize(UserRole.CENTRE_ADMIN, UserRole.SUPER_ADMIN),
  validateTenant,
  asyncHandler(updateCentre)
);

export default router;

