export type ArmState = "L_UP" | "R_UP" | "NONE";

type Landmark = {
  x: number;
  y: number;
  visibility?: number;
  presence?: number;
};

type PoseLandmarks = Landmark[];

const POSE = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const distance = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const confidence = (point?: Landmark) =>
  Math.min(point?.visibility ?? 1, point?.presence ?? 1);

const visibleEnough = (point?: Landmark) => Boolean(point) && confidence(point) >= 0.12;

function armRaiseScore(wrist: Landmark, elbow: Landmark, shoulder: Landmark) {
  // Positive when the wrist is raised. We blend three signals:
  // - wrist above shoulder (classic "up")
  // - wrist above elbow (forearm pointing up)
  // - elbow above shoulder (whole arm lifted)
  const wristAboveShoulder = shoulder.y - wrist.y;
  const wristAboveElbow = elbow.y - wrist.y;
  const elbowAboveShoulder = shoulder.y - elbow.y;
  return wristAboveShoulder * 0.6 + wristAboveElbow * 0.8 + elbowAboveShoulder * 0.4;
}

export function getSixSevenArmState(
  points: PoseLandmarks,
  previous: ArmState,
): ArmState {
  const leftShoulder = points[POSE.LEFT_SHOULDER];
  const rightShoulder = points[POSE.RIGHT_SHOULDER];
  const leftElbow = points[POSE.LEFT_ELBOW];
  const rightElbow = points[POSE.RIGHT_ELBOW];
  const leftWrist = points[POSE.LEFT_WRIST];
  const rightWrist = points[POSE.RIGHT_WRIST];

  if (
    !visibleEnough(leftShoulder) ||
    !visibleEnough(rightShoulder) ||
    !visibleEnough(leftElbow) ||
    !visibleEnough(rightElbow) ||
    !visibleEnough(leftWrist) ||
    !visibleEnough(rightWrist)
  ) {
    return "NONE";
  }

  const shoulderWidth = distance(leftShoulder, rightShoulder);
  // Adaptive activation: smaller person (further away) -> smaller threshold.
  const upThreshold = clamp(shoulderWidth * 0.05, 0.005, 0.025);
  // Hysteresis: once "UP", allow it to stay UP with a slightly lower threshold.
  // This reduces flicker (UP <-> NONE) at high speed.
  const downThreshold = upThreshold * 0.6;

  const leftScore = armRaiseScore(leftWrist, leftElbow, leftShoulder);
  const rightScore = armRaiseScore(rightWrist, rightElbow, rightShoulder);
  const leftUp =
    leftScore > upThreshold || (previous === "L_UP" && leftScore > downThreshold);
  const rightUp =
    rightScore > upThreshold || (previous === "R_UP" && rightScore > downThreshold);

  if (leftUp && !rightUp) return "L_UP";
  if (rightUp && !leftUp) return "R_UP";
  if (leftUp && rightUp) {
    // Both up: pick the higher one, otherwise keep previous to avoid flicker.
    if (Math.abs(leftScore - rightScore) < upThreshold * 0.4) return previous;
    return leftScore > rightScore ? "L_UP" : "R_UP";
  }
  return "NONE";
}
