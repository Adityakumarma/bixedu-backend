import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { sendSuccess } from "../utils/response.utils";

const router = Router();

router.use(authenticate);

router.get("/", (_req, res) => {
  sendSuccess(res, "Centres module endpoint ready", []);
});

export default router;
