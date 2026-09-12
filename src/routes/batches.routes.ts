import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validateTenant } from "../middleware/tenant.middleware";
import { UserRole } from "../constants/roles";
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  updateBatchStatus,
  deleteBatch,
  assignStudentToBatch,
  removeStudentFromBatch,
  assignTeacherToBatch,
  removeTeacherFromBatch
} from "../controllers/batches.controller";

const router = Router();

router.use(authenticate, validateTenant);

router.get("/", getBatches);
router.get("/:id", getBatchById);
router.post("/", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), createBatch);
router.put("/:id", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), updateBatch);
router.patch("/:id/status", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), updateBatchStatus);
router.delete("/:id", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), deleteBatch);
router.post("/:id/students", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), assignStudentToBatch);
router.delete("/:id/students/:studentId", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), removeStudentFromBatch);
router.post("/:id/teachers", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), assignTeacherToBatch);
router.delete("/:id/teachers/:teacherId", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), removeTeacherFromBatch);

export default router;
