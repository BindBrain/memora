import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.resource.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return Response.json(
        { error: "Resource not found." },
        { status: 404 }
      );
    }

    const data: {
      title?: string;
      url?: string;
      domain?: string;
      description?: string;
      note?: string;
      bookmarked?: boolean;
      categoryId?: string | null;
      position?: number;
    } = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();

      if (!title || title.length > 300) {
        return Response.json(
          { error: "Title must be between 1 and 300 characters." },
          { status: 400 }
        );
      }

      data.title = title;
    }

    if (typeof body.url === "string") {
      try {
        const url = new URL(
          /^https?:\/\//i.test(body.url.trim())
            ? body.url.trim()
            : `https://${body.url.trim()}`
        );

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol");
        }

        data.url = url.toString();
        data.domain = url.hostname.replace(/^www\./, "");
      } catch {
        return Response.json(
          { error: "Enter a valid HTTP or HTTPS URL." },
          { status: 400 }
        );
      }
    }

    if (typeof body.description === "string") {
      data.description = body.description.trim().slice(0, 2000);
    }

    if (typeof body.note === "string") {
      data.note = body.note.trim().slice(0, 5000);
    }

    if (typeof body.bookmarked === "boolean") {
      data.bookmarked = body.bookmarked;
    }

    if (body.categoryId === null || body.categoryId === "") {
      data.categoryId = null;
    } else if (typeof body.categoryId === "string") {
      const category = await prisma.category.findUnique({
        where: { id: body.categoryId },
        select: { id: true },
      });

      if (!category) {
        return Response.json(
          { error: "Category not found." },
          { status: 400 }
        );
      }

      data.categoryId = body.categoryId;
    }

    if (Number.isInteger(body.position) && body.position >= 0) {
      data.position = body.position;
    }

    const resource = await prisma.resource.update({
      where: { id },
      data,
      include: { category: true },
    });

    return Response.json({ resource });
  } catch (error) {
    console.error("Failed to update resource:", error);
    return Response.json(
      { error: "Failed to update resource." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    await prisma.resource.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete resource:", error);
    return Response.json(
      { error: "Resource not found or could not be deleted." },
      { status: 404 }
    );
  }
}
