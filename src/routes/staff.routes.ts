import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validateTenant } from "../middleware/tenant.middleware";
import { UserRole } from "../constants/roles";
import {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  updateStaffStatus,
  deleteStaff
} from "../controllers/staff.controller";

const router = Router();

router.use(authenticate, validateTenant);

router.get("/", authorize(UserRole.CENTRE_ADMIN, UserRole.SUPER_ADMIN), getStaffList);
router.get("/:id", authorize(UserRole.CENTRE_ADMIN, UserRole.SUPER_ADMIN), getStaffById);
router.post("/", authorize(UserRole.CENTRE_ADMIN, UserRole.SUPER_ADMIN), createStaff);
router.put("/:id", authorize(UserRole.CENTRE_ADMIN, UserRole.SUPER_ADMIN), updateStaff);
router.patch("/:id/status", authorize(UserRole.CENTRE_ADMIN, UserRole.SUPER_ADMIN), updateStaffStatus);
router.delete("/:id", authorize(UserRole.CENTRE_ADMIN, UserRole.SUPER_ADMIN), deleteStaff);

export default router;
