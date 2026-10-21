import { NextRequest, NextResponse } from "next/server";



function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCodePoint(Number(n))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16))
    )
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPublicWebUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:")
  ) return false;

  const ipv4 = host.split(".").map(Number);

  if (
    ipv4.length === 4 &&
    ipv4.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
  ) {
    const [a, b] = ipv4;

    if (
      a === 0 || a === 10 || a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) return false;
  }

  return true;
}

function getMeta(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    const pattern =
      /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

    for (const match of tag.matchAll(pattern)) {
      attrs[match[1].toLowerCase()] =
        match[2] ?? match[3] ?? match[4] ?? "";
    }

    const property = (attrs.property || "").toLowerCase();
    const name = (attrs.name || "").toLowerCase();

    if (property === key.toLowerCase() || name === key.toLowerCase()) {
      return decodeHtml(attrs.content || "");
    }
  }

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUrl = String(body.url || "").trim();

    if (!rawUrl || rawUrl.length > 2048) {
      return NextResponse.json(
        { error: "Enter a valid website URL." },
        { status: 400 }
      );
    }

    const url = new URL(
      /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    );

    if (!isPublicWebUrl(url)) {
      return NextResponse.json(
        { error: "Only public HTTP and HTTPS websites are supported." },
        { status: 400 }
      );
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Memora/1.0; +resource-metadata)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Website metadata could not be fetched (HTTP ${response.status}). You can enter the title manually.` },
        { status: 422 }
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
      return NextResponse.json(
        { error: "This URL does not return an HTML page. Enter the title manually." },
        { status: 422 }
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "The website returned an empty response." }, { status: 422 });
    }

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (total < 500_000) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = 500_000 - total;
      const chunk = value.byteLength > remaining
        ? value.slice(0, remaining)
        : value;

      chunks.push(chunk);
      total += chunk.byteLength;

      if (chunk.byteLength < value.byteLength) break;
    }

    await reader.cancel().catch(() => {});
    const html = new TextDecoder().decode(
      Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
    );

    const title =
      getMeta(html, "og:title") ||
      getMeta(html, "twitter:title") ||
      decodeHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");

    const description =
      getMeta(html, "og:description") ||
      getMeta(html, "description") ||
      getMeta(html, "twitter:description");

    const content = decodeHtml(
      html
        .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
        .replace(/<(header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    ).slice(0, 12000);

    return NextResponse.json({
      title: title.slice(0, 300),
      description: description.slice(0, 1000),
      content,
      finalUrl: url.toString(),
    });
  } catch (error) {
    console.error(
      "Website metadata error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Could not read this website's metadata. You can enter the title manually." },
      { status: 422 }
    );
  }
}
