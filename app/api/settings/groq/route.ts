
import { NextResponse } from "next/server";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
const SETTING_ID = "groq_api_key";
const GROQ_MODEL = "openai/gpt-oss-20b";

function getEncryptionKey(): Buffer {
  const encoded = process.env.APP_ENCRYPTION_KEY;

  if (!encoded) {
    throw new Error("APP_ENCRYPTION_KEY is missing from your environment.");
  }

  const key = Buffer.from(encoded, "base64");

  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must decode to 32 bytes.");
  }

  return key;
}

function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

function decryptSecret(value: string): string {
  const [ivEncoded, tagEncoded, encryptedEncoded] = value.split(".");

  if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error("The stored Groq key has an invalid format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivEncoded, "base64")
  );

  decipher.setAuthTag(Buffer.from(tagEncoded, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function testGroqKey(apiKey: string): Promise<boolean> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: Memora connected",
        },
      ],
      temperature: 0,
      max_completion_tokens: 30,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    // Never return or log the submitted key.
    if (response.status === 401 || response.status === 403) {
      throw new Error("Groq rejected this API key. Check that it is correct.");
    }

    if (response.status === 429) {
      throw new Error("Groq rate limit reached. Please try again shortly.");
    }

    if (response.status === 400 || response.status === 404) {
      throw new Error(
        "Groq could not use the configured model. Check the model availability."
      );
    }

    throw new Error(`Groq connection failed (HTTP ${response.status}).`);
  }

  return true;
}

export async function GET() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: SETTING_ID },
      select: { id: true },
    });

    return NextResponse.json({
      configured: Boolean(setting),
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't load Groq settings." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("apiKey" in body) ||
      typeof body.apiKey !== "string"
    ) {
      return NextResponse.json(
        { error: "Please provide a Groq API key." },
        { status: 400 }
      );
    }

    const apiKey = body.apiKey.trim();

    if (!apiKey || apiKey.length > 500) {
      return NextResponse.json(
        { error: "Please enter a valid API key." },
        { status: 400 }
      );
    }

    // Verify the key before storing it.
    await testGroqKey(apiKey);

    const encryptedValue = encryptSecret(apiKey);

    await prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      create: {
        id: SETTING_ID,
        value: encryptedValue,
      },
      update: {
        value: encryptedValue,
      },
    });

    return NextResponse.json({
      success: true,
      configured: true,
      message: "Groq connected successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Couldn't connect to Groq.";

    const status =
      message.includes("APP_ENCRYPTION_KEY") ||
      message.includes("stored Groq key")
        ? 500
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: SETTING_ID },
    });

    if (!setting) {
      return NextResponse.json(
        { error: "Add your Groq API key first." },
        { status: 400 }
      );
    }

    const apiKey = decryptSecret(setting.value);
    await testGroqKey(apiKey);

    return NextResponse.json({
      success: true,
      configured: true,
      message: "Groq connection is working.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Groq connection test failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await prisma.appSetting.deleteMany({
      where: { id: SETTING_ID },
    });

    return NextResponse.json({
      success: true,
      configured: false,
      message: "Groq API key removed.",
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't remove the Groq API key." },
      { status: 500 }
    );
  }
}
