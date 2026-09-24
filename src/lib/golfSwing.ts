// A small animation rig, not a ball-flight or biomechanics simulator.
// X/Y are SVG coordinates before GolfScene's mirror; +Z points behind the golfer.
export type GolfPoint = readonly [number, number, number];
const radians = Math.PI / 180;
export const SWING_CONTACT_MS = 900;
export const SWING_FINISH_MS = 1320;
export const SWING_START_MS = 90;
export const SWING_TOP_MS = 630;

export const add = (a: GolfPoint, b: GolfPoint): GolfPoint => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const scale = (a: GolfPoint, n: number): GolfPoint => [a[0] * n, a[1] * n, a[2] * n];
export const dot = (a: GolfPoint, b: GolfPoint) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const unit = (a: GolfPoint): GolfPoint => scale(a, 1 / Math.hypot(...a));
export const mix = (a: GolfPoint, b: GolfPoint, t: number): GolfPoint =>
  add(scale(a, 1 - t), scale(b, t));
const cross = (a: GolfPoint, b: GolfPoint): GolfPoint => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};

// The projected circle is an ellipse: takeaway travels away from the camera,
// rises around the trail shoulder, then returns through the same contact point.
// Calibrate the shared driver's face center (21,15), rather than its hosel
// (34,32), to the ball at (313,375). The head is drawn at .68 scale.
const headSide = 13 * 0.68;
const headLength = 17 * 0.68;
const reach = Math.sqrt(43 * 43 + 135 * 135 - headSide * headSide);
const addressAngle = Math.atan2(135, 43) + Math.atan2(headSide, reach);
const down: GolfPoint = [Math.cos(addressAngle), Math.sin(addressAngle), 0];
const back = unit([-0.6, (0.6 * down[0]) / down[1], 0.777]);
const normal = unit(cross(down, back));
const armRadius = 64;
export const CLUB_RADIUS = reach - armRadius - headLength;
function onPlane(degrees: number): GolfPoint {
  const angle = degrees * radians;
  return add(scale(down, Math.cos(angle)), scale(back, Math.sin(angle)));
}

// Interpolate angles, never the independent screen positions of the hands and tip.
// This keeps the club length fixed and preserves the arc between drawing frames.
function track(time: number, keys: readonly (readonly [number, number])[]): number {
  for (let i = 1; i < keys.length; i += 1) {
    if (time <= keys[i][0]) {
      const [start, from] = keys[i - 1];
      const [end, to] = keys[i];
      const t = clamp((time - start) / (end - start));
      return from + (to - from) * t;
    }
  }
  return keys[keys.length - 1][1];
}

export function sampleGolfSwing(timeMs: number) {
  const time = Math.max(0, Math.min(SWING_FINISH_MS, timeMs));
  const backProgress = smooth((time - SWING_START_MS) / (SWING_TOP_MS - SWING_START_MS));
  const downProgress = clamp((time - SWING_TOP_MS) / (SWING_CONTACT_MS - SWING_TOP_MS));
  // Early delivery retains the wrist set. Release accelerates the club close to impact.
  const angle =
    time <= SWING_TOP_MS
      ? 150 * backProgress
      : track(time, [
          [630, 150],
          [690, 138],
          [750, 108],
          [810, 65],
          [855, 30],
          [900, 0],
          [955, -48],
          [1020, -100],
          [1110, -153],
          [1220, -188],
          [1320, -200],
        ]);
  const hinge =
    time <= SWING_TOP_MS
      ? track(angle, [
          [0, 0],
          [25, 2],
          [70, 48],
          [115, 83],
          [150, 90],
        ])
      : track(time, [
          [630, 90],
          [720, 94],
          [790, 90],
          [835, 70],
          [870, 42],
          [900, 0],
          [955, -14],
          [1020, -48],
          [1320, -80],
        ]);
  const finish = smooth((time - 960) / 360);
  const pivot: GolfPoint = [270 - 14 * finish, 240 - finish, 0];
  const orbitGrip = add(pivot, scale(onPlane(angle), armRadius));
  const grip: GolfPoint = [
    orbitGrip[0] - 5 * finish,
    orbitGrip[1] + 8 * finish,
    orbitGrip[2] * (1 - finish) - 20 * finish,
  ];
  let direction = onPlane(angle + hinge);
  // After extension the elbows fold and the shaft wraps over the lead shoulder.
  // The finish leaves the delivery plane, as a real followthrough does.
  const wrap = smooth((time - 1020) / 300);
  if (wrap > 0) direction = unit(mix(direction, unit([0.96, 0.19, 0.65]), wrap));
  const tip = add(grip, scale(direction, CLUB_RADIUS));
  const rollNormal = unit(add(normal, scale(direction, -dot(normal, direction))));
  // Calibrated roll: at impact the face is square to the camera-facing target.
  // Keep it perpendicular to the shaft as the wrists roll and the finish wraps.
  const face = unit(
    add(scale(rollNormal, -normal[2]), scale(cross(direction, rollNormal), back[2])),
  );
  return {
    time,
    grip,
    tip,
    direction,
    face,
    angle,
    hinge,
    // Hips unwind first, then the rib cage, with the arms/club still completing delivery.
    hips: time < SWING_TOP_MS ? backProgress : 1 - smooth(downProgress / 0.75),
    chest: time < SWING_TOP_MS ? backProgress : 1 - smooth(downProgress / 0.95),
    finish,
  };
}

// Two-bone IK: the elbow bends in depth instead of shortening the arm to hide it.
export function armChain(
  shoulder: GolfPoint,
  grip: GolfPoint,
  trail: boolean,
  finish = 0,
): readonly GolfPoint[] {
  const offset = add(grip, scale(shoulder, -1));
  const distance = Math.hypot(...offset);
  const axis = unit(offset);
  // The near/lead elbow bends toward the camera at address; bending it away
  // made the exposed arm disappear under the torso just below its sleeve.
  // At the finish, fold the lead elbow out beside the chest so the forearm
  // rises next to the face instead of cutting diagonally across it.
  const hanging = smooth((axis[1] - 0.5) / 0.4);
  const bias: GolfPoint = trail
    ? mix([-0.25, 0.7, 1 - 2 * finish], [0.35, 0.15, 1], hanging)
    : mix([0.1, 0.1, -1], [-1, 1, -0.3], finish);
  const bend = unit(add(bias, scale(axis, -dot(bias, axis))));
  const halfLength = trail ? 38 : 41;
  const height = Math.sqrt(Math.max(0, halfLength * halfLength - (distance * distance) / 4));
  return [shoulder, add(mix(shoulder, grip, 0.5), scale(bend, height)), grip];
}
