import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validateTenant } from "../middleware/tenant.middleware";
import { UserRole } from "../constants/roles";
import {
  saveBatchAttendance,
  getBatchAttendance,
  getAttendanceHistory,
  getAttendanceStats
} from "../controllers/attendance.controller";

const router = Router();

router.use(authenticate, validateTenant);

router.post("/batch", authorize(UserRole.CENTRE_ADMIN, UserRole.TEACHER, UserRole.SUPER_ADMIN), saveBatchAttendance);
router.get("/batch/:batchId", authorize(UserRole.CENTRE_ADMIN, UserRole.TEACHER, UserRole.SUPER_ADMIN), getBatchAttendance);
router.get("/history", authorize(UserRole.CENTRE_ADMIN, UserRole.TEACHER, UserRole.SUPER_ADMIN), getAttendanceHistory);
router.get("/stats", authorize(UserRole.CENTRE_ADMIN, UserRole.TEACHER, UserRole.SUPER_ADMIN), getAttendanceStats);

export default router;
