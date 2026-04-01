import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyPassword } from "../lib/password";
import { requireAuth, signAuthToken } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(120)
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAuthToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    }
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json(user);
});
