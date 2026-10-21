import { NextResponse } from "next/server";
import { generateDescription } from "@/lib/ai/providers";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const url = typeof input.url === "string" ? input.url.trim() : "";
    const note = typeof input.note === "string" ? input.note.trim() : "";
    const metadata =
      input.metadata && typeof input.metadata === "object"
        ? (input.metadata as Record<string, unknown>)
        : {};

    if (!title || !url) {
      return NextResponse.json(
        { error: "A title and URL are required." },
        { status: 400 }
      );
    }

    if (title.length > 500 || url.length > 2048 || note.length > 3000) {
      return NextResponse.json(
        { error: "The title, URL, or note is too long." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Please provide a valid URL." },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS URLs are supported." },
        { status: 400 }
      );
    }

    const result = await generateDescription({
      title,
      url,
      domain: parsedUrl.hostname,
      note,
      metadataTitle:
        typeof metadata.title === "string"
          ? metadata.title.trim().slice(0, 300)
          : "",
      metadataDescription:
        typeof metadata.description === "string"
          ? metadata.description.trim().slice(0, 1000)
          : "",
      metadataContent:
        typeof metadata.content === "string"
          ? metadata.content.trim().slice(0, 10000)
          : "",
    });

    return NextResponse.json({
      description: result.description,
      provider: result.provider,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Description generation failed.";

    const noProviderConfigured = message.includes(
      "Connect an AI provider in Settings"
    );

    return NextResponse.json(
      { error: message },
      { status: noProviderConfigured ? 400 : 502 }
    );
  }
}
