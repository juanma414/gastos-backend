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

const updateExpenseSchema = z
  .object({
    expenseDate: z.string().date().optional(),
    amount: z.number().positive().optional(),
    categoryId: z.string().uuid().optional(),
    subcategoryId: z.string().uuid().nullable().optional(),
    placeId: z.string().uuid().nullable().optional(),
    personId: z.string().uuid().optional(),
    note: z.string().max(500).optional().nullable()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required"
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

expensesRouter.patch("/:id", async (req, res) => {
  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.deletedAt) {
    return res.status(404).json({ error: "Expense not found" });
  }

  const categoryId = payload.categoryId ?? existing.categoryId;
  const subcategoryId = payload.subcategoryId !== undefined ? payload.subcategoryId : existing.subcategoryId;

  if (subcategoryId) {
    const subcategory = await prisma.subcategory.findUnique({ where: { id: subcategoryId } });
    if (!subcategory || subcategory.categoryId !== categoryId) {
      return res.status(400).json({ error: "Subcategoria invalida para la categoria seleccionada" });
    }
  }

  const updated = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      ...(payload.expenseDate ? { expenseDate: new Date(payload.expenseDate) } : {}),
      ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
      ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
      ...(payload.subcategoryId !== undefined ? { subcategoryId: payload.subcategoryId } : {}),
      ...(payload.placeId !== undefined ? { placeId: payload.placeId } : {}),
      ...(payload.personId !== undefined ? { personId: payload.personId } : {}),
      ...(payload.note !== undefined ? { note: payload.note } : {})
    },
    include: {
      category: true,
      subcategory: true,
      person: true,
      place: true
    }
  });

  return res.json(updated);
});
