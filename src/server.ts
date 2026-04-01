import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { hashPassword } from "./lib/password";
import { prisma } from "./lib/prisma";
import { requireAuth } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { categoriesRouter } from "./routes/categories";
import { expensesRouter } from "./routes/expenses";
import { healthRouter } from "./routes/health";
import { peopleRouter } from "./routes/people";
import { placesRouter } from "./routes/places";
import { subcategoriesRouter } from "./routes/subcategories";
import { usersRouter } from "./routes/users";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:4200";

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter);

app.use(requireAuth);

app.use("/users", usersRouter);
app.use("/people", peopleRouter);
app.use("/places", placesRouter);
app.use("/categories", categoriesRouter);
app.use("/subcategories", subcategoriesRouter);
app.use("/expenses", expensesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function ensureInitialUsers(): Promise<void> {
  const usersCount = await prisma.user.count();
  if (usersCount > 0) return;

  await prisma.user.createMany({
    data: [
      {
        name: "Juan",
        email: "juan@gastos.local",
        passwordHash: hashPassword("Juan1234"),
        role: "ADMIN"
      },
      {
        name: "Ludmi",
        email: "ludmi@gastos.local",
        passwordHash: hashPassword("Ludmi1234"),
        role: "MEMBER"
      }
    ]
  });

  console.log("Seeded initial users: Juan (ADMIN), Ludmi (MEMBER)");
}

async function bootstrap(): Promise<void> {
  await ensureInitialUsers();
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap server", error);
  process.exit(1);
});
