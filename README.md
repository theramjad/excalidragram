# Excalidraw Style Generator

A Next.js app that uses Google's Gemini AI to generate images in the Excalidraw hand-drawn sketch style. Upload reference images, describe what you want to visualize or simply paste a concept from an article, and generate multiple variations. Then iteratively refine your favorites.

## Features

- **Reference Image Upload** - Upload up to 3 reference images to guide the style (comes with defaults)
- **Batch Generation** - Generates 5 image variations in parallel
- **Iterative Refinement** - Select any generated image and refine it with additional prompts
- **Recursive Refinement Tree** - Keep refining refinements to explore variations
- **Keyboard Navigation** - Use left/right arrow keys to navigate between images in a row
- **Download & Preview** - Download individual images or view them in a full-screen modal

## How It Works

1. **Reference Images**: The app loads default Excalidraw-style reference images, or you can upload your own
2. **System Prompt**: A customizable prompt tells the AI to match the Excalidraw aesthetic
3. **Content Input**: Describe what you want to visualize (paste an article, describe a concept, etc.)
4. **Generation**: The app sends your prompt + reference images to Gemini's image generation model
5. **Refinement**: Click any generated image and provide refinement instructions to create 3 new variations based on that image

## My Workflow

I personally just paste relevant concepts from articles online and speak using my tool [HyperWhisper](hyperwhisper.com), describing what I want. Generate 5 samples, and iterate on the one I like the most.

## Setup

### Prerequisites

- Node.js 18+
- A Google AI Studio API key with access to Gemini image generation

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd excalidraw-style
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

   Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/
│   ├── api/generate/route.ts   # API endpoint for image generation
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main UI with generation & refinement
├── components/
│   ├── ImageUploader.tsx       # Drag-and-drop image upload
│   └── ImageGrid.tsx           # Grid display for generated images
└── lib/
    └── gemini.ts               # Gemini AI client configuration
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **AI**: Google Gemini (`@google/genai`) - `gemini-3-pro-image-preview` model
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript

## Usage Tips

- The default system prompt works well for Excalidraw-style outputs, but you can customize it
- For best results, use clear, descriptive content in the "Content to Visualize" field
- The refinement feature is useful for iterating on promising results
- Use arrow keys to quickly compare images in a row
