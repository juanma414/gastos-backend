import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

type CsvRow = {
  fecha: string;
  categoria: string;
  subcategoria: string;
  detalles: string;
  cantidad: string;
  importe: string;
  precioUnitario: string;
  lugarCompra: string;
  persona: string;
};

const prisma = new PrismaClient();

const CATEGORY_MAP: Record<string, string> = {
  gastos_fijos: "Gastos fijos"
};

const PLACE_MAP: Record<string, string> = {
  "": "",
  "mercado libre": "MercadoLibre",
  mercadolibre: "MercadoLibre",
  "pollería": "Polleria",
  polleria: "Polleria",
  verdu: "Verduleria",
  verduleria: "Verduleria",
  "super centro": "Super Centro",
  "farmacia": "Farmacia",
  "macro": "Macro",
  "ypf": "YPF",
  "la gallega": "La Gallega",
  breck: "Breck",
  "pañalera abasto": "Pañalera Abasto",
  "lavado fichas": "Lavado fichas",
  "almacen darigo": "Almacen Darigo",
  "sanatorio": "Sanatorio",
  "ferretería": "Ferreteria",
  "ferreteria": "Ferreteria",
  polleria: "Polleria"
};

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function normalizeCategory(raw: string): string {
  const key = normalizeSpaces(raw).toLowerCase();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  return titleCase(raw);
}

function normalizeSubcategory(raw: string): string {
  const normalized = normalizeSpaces(raw);
  if (!normalized) return "Otro";
  return titleCase(normalized);
}

function normalizePlace(raw: string): string | null {
  const key = normalizeSpaces(raw).toLowerCase();
  if (!key) return null;
  return PLACE_MAP[key] ?? titleCase(raw);
}

function normalizePerson(raw: string): string {
  const normalized = normalizeSpaces(raw);
  return titleCase(normalized);
}

function normalizeNote(raw: string): string | null {
  const normalized = normalizeSpaces(raw);
  return normalized || null;
}

function parseArgAmount(raw: string): number | null {
  const normalized = normalizeSpaces(raw);
  if (!normalized || normalized.includes("#DIV/0!")) return null;

  const cleaned = normalized
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim();

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseDate(raw: string): Date {
  const [d, m, y] = normalizeSpaces(raw).split("/").map((part) => Number(part));
  return new Date(Date.UTC(y, m - 1, d));
}

function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ';' && !inQuotes) {
      parts.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  parts.push(current);
  return parts.map((value) => value.trim());
}

function loadRows(csvPath: string): CsvRow[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split(/\r?\n/).filter((line) => normalizeSpaces(line).length > 0);
  const [, ...dataLines] = lines;

  return dataLines.map((line) => {
    const [fecha, categoria, subcategoria, detalles, cantidad, importe, precioUnitario, lugarCompra, persona] =
      parseCsvLine(line);

    return {
      fecha,
      categoria,
      subcategoria,
      detalles,
      cantidad,
      importe,
      precioUnitario,
      lugarCompra,
      persona
    };
  });
}

async function main(): Promise<void> {
  const csvPath = path.join(process.cwd(), "prisma", "data", "marzo-2026.csv");
  const rows = loadRows(csvPath);

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const amount = parseArgAmount(row.importe);
    if (!amount) {
      skipped += 1;
      continue;
    }

    const expenseDate = parseDate(row.fecha);
    const categoryName = normalizeCategory(row.categoria);
    const subcategoryName = normalizeSubcategory(row.subcategoria);
    const personName = normalizePerson(row.persona);
    const placeName = normalizePlace(row.lugarCompra);
    const note = normalizeNote(row.detalles);

    const person = await prisma.person.upsert({
      where: { name: personName },
      update: { isActive: true },
      create: { name: personName, isActive: true }
    });

    let placeId: string | null = null;
    if (placeName) {
      const place = await prisma.place.upsert({
        where: { name: placeName },
        update: { isActive: true },
        create: { name: placeName, isActive: true }
      });
      placeId = place.id;
    }

    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: { isActive: true },
      create: { name: categoryName, isActive: true }
    });

    const subcategory = await prisma.subcategory.upsert({
      where: {
        categoryId_name: {
          categoryId: category.id,
          name: subcategoryName
        }
      },
      update: { isActive: true },
      create: {
        categoryId: category.id,
        name: subcategoryName,
        isActive: true
      }
    });

    const alreadyExists = await prisma.expense.findFirst({
      where: {
        expenseDate,
        amount,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        personId: person.id,
        placeId,
        note: note ?? null,
        deletedAt: null
      }
    });

    if (alreadyExists) {
      skipped += 1;
      continue;
    }

    await prisma.expense.create({
      data: {
        expenseDate,
        amount,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        placeId,
        personId: person.id,
        note
      }
    });

    imported += 1;
  }

  console.log(`Import finished. Imported: ${imported}. Skipped: ${skipped}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
