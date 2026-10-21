import { NextResponse } from "next/server";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const SETTING_ID = "gemini_api_key";
const MODEL = "gemini-3.8-flash";

function encryptionKey(): Buffer {
  const encoded = process.env.APP_ENCRYPTION_KEY;
  if (!encoded) throw new Error("APP_ENCRYPTION_KEY is missing.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must decode to 32 bytes.");
  return key;
}

function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

function decryptSecret(value: string): string {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Stored Gemini key has an invalid format.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function testKey(apiKey: string): Promise<void> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Reply with exactly: Memora connected" }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0 },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }
  );

  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json() as {
        error?: { message?: string; status?: string };
      };
      detail = payload.error?.message?.slice(0, 300) ?? "";
    } catch {
      // Google did not return a readable JSON error.
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Gemini rejected this API key or its permissions.${detail ? ` Details: ${detail}` : ""}`
      );
    }
    if (response.status === 429) {
      throw new Error(
        `Gemini rate limit or quota reached.${detail ? ` Details: ${detail}` : ""}`
      );
    }
    if (response.status === 503) {
      throw new Error(
        `Gemini is temporarily unavailable. Try again shortly.${detail ? ` Details: ${detail}` : ""}`
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Gemini model or endpoint not found. Check model "${MODEL}".${detail ? ` Details: ${detail}` : ""}`
      );
    }

    throw new Error(
      `Gemini connection failed (HTTP ${response.status}).${detail ? ` Details: ${detail}` : ""}`
    );
  }
}

export async function GET() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: SETTING_ID },
      select: { id: true },
    });
    return NextResponse.json({ configured: Boolean(setting) });
  } catch {
    return NextResponse.json({ error: "Couldn't load Gemini settings." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("apiKey" in body) || typeof body.apiKey !== "string") {
      return NextResponse.json({ error: "Please provide a Gemini API key." }, { status: 400 });
    }

    const apiKey = body.apiKey.trim();
    if (!apiKey || apiKey.length > 500) {
      return NextResponse.json({ error: "Please enter a valid API key." }, { status: 400 });
    }

    await testKey(apiKey);
    const value = encryptSecret(apiKey);

    await prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      create: { id: SETTING_ID, value },
      update: { value },
    });

    return NextResponse.json({
      success: true,
      configured: true,
      message: "Gemini connected successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't connect to Gemini.";
    const status = message.includes("APP_ENCRYPTION_KEY") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST() {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
    if (!setting) {
      return NextResponse.json({ error: "Add your Gemini API key first." }, { status: 400 });
    }

    await testKey(decryptSecret(setting.value));
    return NextResponse.json({
      success: true,
      configured: true,
      message: "Gemini connection is working.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini connection test failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await prisma.appSetting.deleteMany({ where: { id: SETTING_ID } });
    return NextResponse.json({
      success: true,
      configured: false,
      message: "Gemini API key removed.",
    });
  } catch {
    return NextResponse.json({ error: "Couldn't remove the Gemini API key." }, { status: 500 });
  }
}
