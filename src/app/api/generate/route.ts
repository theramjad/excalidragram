import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 800;
export const dynamic = "force-dynamic";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

const MODEL_NAME = "gemini-3-pro-image-preview";

interface GenerateRequest {
  prompt: string;
  referenceImages: { data: string; mimeType: string }[];
  count?: number;
  apiKey: string;
}

async function generateSingleImage(
  genai: GoogleGenAI,
  prompt: string,
  referenceImages: { data: string; mimeType: string }[],
  index: number
): Promise<{ index: number; image?: string; error?: string }> {
  try {
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: prompt + ` (Variation ${index + 1})` },
    ];

    for (const img of referenceImages) {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType,
        },
      });
    }

    const response = await genai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "2K",
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return { index, error: "No response from model" };
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          index,
          image: `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`,
        };
      }
    }

    return { index, error: "No image in response" };
  } catch (error) {
    console.error(`Error generating image ${index}:`, error);
    return {
      index,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prompt, referenceImages, count = 5, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required. Please enter your Gemini API key." },
        { status: 401 }
      );
    }

    if (!prompt || !referenceImages || referenceImages.length === 0) {
      return NextResponse.json(
        { error: "Prompt and at least one reference image are required" },
        { status: 400 }
      );
    }

    // Create a new GoogleGenAI instance with the user-provided API key
    const genai = new GoogleGenAI({ apiKey });

    // Generate images in parallel
    const results = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        generateSingleImage(genai, prompt, referenceImages, i)
      )
    );

    // Sort by index and extract images
    const sortedResults = results.sort((a, b) => a.index - b.index);
    const images = sortedResults.map((r) => r.image || null);
    const errors = sortedResults
      .filter((r) => r.error)
      .map((r) => ({ index: r.index, error: r.error }));

    return NextResponse.json({ images, errors });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
