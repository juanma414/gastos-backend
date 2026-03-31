import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.person.upsert({
    where: { name: "Juan" },
    update: {},
    create: { name: "Juan" }
  });

  await prisma.person.upsert({
    where: { name: "Pareja" },
    update: {},
    create: { name: "Pareja" }
  });

  const supermercado = await prisma.category.upsert({
    where: { name: "Supermercado" },
    update: {},
    create: { name: "Supermercado", sortOrder: 1 }
  });

  const auto = await prisma.category.upsert({
    where: { name: "Auto" },
    update: {},
    create: { name: "Auto", sortOrder: 2 }
  });

  const supermercadoSubs = ["Comida", "Bebida", "Limpieza", "Otros"];
  for (const [index, name] of supermercadoSubs.entries()) {
    await prisma.subcategory.upsert({
      where: {
        categoryId_name: {
          categoryId: supermercado.id,
          name
        }
      },
      update: { sortOrder: index + 1 },
      create: {
        categoryId: supermercado.id,
        name,
        sortOrder: index + 1
      }
    });
  }

  const autoSubs = ["Nafta", "Lavado", "Mantenimiento", "Estacionamiento", "Otros"];
  for (const [index, name] of autoSubs.entries()) {
    await prisma.subcategory.upsert({
      where: {
        categoryId_name: {
          categoryId: auto.id,
          name
        }
      },
      update: { sortOrder: index + 1 },
      create: {
        categoryId: auto.id,
        name,
        sortOrder: index + 1
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
