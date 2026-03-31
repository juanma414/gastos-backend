import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const subcategoriesRouter = Router();

const listQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  includeInactive: z.enum(["true", "false"]).optional()
});

const createSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional()
});

const updateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required"
});

subcategoriesRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const query = parsed.data;
  const where: Record<string, unknown> = {};

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.includeInactive !== "true") {
    where.isActive = true;
  }

  const rows = await prisma.subcategory.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return res.json(rows);
});

subcategoriesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const created = await prisma.subcategory.create({
    data: {
      categoryId: payload.categoryId,
      name: payload.name,
      sortOrder: payload.sortOrder ?? 0
    }
  });

  return res.status(201).json(created);
});

subcategoriesRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const updated = await prisma.subcategory.update({
    where: { id: req.params.id },
    data: parsed.data
  });

  return res.json(updated);
});

subcategoriesRouter.delete("/:id", async (req, res) => {
  const updated = await prisma.subcategory.update({
    where: { id: req.params.id },
    data: { isActive: false }
  });

  return res.json(updated);
});
