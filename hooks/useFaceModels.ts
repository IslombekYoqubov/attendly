"use client";

import { useEffect, useState } from "react";
import { loadFaceModels } from "@/lib/face/modelLoader";

export function useFaceModels() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFaceModels()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the face recognition models. Check your connection and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
