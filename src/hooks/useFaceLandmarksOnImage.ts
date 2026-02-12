import { useEffect, useMemo, useState } from "react";

export type NormalizedRect = { x: number; y: number; width: number; height: number };

/**
 * Key anatomical anchors extracted from MediaPipe landmarks.
 * All values are normalized 0-1 relative to the IMAGE (not face box).
 * Used for proportional anatomical mapping instead of simple bounding box interpolation.
 */
export interface FaceAnchors {
  forehead: { x: number; y: number };      // Landmark 10
  leftEyeOuter: { x: number; y: number };  // Landmark 33
  rightEyeOuter: { x: number; y: number }; // Landmark 263
  leftEyeInner: { x: number; y: number };  // Landmark 133
  rightEyeInner: { x: number; y: number }; // Landmark 362
  noseTip: { x: number; y: number };        // Landmark 1
  noseTop: { x: number; y: number };        // Landmark 6
  leftLipCorner: { x: number; y: number };  // Landmark 61
  rightLipCorner: { x: number; y: number }; // Landmark 291
  upperLip: { x: number; y: number };       // Landmark 13
  chin: { x: number; y: number };           // Landmark 152
  leftCheek: { x: number; y: number };      // Landmark 234
  rightCheek: { x: number; y: number };     // Landmark 454
}

export interface FaceDetectionData {
  faceBox: NormalizedRect;
  anchors: FaceAnchors;
}

type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: FaceDetectionData; confidence: number }
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

// Key MediaPipe landmark indices
const LM = {
  forehead: 10,
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftEyeInner: 133,
  rightEyeInner: 362,
  noseTip: 1,
  noseTop: 6,
  leftLipCorner: 61,
  rightLipCorner: 291,
  upperLip: 13,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
};

function extractAnchors(landmarks: any[]): FaceAnchors {
  const get = (idx: number) => ({ x: landmarks[idx].x, y: landmarks[idx].y });
  return {
    forehead: get(LM.forehead),
    leftEyeOuter: get(LM.leftEyeOuter),
    rightEyeOuter: get(LM.rightEyeOuter),
    leftEyeInner: get(LM.leftEyeInner),
    rightEyeInner: get(LM.rightEyeInner),
    noseTip: get(LM.noseTip),
    noseTop: get(LM.noseTop),
    leftLipCorner: get(LM.leftLipCorner),
    rightLipCorner: get(LM.rightLipCorner),
    upperLip: get(LM.upperLip),
    chin: get(LM.chin),
    leftCheek: get(LM.leftCheek),
    rightCheek: get(LM.rightCheek),
  };
}

/** Detect face bounding box AND key anatomical anchors from an HTMLImageElement. */
export async function detectFaceBox(imageEl: HTMLImageElement): Promise<NormalizedRect | null> {
  const data = await detectFaceData(imageEl);
  return data?.faceBox ?? null;
}

/** Full detection: bounding box + anatomical anchors. */
export async function detectFaceData(imageEl: HTMLImageElement): Promise<FaceDetectionData | null> {
  const landmarker = await getFaceLandmarker();
  const result = landmarker.detect(imageEl);
  const landmarks = result?.faceLandmarks?.[0];

  if (!landmarks || landmarks.length < 100) return null;

  let xMin = 1, yMin = 1, xMax = 0, yMax = 0;
  for (const lm of landmarks) {
    xMin = Math.min(xMin, lm.x);
    yMin = Math.min(yMin, lm.y);
    xMax = Math.max(xMax, lm.x);
    yMax = Math.max(yMax, lm.y);
  }

  const padX = (xMax - xMin) * 0.06;
  const padY = (yMax - yMin) * 0.08;

  const faceBox: NormalizedRect = {
    x: clamp01(xMin - padX),
    y: clamp01(yMin - padY),
    width: clamp01(xMax - xMin + padX * 2),
    height: clamp01(yMax - yMin + padY * 2),
  };

  const anchors = extractAnchors(landmarks);

  return { faceBox, anchors };
}

/**
 * Detecta landmarks (1 face) em uma imagem estática e retorna uma bounding box normalizada (0-1).
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
        const data = await detectFaceData(imageEl);
        if (!data) throw new Error("Nenhuma face detectada na foto");

        const confidence = clamp01((data.faceBox.width * data.faceBox.height) / 0.45);
        if (!cancelled) setState({ status: "ready", data, confidence });
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
      faceBox: state.status === "ready" ? state.data.faceBox : null,
      anchors: state.status === "ready" ? state.data.anchors : null,
      confidence: state.status === "ready" ? state.confidence : null,
      error: state.status === "error" ? state.message : null,
      isLoading: state.status === "loading",
    };
  }, [state]);
}
