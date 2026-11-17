import { PrismaClient } from "@prisma/client";

// Each serverless instance gets its own connection pool, and Prisma's default
// pool size (2 x CPUs + 1) multiplied across instances, plus the local dev
// server on the same database, exhausts the database role's connection cap.
// One connection per instance is Prisma's serverless recommendation; parallel
// queries in a request just queue on it (they're milliseconds each, next to
// the database). An explicit `connection_limit` in DATABASE_URL still wins.
const CONNECTION_LIMIT = "1";

function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", CONNECTION_LIMIT);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

// Reuse a single PrismaClient across hot-reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
