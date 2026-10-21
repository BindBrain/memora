import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { resources: true },
        },
      },
    });

    return Response.json({ categories });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return Response.json(
      { error: "Failed to load categories." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return Response.json(
        { error: "Category name is required." },
        { status: 400 }
      );
    }

    if (name.length > 60) {
      return Response.json(
        { error: "Category name must be 60 characters or fewer." },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        description:
          typeof body.description === "string"
            ? body.description.trim().slice(0, 500)
            : "",
        color:
          typeof body.color === "string" &&
          /^#[0-9a-fA-F]{6}$/.test(body.color)
            ? body.color
            : "#8b8cf7",
        icon:
          typeof body.icon === "string"
            ? body.icon.slice(0, 40)
            : "folder",
        position:
          Number.isInteger(body.position) && body.position >= 0
            ? body.position
            : 0,
      },
    });

    return Response.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return Response.json(
      { error: "Failed to create category." },
      { status: 500 }
    );
  }
}
