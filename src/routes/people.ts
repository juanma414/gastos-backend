import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const peopleRouter = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(80)
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isActive: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required"
});

peopleRouter.get("/", async (_req, res) => {
  const rows = await prisma.person.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return res.json(rows);
});

peopleRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const created = await prisma.person.create({
    data: {
      name: parsed.data.name
    }
  });

  return res.status(201).json(created);
});

peopleRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const updated = await prisma.person.update({
    where: { id: req.params.id },
    data: parsed.data
  });

  return res.json(updated);
});

peopleRouter.delete("/:id", async (req, res) => {
  const updated = await prisma.person.update({
    where: { id: req.params.id },
    data: { isActive: false }
  });

  return res.json(updated);
});
