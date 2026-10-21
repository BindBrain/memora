import { NextResponse } from "next/server";

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function cleanText(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const query = (requestUrl.searchParams.get("q") || "").trim();

    if (!query || query.length > 300) {
      return NextResponse.json(
        { error: "Enter a search query of up to 300 characters." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Memora/1.0)",
          Accept: "text/html",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "The web search provider is temporarily unavailable." },
        { status: 502 }
      );
    }

    const html = (await response.text()).slice(0, 1_500_000);
    const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
    const results: {
      title: string;
      url: string;
      description: string;
      domain: string;
    }[] = [];
    const seen = new Set<string>();

    for (const anchor of anchors) {
      if (!/\bclass=["'][^"']*\bresult__a\b/i.test(anchor)) continue;

      const href = anchor.match(/\bhref=["']([^"']+)["']/i)?.[1];
      const title = cleanText(anchor.replace(/<a\b[^>]*>|<\/a>/gi, ""));

      if (!href || !title) continue;

      let resultUrl: URL;
      try {
        const decodedHref = decodeHtml(href);
        const candidate = decodedHref.startsWith("//")
          ? `https:${decodedHref}`
          : decodedHref;

        const parsed = new URL(candidate, "https://html.duckduckgo.com");

        if (parsed.hostname.endsWith("duckduckgo.com")) {
          const destination = parsed.searchParams.get("uddg");
          if (!destination) continue;
          resultUrl = new URL(destination);
        } else {
          resultUrl = parsed;
        }
      } catch {
        continue;
      }

      if (
        !["http:", "https:"].includes(resultUrl.protocol) ||
        resultUrl.hostname === "localhost" ||
        resultUrl.hostname.endsWith(".localhost") ||
        seen.has(resultUrl.href)
      ) {
        continue;
      }

      seen.add(resultUrl.href);

      const description = anchors
        .filter((item) => /\bclass=["'][^"']*\bresult__snippet\b/i.test(item))
        .map(cleanText)[results.length] || "";

      results.push({
        title: title.slice(0, 300),
        url: resultUrl.href,
        description: description.slice(0, 700),
        domain: resultUrl.hostname.replace(/^www\./, ""),
      });

      if (results.length >= 8) break;
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error(
      "Web search error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Couldn't search the web right now. Please try again." },
      { status: 502 }
    );
  }
}
