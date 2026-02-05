import { useEffect, useMemo, useState } from "react";

export type NormalizedRect = { x: number; y: number; width: number; height: number };

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; faceBox: NormalizedRect; confidence: number }
  | { status: "error"; message: string };

let faceLandmarkerPromise: Promise<any> | null = null;

async function getFaceLandmarker(): Promise<any> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      return FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    })();
  }

  return faceLandmarkerPromise;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Detecta landmarks (1 face) em uma imagem estática e retorna uma bounding box normalizada (0-1) para mapear
 * coordenadas face-relativas (0-1) → coordenadas da imagem.
 */
export function useFaceLandmarksOnImage(imageEl: HTMLImageElement | null) {
  const [state, setState] = useState<DetectionState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!imageEl) return;
      if (!imageEl.complete || !imageEl.naturalWidth || !imageEl.naturalHeight) return;

      setState({ status: "loading" });

      try {
        const landmarker = await getFaceLandmarker();
        const result = landmarker.detect(imageEl);
        const landmarks = result?.faceLandmarks?.[0];

        if (!landmarks || landmarks.length < 100) {
          throw new Error("Nenhuma face detectada na foto");
        }

        // Bounding box robusta: usa todos os landmarks para contorno (inclui testa/queixo/maçãs) e evita depender do background.
        let xMin = 1,
          yMin = 1,
          xMax = 0,
          yMax = 0;

        for (const lm of landmarks) {
          xMin = Math.min(xMin, lm.x);
          yMin = Math.min(yMin, lm.y);
          xMax = Math.max(xMax, lm.x);
          yMax = Math.max(yMax, lm.y);
        }

        // Pequena margem para aproximar “hairline → chin” e laterais (sem extrapolar demais)
        const padX = (xMax - xMin) * 0.06;
        const padY = (yMax - yMin) * 0.08;

        const faceBox: NormalizedRect = {
          x: clamp01(xMin - padX),
          y: clamp01(yMin - padY),
          width: clamp01(xMax - xMin + padX * 2),
          height: clamp01(yMax - yMin + padY * 2),
        };

        // “Confiança” aqui é heurística: quanto maior a área ocupada, mais estável tende a ser.
        const confidence = clamp01((faceBox.width * faceBox.height) / 0.45);

        if (!cancelled) setState({ status: "ready", faceBox, confidence });
      } catch (e: any) {
        if (!cancelled) setState({ status: "error", message: e?.message || "Falha ao detectar face" });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [imageEl]);

  return useMemo(() => {
    return {
      status: state.status,
      faceBox: state.status === "ready" ? state.faceBox : null,
      confidence: state.status === "ready" ? state.confidence : null,
      error: state.status === "error" ? state.message : null,
      isLoading: state.status === "loading",
    };
  }, [state]);
}
