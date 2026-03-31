import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const categoriesRouter = Router();

const listQuerySchema = z.object({
  includeInactive: z.enum(["true", "false"]).optional()
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional()
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required"
});

categoriesRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const includeInactive = parsed.data.includeInactive === "true";
  const data = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      subcategories: {
        where: includeInactive ? {} : { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }
    }
  });

  return res.json(data);
});

categoriesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const created = await prisma.category.create({
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? 0
    }
  });

  return res.status(201).json(created);
});

categoriesRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const updated = await prisma.category.update({
    where: { id: req.params.id },
    data: parsed.data
  });

  return res.json(updated);
});

categoriesRouter.delete("/:id", async (req, res) => {
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      isActive: false,
      subcategories: {
        updateMany: {
          where: { categoryId: req.params.id },
          data: { isActive: false }
        }
      }
    },
    include: {
      subcategories: true
    }
  });

  return res.json(category);
});
