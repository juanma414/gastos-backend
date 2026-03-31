import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { categoriesRouter } from "./routes/categories";
import { expensesRouter } from "./routes/expenses";
import { healthRouter } from "./routes/health";
import { peopleRouter } from "./routes/people";
import { placesRouter } from "./routes/places";
import { subcategoriesRouter } from "./routes/subcategories";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:4200";

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/people", peopleRouter);
app.use("/places", placesRouter);
app.use("/categories", categoriesRouter);
app.use("/subcategories", subcategoriesRouter);
app.use("/expenses", expensesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
