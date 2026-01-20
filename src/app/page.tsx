"use client";

import { useState, useEffect } from "react";
import ImageUploader from "@/components/ImageUploader";
import { useApiKey } from "@/hooks/useApiKey";

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

const DEFAULT_SYSTEM_PROMPT = `Generate an explanation image in the style of the reference images. This is for generating visual explanations that explain concepts clearly. Use a white background. Capture the visual aesthetic, color palette, artistic techniques, and overall mood of the references. When depicting people or avatars, prefer using humanoid robots. Explain the concept in a similar style to the reference images, using diagrams, annotations, and illustrations as needed.`;

const DEFAULT_IMAGES = ["reference1.png", "reference2.png", "reference3.png", "reference4.png"];

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

function findImageById(images: GeneratedImage[], id: string): GeneratedImage | null {
  for (const img of images) {
    if (img.id === id) return img;
    const found = findImageById(img.refinements, id);
    if (found) return found;
  }
  return null;
}

function addRefinementsToImage(
  images: GeneratedImage[],
  targetId: string,
  newRefinements: GeneratedImage[]
): GeneratedImage[] {
  return images.map((img) => {
    if (img.id === targetId) {
      return { ...img, refinements: [...img.refinements, ...newRefinements] };
    }
    return {
      ...img,
      refinements: addRefinementsToImage(img.refinements, targetId, newRefinements),
    };
  });
}

// Find siblings of a selected image (images in the same row/group)
function findSiblings(images: GeneratedImage[], targetId: string): GeneratedImage[] | null {
  // Check top-level images
  if (images.some(img => img.id === targetId)) {
    return images;
  }
  // Check refinements recursively
  for (const img of images) {
    if (img.refinements.some(r => r.id === targetId)) {
      return img.refinements;
    }
    const found = findSiblings(img.refinements, targetId);
    if (found) return found;
  }
  return null;
}

