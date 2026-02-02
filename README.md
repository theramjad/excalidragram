# Excalidraw Style Generator

A Next.js app that uses Google's Gemini AI to generate images in the Excalidraw hand-drawn sketch style. Upload reference images, describe what you want to visualize or simply paste a concept from an article, and generate multiple variations. Then iteratively refine your favorites.

## Features

- **Reference Image Upload** - Upload up to 3 reference images to guide the style (comes with defaults)
- **Batch Generation** - Generate 4-10 image variations in parallel
- **Iterative Refinement** - Select any generated image and refine it with additional prompts
- **Recursive Refinement Tree** - Keep refining refinements to explore variations
- **Keyboard Navigation** - Use left/right arrow keys to navigate between images in a row
- **Download & Preview** - Download individual images or view them in a full-screen modal

## Quick Start

### 1. Get a Gemini API Key

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey) (free tier available).

### 2. Install & Run

```bash
git clone <repo-url>
cd excalidraw-style
npm install
npm run dev
```

### 3. Configure

Open [http://localhost:3000](http://localhost:3000) and enter your Gemini API key in the app's configuration panel. The key is stored locally in your browser.

> **Note**: You can optionally create a `.env.local` file with `GEMINI_API_KEY=your_key_here`, but the app primarily uses the key entered through the UI.

## Usage

### Basic Workflow

1. **Reference Images**: The app loads default Excalidraw-style reference images, or upload your own (up to 3)
2. **System Prompt**: Customize the prompt that guides the AI's style (default works well)
3. **Content Input**: Describe what you want to visualize - paste an article excerpt, describe a concept, etc.
4. **Generate**: Click "Generate Images" to create 4-10 variations
5. **Refine**: Click any generated image and provide refinement instructions to create 3 new variations

### Image Size Recommendation

**Use 2K resolution for best results.** The 4K setting tends to produce random artifacts more frequently. The app defaults to 2K (2560x1440) with a 16:9 aspect ratio.

### Keyboard Shortcuts

- **← / →** Arrow keys to navigate between images in a row
- **Escape** to close the full-screen preview modal

### Tips

- For best results, use clear, descriptive content in the "Content to Visualize" field
- The refinement feature is great for iterating on promising results
- You can refine refinements recursively to explore variations
- Total request size is capped at 50MB - use fewer/smaller reference images if you hit this limit

## My Workflow

I personally just paste relevant concepts from articles online and speak using my tool [HyperWhisper](https://hyperwhisper.com), describing what I want. Generate 5 samples, and iterate on the one I like the most.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **AI**: Google Gemini (`@google/genai`) - `gemini-3-pro-image-preview` model
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript

## Project Structure

```
src/
├── app/
│   ├── api/generate/route.ts   # API endpoint for image generation
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main UI with generation & refinement
│   └── globals.css             # Global styles
├── components/
│   ├── ImageUploader.tsx       # Drag-and-drop image upload
│   └── ImageGrid.tsx           # Grid display for generated images
└── hooks/
    └── useApiKey.ts            # API key management
```

## Scripts

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm start      # Run production server
npm run lint   # Run ESLint
```
