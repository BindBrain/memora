import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Category not found." }, { status: 404 });
    }

    const data: {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
      position?: number;
    } = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 60) {
        return Response.json(
          { error: "Name must be between 1 and 60 characters." },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (typeof body.description === "string") {
      data.description = body.description.trim().slice(0, 500);
    }

    if (typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)) {
      data.color = body.color;
    }

    if (typeof body.icon === "string") {
      data.icon = body.icon.slice(0, 40);
    }

    if (Number.isInteger(body.position) && body.position >= 0) {
      data.position = body.position;
    }

    const category = await prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { resources: true } } },
    });

    return Response.json({ category });
  } catch (error) {
    console.error("Failed to update category:", error);
    return Response.json({ error: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    await prisma.category.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return Response.json(
      { error: "Category not found or could not be deleted." },
      { status: 404 }
    );
  }
}