function RefinementTree({
  parentLabel,
  refinements,
  depth,
  selectedImageId,
  onSelect,
  onPreview,
  onDownload,
  refinementPrompt,
  onRefinementPromptChange,
  onRefine,
  refiningImageId,
}: {
  parentLabel: string;
  refinements: GeneratedImage[];
  depth: number;
  selectedImageId: string | null;
  onSelect: (id: string | null) => void;
  onPreview: (url: string) => void;
  onDownload: (url: string, name: string) => void;
  refinementPrompt: string;
  onRefinementPromptChange: (value: string) => void;
  onRefine: (img: GeneratedImage) => void;
  refiningImageId: string | null;
}) {
  const selectedInThisRow = refinements.find(r => r.id === selectedImageId);

  return (
    <div className={`space-y-3 ${depth > 0 ? "ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700" : ""}`}>
      <p className="text-sm text-gray-500">
        From {parentLabel} {depth > 0 && <span className="text-xs text-blue-500">(depth {depth})</span>}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {refinements.map((refined, rIndex) => (
          <div
            key={refined.id}
            className={`relative group cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
              selectedImageId === refined.id
                ? "border-blue-500 ring-2 ring-blue-300"
                : "border-transparent hover:border-gray-300"
            }`}
            onClick={() => onSelect(selectedImageId === refined.id ? null : refined.id)}
          >
            <img
              src={refined.url}
              alt={`Refined ${rIndex + 1}`}
              className="w-full aspect-video object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(refined.url);
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
                onDownload(refined.url, `refined-depth${depth}-${rIndex + 1}`);
              }}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            {selectedImageId === refined.id && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                Selected
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Refinement panel for this row */}
      {selectedInThisRow && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={selectedInThisRow.url}
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
            onChange={(e) => onRefinementPromptChange(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="What should be changed? e.g., 'Make the colors more vibrant' or 'Add more detail to the background'"
          />
          <button
            onClick={() => onRefine(selectedInThisRow)}
            disabled={!refinementPrompt.trim() || refiningImageId !== null}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              refinementPrompt.trim() && refiningImageId === null
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {refiningImageId === selectedInThisRow.id ? (
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

      {/* Recursively render child refinements */}
      {refinements.filter(r => r.refinements.length > 0).map((refined, idx) => (
        <RefinementTree
          key={refined.id}
          parentLabel={`Refinement ${idx + 1}`}
          refinements={refined.refinements}
          depth={depth + 1}
          selectedImageId={selectedImageId}
          onSelect={onSelect}
          onPreview={onPreview}
          onDownload={onDownload}
          refinementPrompt={refinementPrompt}
          onRefinementPromptChange={onRefinementPromptChange}
          onRefine={onRefine}
          refiningImageId={refiningImageId}
        />
      ))}
    </div>
  );
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
  const [imageCount, setImageCount] = useState(5);

  // API key management
  const { apiKey, setApiKey, clearApiKey, isLoaded, hasApiKey } = useApiKey();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeyExpanded, setIsApiKeyExpanded] = useState(false);

  // Sync apiKeyInput with stored apiKey when loaded
  useEffect(() => {
    if (isLoaded && apiKey) {
      setApiKeyInput(apiKey);
    }
  }, [isLoaded, apiKey]);

  // Auto-expand API key section if no key is set
  useEffect(() => {
    if (isLoaded && !hasApiKey) {
      setIsApiKeyExpanded(true);
    }
  }, [isLoaded, hasApiKey]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setIsApiKeyExpanded(false);
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setApiKeyInput("");
    setIsApiKeyExpanded(true);
  };

  useEffect(() => {
    async function loadDefaults() {
      const loaded = await Promise.all(DEFAULT_IMAGES.map(loadDefaultImage));
      const valid = loaded.filter((img): img is UploadedImage => img !== null);
      setImages(valid);
      setIsLoadingDefaults(false);
    }
    loadDefaults();
  }, []);

  // Keyboard navigation for left/right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImageId || modalImage) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const siblings = findSiblings(generatedImages, selectedImageId);
      if (!siblings) return;

      const currentIndex = siblings.findIndex(img => img.id === selectedImageId);
      if (currentIndex === -1) return;

      let newIndex: number;
      if (e.key === "ArrowLeft") {
        newIndex = currentIndex > 0 ? currentIndex - 1 : siblings.length - 1;
      } else {
        newIndex = currentIndex < siblings.length - 1 ? currentIndex + 1 : 0;
      }

      setSelectedImageId(siblings[newIndex].id);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageId, generatedImages, modalImage]);

  const handleGenerate = async () => {
    if (!hasApiKey) {
      setError("Please enter your Gemini API key first");
      setIsApiKeyExpanded(true);
      return;
    }

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
          count: imageCount,
          apiKey: apiKey,
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

    if (!hasApiKey) {
      setError("Please enter your Gemini API key first");
      setIsApiKeyExpanded(true);
      return;
    }

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
          apiKey: apiKey,
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
        addRefinementsToImage(prev, parentImage.id, refinedImages)
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

      {/* API Key Configuration */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsApiKeyExpanded(!isApiKeyExpanded)}
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="font-medium text-foreground">Gemini API Key</span>
            {hasApiKey ? (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                Configured
              </span>
            ) : (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full">
                Required
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isApiKeyExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isApiKeyExpanded && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your Gemini API key..."
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showApiKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  apiKeyInput.trim()
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                }`}
              >
                Save
              </button>
              {hasApiKey && (
                <button
                  onClick={handleClearApiKey}
                  className="px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Get your API key from{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
              . Your key is stored locally in your browser and never sent to our servers.
            </p>
          </div>
        )}
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

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Number of Images
            </label>
            <select
              value={imageCount}
              onChange={(e) => setImageCount(Number(e.target.value))}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} images
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`flex-[3] py-3 px-6 rounded-lg font-medium text-white transition-colors duration-200 ${
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
                Generating {imageCount} Images...
              </span>
            ) : (
              `Generate ${imageCount} Images`
            )}
          </button>
        </div>

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

            {/* Refinement input - only for top-level images */}
            {selectedImageId && generatedImages.some(img => img.id === selectedImageId) && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={findImageById(generatedImages, selectedImageId!)?.url}
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
                    const img = findImageById(generatedImages, selectedImageId!);
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

            {/* Refinement results - recursive tree */}
            {generatedImages.some(img => img.refinements.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Refined Variations</h3>
                <p className="text-sm text-gray-500">Click any image to select it for further refinement</p>
                {generatedImages.filter(img => img.refinements.length > 0).map((img) => (
                  <RefinementTree
                    key={img.id}
                    parentLabel={`Image ${generatedImages.indexOf(img) + 1}`}
                    refinements={img.refinements}
                    depth={0}
                    selectedImageId={selectedImageId}
                    onSelect={setSelectedImageId}
                    onPreview={setModalImage}
                    onDownload={downloadImage}
                    refinementPrompt={refinementPrompt}
                    onRefinementPromptChange={setRefinementPrompt}
                    onRefine={handleRefine}
                    refiningImageId={refiningImageId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading state for initial generation */}
        {isLoading && generatedImages.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: imageCount }).map((_, i) => (
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
