import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validateTenant } from "../middleware/tenant.middleware";
import { UserRole } from "../constants/roles";
import {
  getParents,
  getParentById,
  createParent,
  updateParent,
  updateParentStatus,
  deleteParent
} from "../controllers/parents.controller";

const router = Router();

router.use(authenticate, validateTenant);

router.get("/", getParents);
router.get("/:id", getParentById);
router.post("/", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), createParent);
router.put("/:id", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), updateParent);
router.patch("/:id/status", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), updateParentStatus);
router.delete("/:id", authorize(UserRole.SUPER_ADMIN, UserRole.CENTRE_ADMIN), deleteParent);

export default router;
