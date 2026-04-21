import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

let landmarker: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

async function createLandmarker(delegate: "GPU" | "CPU") {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      landmarker = await createLandmarker("GPU");
    } catch (gpuError) {
      console.warn("MediaPipe GPU non disponibile, uso CPU", gpuError);
      landmarker = await createLandmarker("CPU");
    }
    return landmarker;
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

export type { PoseLandmarkerResult };

// Landmark indexes (MediaPipe Pose)
export const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
} as const;
