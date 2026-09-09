import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validateTenant } from "../middleware/tenant.middleware";
import { sendSuccess } from "../utils/response.utils";

const router = Router();

router.use(authenticate, validateTenant);

router.get("/", (_req, res) => {
  sendSuccess(res, "Batches module endpoint ready", []);
});

export default router;
