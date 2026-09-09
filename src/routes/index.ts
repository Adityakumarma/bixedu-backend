import { Router } from "express";
import authRoutes from "./auth.routes";
import centresRoutes from "./centres.routes";
import studentsRoutes from "./students.routes";
import parentsRoutes from "./parents.routes";
import batchesRoutes from "./batches.routes";
import attendanceRoutes from "./attendance.routes";
import feesRoutes from "./fees.routes";
import examsRoutes from "./exams.routes";
import staffRoutes from "./staff.routes";
import notificationsRoutes from "./notifications.routes";
import reportsRoutes from "./reports.routes";
import subscriptionsRoutes from "./subscriptions.routes";
import { getHealthStatus } from "../controllers/health.controller";

const router = Router();

router.get("/health", getHealthStatus);

router.use("/auth", authRoutes);
router.use("/centres", centresRoutes);
router.use("/students", studentsRoutes);
router.use("/parents", parentsRoutes);
router.use("/batches", batchesRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/fees", feesRoutes);
router.use("/exams", examsRoutes);
router.use("/staff", staffRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/reports", reportsRoutes);
router.use("/subscriptions", subscriptionsRoutes);

export default router;
