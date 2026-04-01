import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { requireAdmin } from "../middleware/auth";

export const usersRouter = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6).max(120),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER")
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).max(120).optional(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
  isActive: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required"
});

usersRouter.use(requireAdmin);

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  return res.json(users);
});

usersRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: hashPassword(parsed.data.password),
      role: parsed.data.role
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  return res.status(201).json(created);
});

usersRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    role?: "ADMIN" | "MEMBER";
    isActive?: boolean;
  } = {
    name: parsed.data.name,
    email: parsed.data.email?.toLowerCase(),
    role: parsed.data.role,
    isActive: parsed.data.isActive
  };

  if (parsed.data.password) {
    data.passwordHash = hashPassword(parsed.data.password);
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  return res.json(updated);
});

usersRouter.delete("/:id", async (req, res) => {
  if (req.auth?.sub === req.params.id) {
    return res.status(400).json({ error: "You cannot deactivate your own user" });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  return res.json(updated);
});
