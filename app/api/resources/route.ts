import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

function getFavicon(url: URL) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const categoryId = params.get("categoryId");
    const bookmarked = params.get("bookmarked");
    const search = params.get("search")?.trim();

    const resources = await prisma.resource.findMany({
      where: {
        ...(categoryId === "uncategorized"
          ? { categoryId: null }
          : categoryId
            ? { categoryId }
            : {}),
        ...(bookmarked === "true" ? { bookmarked: true } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { url: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { note: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: { category: true },
    });

    return Response.json({ resources });
  } catch (error) {
    console.error("Failed to fetch resources:", error);
    return Response.json(
      { error: "Failed to load resources." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";

    if (!rawUrl) {
      return Response.json(
        { error: "A URL is required." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(
        /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
      );
    } catch {
      return Response.json(
        { error: "Enter a valid website URL." },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return Response.json(
        { error: "Only HTTP and HTTPS URLs are supported." },
        { status: 400 }
      );
    }

    const categoryId =
      typeof body.categoryId === "string" && body.categoryId.trim()
        ? body.categoryId.trim()
        : null;

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });

      if (!category) {
        return Response.json(
          { error: "The selected category was not found." },
          { status: 400 }
        );
      }
    }

    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";

    const resource = await prisma.resource.create({
      data: {
        title: title || parsedUrl.hostname,
        url: parsedUrl.toString(),
        domain: parsedUrl.hostname.replace(/^www\./, ""),
        description:
          typeof body.description === "string"
            ? body.description.trim().slice(0, 2000)
            : "",
        note:
          typeof body.note === "string"
            ? body.note.trim().slice(0, 5000)
            : "",
        faviconUrl: getFavicon(parsedUrl),
        bookmarked: body.bookmarked === true,
        categoryId,
      },
      include: { category: true },
    });

    return Response.json({ resource }, { status: 201 });
  } catch (error) {
    console.error("Failed to create resource:", error);
    return Response.json(
      { error: "Failed to save resource." },
      { status: 500 }
    );
  }
}
