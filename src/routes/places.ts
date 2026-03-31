import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const placesRouter = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  isActive: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required"
});

placesRouter.get("/", async (_req, res) => {
  const rows = await prisma.place.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return res.json(rows);
});

placesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const created = await prisma.place.create({
    data: {
      name: parsed.data.name
    }
  });

  return res.status(201).json(created);
});

placesRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const updated = await prisma.place.update({
    where: { id: req.params.id },
    data: parsed.data
  });

  return res.json(updated);
});

placesRouter.delete("/:id", async (req, res) => {
  const updated = await prisma.place.update({
    where: { id: req.params.id },
    data: { isActive: false }
  });

  return res.json(updated);
});
