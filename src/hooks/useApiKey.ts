"use client";

import { useState, useEffect, useCallback } from "react";

const API_KEY_STORAGE_KEY = "gemini-api-key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored) {
        setApiKeyState(stored);
      }
      setIsLoaded(true);
    }
  }, []);

  const setApiKey = useCallback((key: string) => {
    if (typeof window !== "undefined") {
      if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
      setApiKeyState(key);
    }
  }, []);

  const clearApiKey = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      setApiKeyState("");
    }
  }, []);

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    isLoaded,
    hasApiKey: Boolean(apiKey),
  };
}
