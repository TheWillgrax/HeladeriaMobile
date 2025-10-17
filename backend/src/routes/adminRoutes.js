import { Router } from "express";
import { dashboardController, listUsersController } from "../controllers/adminController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", dashboardController);
router.get("/users", listUsersController);

export default router;
