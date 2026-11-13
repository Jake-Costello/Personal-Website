import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// One construction profile for the existing side panels and their continuous PVC edging.
export function createCabinetProfile() {
  const shape = new THREE.Shape();
  const points = [
    [-0.6, 0.08],
    [0.5, 0.08],
    [0.53, 1.05],
    [0.82, 1.24],
    [0.81, 1.43],
    [0.53, 1.61],
    [0.38, 2.62],
    [0.58, 2.67],
    [0.58, 3.05],
    [-0.6, 3.05],
  ];
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  return shape;
}

export function refinedLaminateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(128, 128);
  let seed = 19;
  for (let i = 0; i < pixels.data.length; i += 4) {
    // Use the high bits: low-bit LCG coordinates produce visible repeating stripes.
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 241 + (seed >>> 28);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 5);
  return texture;
}

function canvasMap(width: number, height: number, paint: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function perimeterGeometry() {
  const points = createCabinetProfile()
    .getPoints(1)
    .slice(0, -1)
    .map((p) => new THREE.Vector3(0, p.y, p.x));
  const path = new THREE.CurvePath<THREE.Vector3>();
  const corners = points.map((p, i) => {
    const prev = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const radius = Math.min(0.035, p.distanceTo(prev) / 4, p.distanceTo(next) / 4);
    return {
      p,
      before: p.clone().add(prev.clone().sub(p).normalize().multiplyScalar(radius)),
      after: p.clone().add(next.clone().sub(p).normalize().multiplyScalar(radius)),
    };
  });
  corners.forEach((c, i) => {
    const prev = corners[(i + corners.length - 1) % corners.length];
    path.add(new THREE.LineCurve3(prev.after, c.before));
    path.add(new THREE.QuadraticBezierCurve3(c.before, c.p, c.after));
  });
  return new THREE.TubeGeometry(path, 112, 0.011, 6, true);
}

function coinDoorFrame() {
  // A real aperture keeps the face behind its bevel rather than floating over a solid block.
  const frame = new THREE.Shape();
  frame.moveTo(-0.235, -0.31);
  frame.lineTo(0.235, -0.31);
  frame.lineTo(0.235, 0.31);
  frame.lineTo(-0.235, 0.31);
  frame.closePath();
  const opening = new THREE.Path();
  opening.moveTo(-0.2125, -0.2875);
  opening.lineTo(-0.2125, 0.2875);
  opening.lineTo(0.2125, 0.2875);
  opening.lineTo(0.2125, -0.2875);
  opening.closePath();
  frame.holes.push(opening);
  return new THREE.ExtrudeGeometry(frame, {
    depth: 0.016,
    bevelEnabled: true,
    bevelSize: 0.003,
    bevelThickness: 0.002,
    bevelSegments: 2,
    steps: 1,
  });
}

export default function ResumeCabinetFinish({
  tone = 'shoreline',
}: {
  tone?: 'shoreline' | 'warehouse' | 'deckbuilder';
}) {
  const r = useMemo(() => {
    const doorMap = canvasMap(256, 384, (c) => {
      c.fillStyle = '#22292b';
      c.fillRect(0, 0, 256, 384);
      c.strokeStyle = '#4b5252';
      c.lineWidth = 2;
      c.strokeRect(4, 4, 248, 376);
      c.fillStyle = '#abb5ad';
      c.textAlign = 'center';
      c.font = '12px monospace';
      c.fillText('COIN ENTRY', 128, 36);
      c.font = '10px monospace';
      c.fillStyle = '#81908d';

      for (const x of [13, 243])
        for (const y of [13, 371]) {
          c.fillStyle = '#788181';
          c.beginPath();
          c.arc(x, y, 3, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#151b1c';
          c.fillRect(x - 2, y - 0.5, 4, 1);
        }
    });
    const grilleMap = canvasMap(256, 256, (c) => {
      c.fillStyle = '#242e31';
      c.fillRect(0, 0, 256, 256);
      for (let y = 14; y < 246; y += 10)
        for (let x = 14 + (y % 20 ? 0 : 5); x < 246; x += 10) {
          c.fillStyle = '#455154';
          c.beginPath();
          c.arc(x, y + 1, 3.5, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#080f12';
          c.beginPath();
          c.arc(x, y, 2.6, 0, Math.PI * 2);
          c.fill();
        }
      c.strokeStyle = '#0a1418';
      c.lineWidth = 7;
      c.strokeRect(3, 3, 250, 250);
    });
    const badgeMap = canvasMap(256, 64, (c) => {
      c.fillStyle = '#738482';
      c.fillRect(0, 0, 256, 64);
      c.fillStyle = '#182a30';
      c.font = 'bold 20px Arial';
      c.textAlign = 'center';
      c.fillText('JC', 128, 37);
      c.font = '10px monospace';
    });
    return {
      trim: perimeterGeometry(),
      doorFrame: coinDoorFrame(),
      box: new RoundedBoxGeometry(1, 1, 1, 2, 0.018),
      plane: new THREE.PlaneGeometry(1, 1),
      lock: new THREE.CylinderGeometry(0.018, 0.018, 0.009, 12),
      pvc: new THREE.MeshStandardMaterial({
        color: tone === 'warehouse' ? '#564b3c' : tone === 'deckbuilder' ? '#51445f' : '#35464a',
        roughness: 0.48,
        metalness: 0,
      }),
      shadow: new THREE.MeshStandardMaterial({ color: '#081116', roughness: 0.7, metalness: 0 }),
      steel: new THREE.MeshStandardMaterial({ color: '#7b8988', roughness: 0.4, metalness: 0.85 }),
      door: new THREE.MeshStandardMaterial({ map: doorMap, roughness: 0.58, metalness: 0.22 }),
      grille: new THREE.MeshStandardMaterial({ map: grilleMap, roughness: 0.72, metalness: 0.1 }),
      badge: new THREE.MeshStandardMaterial({ map: badgeMap, roughness: 0.42, metalness: 0.65 }),
      amber: new THREE.MeshStandardMaterial({
        color: '#c69352',
        emissive: '#b27632',
        emissiveIntensity: 0.14,
        roughness: 0.35,
      }),
      doorMap,
      grilleMap,
      badgeMap,
    };
  }, [tone]);
  useEffect(
    () => () => {
      Object.values(r).forEach((value) => value.dispose());
    },
    [r],
  );
  const panel = (
    key: string,
    position: [number, number, number],
    scale: [number, number, number],
    material: THREE.Material,
  ) => (
    <mesh
      key={key}
      geometry={r.box}
      material={material}
      position={position}
      scale={scale}
      receiveShadow
    />
  );
  return (
    <group name="resume-cabinet-finish">
      {[-0.781, 0.781].map((x) => (
        <mesh key={x} geometry={r.trim} material={r.pvc} position={[x, 0, 0]} />
      ))}
      <mesh geometry={r.doorFrame} material={r.pvc} position={[-0.27, 0.72, 0.565]} receiveShadow />
      <mesh
        geometry={r.plane}
        material={r.door}
        position={[-0.27, 0.72, 0.569]}
        scale={[0.425, 0.575, 1]}
        receiveShadow
      />
      {panel('coin-bezel', [-0.27, 0.9, 0.582], [0.19, 0.06, 0.018], r.steel)}
      {panel('coin-slot', [-0.27, 0.901, 0.593], [0.13, 0.008, 0.005], r.shadow)}
      {panel('reject-light', [-0.27, 0.792, 0.585], [0.085, 0.07, 0.018], r.amber)}
      {panel('return-recess', [-0.27, 0.581, 0.582], [0.19, 0.1, 0.015], r.shadow)}
      {panel('return-lip', [-0.27, 0.537, 0.6], [0.192, 0.018, 0.044], r.steel)}
      <mesh
        geometry={r.lock}
        material={r.steel}
        position={[-0.115, 0.743, 0.58]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      {panel('speaker-recess', [0.31, 0.82, 0.549], [0.42, 0.43, 0.015], r.shadow)}
      <mesh
        geometry={r.plane}
        material={r.grille}
        position={[0.31, 0.82, 0.559]}
        scale={[0.38, 0.39, 1]}
        receiveShadow
      />
      <mesh
        geometry={r.plane}
        material={r.badge}
        position={[0.31, 0.36, 0.548]}
        scale={[0.37, 0.0925, 1]}
      />
      {panel('kick-strip', [0, 0.19, 0.543], [1.35, 0.07, 0.012], r.shadow)}
    </group>
  );
}
