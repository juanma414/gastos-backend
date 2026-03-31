# Gastos Backend

API REST para registro de gastos compartidos.

## Stack
- Node.js + TypeScript
- Express
- Prisma
- PostgreSQL (recomendado: Supabase free)

## Requisitos
- Node.js 20+
- pnpm 10+

## Inicio rapido
1. Copiar variables de entorno:
   - `cp .env.example .env`
2. Instalar dependencias:
   - `pnpm install`
3. Generar cliente Prisma:
   - `pnpm prisma:generate`
4. Crear migracion local (primera vez):
   - `pnpm prisma:migrate --name init`
5. Cargar seed inicial:
   - `pnpm prisma:seed`
6. Ejecutar en desarrollo:
   - `pnpm dev`

## Endpoints base
- `GET /health`
- `GET /categories`
- `POST /expenses`
- `GET /expenses`

## Nota de negocio
La subcategoria siempre debe pertenecer a la categoria seleccionada.
El backend lo valida en `POST /expenses`.
