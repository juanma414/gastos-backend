import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const expensesRouter = Router();

const createExpenseSchema = z.object({
  expenseDate: z.string().date(),
  amount: z.number().positive(),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().nullable().optional(),
  placeId: z.string().uuid().nullable().optional(),
  personId: z.string().uuid(),
  note: z.string().max(500).optional().nullable()
});

const listQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
  placeId: z.string().uuid().optional()
});

expensesRouter.post("/", async (req, res) => {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const payload = parsed.data;

  if (payload.subcategoryId) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: payload.subcategoryId }
    });

    if (!subcategory || subcategory.categoryId !== payload.categoryId) {
      return res.status(400).json({ error: "Subcategoria invalida para la categoria seleccionada" });
    }
  }

  const created = await prisma.expense.create({
    data: {
      expenseDate: new Date(payload.expenseDate),
      amount: payload.amount,
      categoryId: payload.categoryId,
      subcategoryId: payload.subcategoryId ?? null,
      placeId: payload.placeId ?? null,
      personId: payload.personId,
      note: payload.note ?? null
    },
    include: {
      category: true,
      subcategory: true,
      person: true,
      place: true
    }
  });

  return res.status(201).json(created);
});

expensesRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const query = parsed.data;
  const where: Record<string, unknown> = {
    deletedAt: null
  };

  if (query.from || query.to) {
    where.expenseDate = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {})
    };
  }

  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.subcategoryId) where.subcategoryId = query.subcategoryId;
  if (query.personId) where.personId = query.personId;
  if (query.placeId) where.placeId = query.placeId;

  const rows = await prisma.expense.findMany({
    where,
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    include: {
      category: true,
      subcategory: true,
      person: true,
      place: true
    }
  });

  return res.json(rows);
});
