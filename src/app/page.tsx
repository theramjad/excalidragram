"use client";

import { useState, useEffect } from "react";
import ImageUploader from "@/components/ImageUploader";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  base64: string;
  refinements: GeneratedImage[];
}

const DEFAULT_SYSTEM_PROMPT = `Generate a new creative image in the style of these Excalidraw and the reference images. Use a white background. Capture the visual aesthetic, color palette, artistic techniques, and overall mood of the references. Be creative and produce something unique while maintaining stylistic consistency with the provided examples.`;

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

function extractBase64(dataUrl: string): string {
  return dataUrl.split(",")[1] || dataUrl;
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [userContent, setUserContent] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [refiningImageId, setRefiningImageId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDefaults() {
      const loaded = await Promise.all(DEFAULT_IMAGES.map(loadDefaultImage));
      const valid = loaded.filter((img): img is UploadedImage => img !== null);
      setImages(valid);
      setIsLoadingDefaults(false);
    }
    loadDefaults();
  }, []);

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError("Please upload at least one reference image");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedImageId(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${systemPrompt}\n\nContent to visualize:\n${userContent}`,
          referenceImages: images.map((img) => ({
            data: img.base64,
            mimeType: img.mimeType,
          })),
          count: 5,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate images");
      }

      const data = await response.json();
      const newImages: GeneratedImage[] = data.images
        .filter((img: string | null) => img !== null)
        .map((url: string) => ({
          id: crypto.randomUUID(),
          url,
          base64: extractBase64(url),
          refinements: [],
        }));
      setGeneratedImages(newImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate images");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (parentImage: GeneratedImage) => {
    if (!refinementPrompt.trim()) return;

    setRefiningImageId(parentImage.id);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${systemPrompt}\n\nContent to visualize:\n${userContent}\n\nRefinement instructions:\n${refinementPrompt}`,
          referenceImages: [
            ...images.map((img) => ({
              data: img.base64,
              mimeType: img.mimeType,
            })),
            {
              data: parentImage.base64,
              mimeType: "image/png",
            },
          ],
          count: 3,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to refine images");
      }

      const data = await response.json();
      const refinedImages: GeneratedImage[] = data.images
        .filter((img: string | null) => img !== null)
        .map((url: string) => ({
          id: crypto.randomUUID(),
          url,
          base64: extractBase64(url),
          refinements: [],
        }));

      setGeneratedImages((prev) =>
        prev.map((img) =>
          img.id === parentImage.id
            ? { ...img, refinements: [...img.refinements, ...refinedImages] }
            : img
        )
      );
      setRefinementPrompt("");
      setSelectedImageId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine images");
    } finally {
      setRefiningImageId(null);
    }
  };

  const downloadImage = (dataUrl: string, name: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canGenerate = images.length > 0 && !isLoading;

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          Excalidraw Style Generator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate images in Excalidraw style, then iterate and refine your designs.
        </p>
      </div>

      <div className="space-y-6">
        <ImageUploader
          images={images}
          onImagesChange={setImages}
          maxImages={3}
        />

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Content to Visualize
          </label>
          <textarea
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
          className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors duration-200 ${
            canGenerate
              ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating 5 Images...
            </span>
          ) : (
            "Generate 5 Images"
          )}
        </button>

        {/* Generated Images Grid */}
        {generatedImages.length > 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-foreground">
                Generated Images ({generatedImages.length})
              </h2>
              <p className="text-sm text-gray-500">Click an image to select it for refinement</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {generatedImages.map((img, index) => (
                <div
                  key={img.id}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                    selectedImageId === img.id
                      ? "border-blue-500 ring-2 ring-blue-300"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedImageId(selectedImageId === img.id ? null : img.id)}
                >
                  <img
                    src={img.url}
                    alt={`Generated ${index + 1}`}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalImage(img.url);
                    }}
                    className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(img.url, `generated-${index + 1}`);
                    }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {selectedImageId === img.id && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Selected
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Refinement input - full width below grid */}
            {selectedImageId && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={generatedImages.find(img => img.id === selectedImageId)?.url}
                    alt="Selected"
                    className="w-20 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Refine this image
                    </label>
                    <p className="text-xs text-gray-500">Describe what changes you want to make</p>
                  </div>
                </div>
                <textarea
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="What should be changed? e.g., 'Make the colors more vibrant' or 'Add more detail to the background'"
                />
                <button
                  onClick={() => {
                    const img = generatedImages.find(img => img.id === selectedImageId);
                    if (img) handleRefine(img);
                  }}
                  disabled={!refinementPrompt.trim() || refiningImageId !== null}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                    refinementPrompt.trim() && refiningImageId === null
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {refiningImageId ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating 3 Variations...
                    </span>
                  ) : (
                    "Refine → Generate 3 Variations"
                  )}
                </button>
              </div>
            )}

            {/* Refinement results - full width */}
            {generatedImages.some(img => img.refinements.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Refined Variations</h3>
                {generatedImages.filter(img => img.refinements.length > 0).map((img, imgIndex) => (
                  <div key={img.id} className="space-y-2">
                    <p className="text-sm text-gray-500">From image {generatedImages.indexOf(img) + 1}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {img.refinements.map((refined, rIndex) => (
                        <div key={refined.id} className="relative group">
                          <img
                            src={refined.url}
                            alt={`Refined ${rIndex + 1}`}
                            className="w-full aspect-video object-cover rounded-lg cursor-pointer hover:opacity-90 shadow-md"
                            onClick={() => setModalImage(refined.url)}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(refined.url, `refined-${imgIndex + 1}-${rIndex + 1}`);
                            }}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading state for initial generation */}
        {isLoading && generatedImages.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center"
              >
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for viewing images */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={modalImage}
              alt="Generated image"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => downloadImage(modalImage, "excalidraw-style")}
              className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-lg px-4 py-2 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
