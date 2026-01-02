"use client";

interface ImageGridProps {
  images: (string | null)[];
  isLoading: boolean;
}

export default function ImageGrid({ images, isLoading }: ImageGridProps) {
  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `generated-image-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <h2 className="text-lg font-medium mb-4 text-foreground">
          Generating Images...
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center"
            >
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const validImages = images.filter((img): img is string => img !== null);

  if (validImages.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-lg font-medium mb-4 text-foreground">
        Generated Images ({validImages.length})
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {images.map((img, index) => (
          <div key={index} className="relative group">
            {img ? (
              <>
                <img
                  src={img}
                  alt={`Generated ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg shadow-md"
                />
                <button
                  onClick={() => downloadImage(img, index)}
                  className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </button>
              </>
            ) : (
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-sm text-gray-400">Failed</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
