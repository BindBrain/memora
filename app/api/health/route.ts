import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return Response.json(
      {
        status: "error",
        database: "disconnected",
        message: "Could not connect to the database. Check that PostgreSQL is running and DATABASE_URL is correct.",
      },
      { status: 503 }
    );
  }
}