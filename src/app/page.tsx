"use client";

import { useState, useEffect } from "react";
import ImageUploader from "@/components/ImageUploader";
import ImageGrid from "@/components/ImageGrid";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

const SYSTEM_PROMPT = `Generate a new creative image in the style of these Excalidraw and the reference images. Capture the visual aesthetic, color palette, artistic techniques, and overall mood of the references. Be creative and produce something unique while maintaining stylistic consistency with the provided examples.`;

const DEFAULT_IMAGES = [
  "/reference1.png",
  "/reference2.png",
  "/reference3.png",
];

async function loadDefaultImage(url: string): Promise<UploadedImage | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], url.split("/").pop() || "image.png", {
      type: blob.type,
    });

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(",")[1];
        resolve({
          id: crypto.randomUUID(),
          file,
          preview: result,
          base64,
          mimeType: blob.type || "image/png",
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);

  useEffect(() => {
    async function loadDefaults() {
      const loaded = await Promise.all(DEFAULT_IMAGES.map(loadDefaultImage));
      const valid = loaded.filter((img): img is UploadedImage => img !== null);
      setImages(valid);
      setIsLoadingDefaults(false);
    }
    loadDefaults();
  }, []);
  const [userContent, setUserContent] = useState("");
  const [generatedImages, setGeneratedImages] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError("Please upload at least one reference image");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `${SYSTEM_PROMPT}\n\nContent to visualize:\n${userContent}`,
          referenceImages: images.map((img) => ({
            data: img.base64,
            mimeType: img.mimeType,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate images");
      }

      const data = await response.json();
      setGeneratedImages(data.images);

      if (data.errors && data.errors.length > 0) {
        console.warn("Some images failed to generate:", data.errors);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate images");
    } finally {
      setIsLoading(false);
    }
  };

  const canGenerate = images.length > 0 && !isLoading;

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          Nano Banana Style Transfer
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload reference images and generate new images in their style using
          Gemini&apos;s Nano Banana Pro API.
        </p>
      </div>

      <div className="space-y-6">
        <ImageUploader
          images={images}
          onImagesChange={setImages}
          maxImages={3}
        />

        <div>
          <label
            htmlFor="system-prompt"
            className="block text-sm font-medium mb-2 text-foreground"
          >
            System Prompt
          </label>
          <div
            id="system-prompt"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-sm"
          >
            {SYSTEM_PROMPT}
          </div>
        </div>

        <div>
          <label
            htmlFor="user-content"
            className="block text-sm font-medium mb-2 text-foreground"
          >
            Content to Visualize
          </label>
          <textarea
            id="user-content"
            value={userContent}
            onChange={(e) => setUserContent(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Paste your article, information, or describe what you want to visualize..."
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`
            w-full py-3 px-6 rounded-lg font-medium text-white
            transition-colors duration-200
            ${
              canGenerate
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating 5 Images...
            </span>
          ) : (
            "Generate 5 Images"
          )}
        </button>

        <ImageGrid images={generatedImages} isLoading={isLoading} />
      </div>
    </main>
  );
}
