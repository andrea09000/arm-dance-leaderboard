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

const visibleEnough = (point?: Landmark) => Boolean(point) && confidence(point) >= 0.18;

function armRaiseScore(wrist: Landmark, elbow: Landmark, shoulder: Landmark, threshold: number) {
  const wristAboveShoulder = shoulder.y - wrist.y;
  const elbowAboveShoulder = shoulder.y - elbow.y;
  const wristAboveElbow = elbow.y - wrist.y;

  return (
    wristAboveShoulder +
    Math.max(0, elbowAboveShoulder) * 0.75 +
    Math.max(0, wristAboveElbow) * 0.35 -
    threshold
  );
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
  const adaptiveThreshold = clamp(shoulderWidth * 0.14, 0.012, 0.04);
  const minScore = adaptiveThreshold * 0.65;
  const separation = adaptiveThreshold * 0.35;

  const leftScore = armRaiseScore(leftWrist, leftElbow, leftShoulder, adaptiveThreshold);
  const rightScore = armRaiseScore(rightWrist, rightElbow, rightShoulder, adaptiveThreshold);
  const leftUp = leftScore > minScore;
  const rightUp = rightScore > minScore;

  if (leftUp && !rightUp) return "L_UP";
  if (rightUp && !leftUp) return "R_UP";

  if (leftUp && rightUp) {
    if (leftScore > rightScore + separation) return "L_UP";
    if (rightScore > leftScore + separation) return "R_UP";
    return previous;
  }

  return "NONE";
}
