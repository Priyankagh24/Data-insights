import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/expenses", expensesRouter);
router.use("/upload", uploadRouter);

export default router;
