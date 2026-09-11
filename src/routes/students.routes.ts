import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validateTenant } from "../middleware/tenant.middleware";
import { UserRole } from "../constants/roles";
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus,
  deleteStudent
} from "../controllers/students.controller";

const router = Router();

router.use(authenticate, validateTenant);

router.get("/", getStudents);
router.get("/:id", getStudentById);
router.post("/", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), createStudent);
router.put("/:id", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), updateStudent);
router.patch("/:id/status", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), updateStudentStatus);
router.delete("/:id", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), deleteStudent);

export default router;
