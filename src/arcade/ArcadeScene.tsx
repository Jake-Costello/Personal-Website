import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { arcadeProjects } from './projects';
import type { ArcadeProject } from './projects';
import type { ArcadeInput } from './input';

type SceneProps = {
  selected: number;
  playing: boolean;
  controlsEnabled?: boolean;
  reduced: boolean;
  input: ArcadeInput;
  screenRef: RefObject<HTMLDivElement | null>;
  machineRefs: RefObject<(HTMLButtonElement | null)[]>;
  onSelect: (index: number) => void;
  onReady: () => void;
  onFailure: () => void;
};

const SCREEN = {
  width: 1.32,
  height: 1.32 / 1.6,
  y: 2.12,
  z: 0.47,
  tilt: THREE.MathUtils.degToRad(-8),
};
const DECK = { y: 1.43, z: 0.62, tilt: THREE.MathUtils.degToRad(8) };

function switchTexture(label: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#10252c';
  c.font = 'bold 82px Arial';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, 256, 85, 460);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function controlTexture(label: string, key: string, arrows: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#10252c';
  c.textAlign = 'center';
  if (arrows) {
    c.font = 'bold 138px Arial';
    c.fillText(key, 128, 151);
    c.font = 'bold 34px Arial';
    c.fillText(label.toUpperCase(), 128, 219, 225);
  } else {
    c.font = 'bold 43px Arial';
    c.fillText(label.toUpperCase(), 128, 133, 222);
    c.font = '25px monospace';
    c.fillText(key.toUpperCase(), 128, 176, 206);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rounded(width: number, height: number, depth: number, radius = 0.025) {
  return new RoundedBoxGeometry(width, height, depth, 3, radius);
}

function labelTexture(title: string, subtitle: string, accent: string, dark = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = dark ? '#10191d' : accent;
  c.fillRect(0, 0, 1024, 256);
  c.strokeStyle = dark ? accent : '#19252a';
  c.lineWidth = 3;
  c.strokeRect(17, 17, 990, 222);
  c.fillStyle = dark ? accent : '#122028';
  c.font = 'bold 91px Arial';
  c.textAlign = 'center';
  c.fillText(title, 512, 145, 930);
  c.font = '20px monospace';
  c.fillText(subtitle, 512, 207);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function surfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#969696';
  c.fillRect(0, 0, 256, 256);
  // Repeatable fine-grain laminate; no external texture or model downloads.
  let seed = 19;
  for (let i = 0; i < 16000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 256;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 256;
    const shade = 110 + (seed % 75);
    c.fillStyle = `rgb(${shade},${shade},${shade})`;
    c.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 5);
  return t;
}

function sideTexture(project: ArcadeProject) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const c = canvas.getContext('2d')!;
  c.fillStyle = project.cabinetColor;
  c.fillRect(0, 0, 512, 1024);
  c.strokeStyle = project.accent;
  c.lineWidth = 15;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(-30, 660 + i * 65);
    c.bezierCurveTo(210, 480 + i * 65, 240, 720 + i * 65, 550, 220 + i * 65);
    c.stroke();
  }
  c.fillStyle = project.accent;
  c.font = 'bold 160px Arial';
  c.fillText(project.number, 44, 209);
  c.fillStyle = '#e1e7da';
  c.font = '18px monospace';
  c.fillText('PLAY / MAKE / REPEAT', 45, 910);
  c.font = 'bold 32px Arial';
  c.fillText('JC EXPERIMENTS', 45, 957);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function attractTexture(project: ArcadeProject) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 600;
  const c = canvas.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(
    0,
    project.id === 'sketch' ? '#a7c4ae' : project.id === 'shoreline' ? '#9ec1be' : '#1a303b',
  );
  sky.addColorStop(1, '#10262c');
  c.fillStyle = sky;
  c.fillRect(0, 0, 960, 600);
  if (project.id === 'shoreline') {
    c.fillStyle = '#e9edb5';
    c.beginPath();
    c.arc(756, 120, 56, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#496c70';
    for (let i = 0; i < 21; i++) c.fillRect(i * 49, 260 - ((i * 47) % 160), 36, 200);
    c.fillStyle = '#1f5f65';
    c.fillRect(0, 300, 960, 300);
    c.strokeStyle = '#72a9a1';
    c.lineWidth = 4;
    for (let i = 0; i < 26; i++) {
      const x = (i * 179) % 940;
      const y = 320 + ((i * 59) % 270);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 62, y);
      c.stroke();
    }
    c.fillStyle = '#ddf68b';
    c.beginPath();
    c.moveTo(378, 414);
    c.lineTo(568, 414);
    c.lineTo(601, 389);
    c.lineTo(572, 435);
    c.lineTo(409, 443);
    c.fill();
    c.strokeStyle = '#102b32';
    c.lineWidth = 20;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(447, 406);
    c.lineTo(469, 357);
    c.lineTo(501, 382);
    c.lineTo(519, 412);
    c.stroke();
    c.strokeStyle = '#ed9cb9';
    c.lineWidth = 29;
    c.beginPath();
    c.moveTo(470, 351);
    c.lineTo(490, 309);
    c.stroke();
    c.fillStyle = '#d8b38b';
    c.beginPath();
    c.arc(499, 286, 17, 0, 7);
    c.fill();
    c.strokeStyle = '#e3f6dc';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(381, 427);
    c.lineTo(295, 440);
    c.moveTo(381, 419);
    c.lineTo(324, 395);
    c.stroke();
  } else if (project.id === 'sketch') {
    c.strokeStyle = '#dcebd5';
    c.lineWidth = 1;
    for (let x = 0; x < 960; x += 40) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 600);
      c.stroke();
    }
    for (let y = 0; y < 600; y += 40) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(960, y);
      c.stroke();
    }
    c.fillStyle = '#749386';
    c.beginPath();
    c.moveTo(0, 310);
    c.lineTo(220, 112);
    c.lineTo(407, 320);
    c.lineTo(650, 190);
    c.lineTo(960, 370);
    c.lineTo(960, 600);
    c.lineTo(0, 600);
    c.fill();
    c.strokeStyle = '#e5f89b';
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(-10, 260);
    c.bezierCurveTo(230, 215, 280, 490, 480, 430);
    c.bezierCurveTo(650, 360, 680, 540, 970, 480);
    c.stroke();
    c.strokeStyle = '#112d31';
    c.lineWidth = 11;
    [425, 513].forEach((x) => {
      c.beginPath();
      c.arc(x, 400, 28, 0, 7);
      c.stroke();
    });
    c.strokeStyle = '#e69c69';
    c.beginPath();
    c.moveTo(425, 400);
    c.lineTo(459, 349);
    c.lineTo(484, 400);
    c.closePath();
    c.lineTo(500, 340);
    c.lineTo(513, 400);
    c.stroke();
    c.strokeStyle = '#172f34';
    c.beginPath();
    c.moveTo(459, 349);
    c.lineTo(449, 315);
    c.lineTo(473, 288);
    c.lineTo(494, 330);
    c.stroke();
    c.fillStyle = '#172f34';
    c.beginPath();
    c.arc(480, 265, 17, 0, 7);
    c.fill();
  } else {
    c.strokeStyle = '#314650';
    c.lineWidth = 2;
    for (let x = 0; x < 960; x += 48) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 600);
      c.stroke();
    }
    for (let y = 0; y < 600; y += 48) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(960, y);
      c.stroke();
    }
    for (const x of [260, 440, 620])
      for (const y of [160, 340]) {
        c.fillStyle = '#839490';
        c.fillRect(x, y, 100, 130);
        for (let i = 0; i < 4; i++) {
          c.fillStyle = '#c7a47a';
          c.fillRect(x + 8 + (i % 2) * 45, y + 10 + Math.floor(i / 2) * 61, 34, 48);
        }
      }
    for (const x of [25, 830]) {
      c.fillStyle = '#dde4d4';
      c.fillRect(x, 220, 100, 180);
      c.fillStyle = project.accent;
      c.fillRect(x, 405, 100, 60);
      c.fillStyle = '#1a3f51';
      c.fillRect(x + 15, 415, 70, 24);
    }
    c.strokeStyle = '#d7f385';
    c.setLineDash([12, 12]);
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(140, 317);
    c.lineTo(812, 317);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#f1b677';
    c.beginPath();
    c.arc(395, 320, 16, 0, 7);
    c.fill();
    c.fillStyle = '#ebf29d';
    c.fillRect(380, 320, 30, 30);
  }
  c.fillStyle = '#06151bc9';
  c.fillRect(0, 0, 960, 94);
  c.fillRect(0, 514, 960, 86);
  c.fillStyle = '#f0f3e5';
  c.font = 'bold 36px Arial';
  c.textAlign = 'center';
  c.fillText(project.title.toUpperCase(), 480, 58);
  c.fillStyle = project.accent;
  c.font = '23px monospace';
  c.fillText('STEP UP TO PLAY', 480, 568);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Cabinet({
  project,
  index,
  selected,
  playing,
  controlsEnabled = true,
  reduced,
  input,
  onSelect,
  machineRefs,
}: Omit<SceneProps, 'screenRef' | 'onReady' | 'onFailure'> & {
  project: ArcadeProject;
  index: number;
}) {
  const group = useRef<THREE.Group>(null);
  const grip = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const capturedControls = useRef(new Map<number, string>());
  const invalidate = useThree((s) => s.invalidate);
  const canvas = useThree((s) => s.gl.domElement);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const hotspotPoint = useMemo(() => new THREE.Vector3(), []);
  const hotspotCorners = useMemo(
    () =>
      [-0.8, 0.8].flatMap((x) =>
        [0, 3.12].flatMap((y) => [-0.65, 0.85].map((z) => new THREE.Vector3(x, y, z))),
      ),
    [],
  );
  const [held, setHeld] = useState('');
  const [sketchMode, setSketchMode] = useState<'custom' | 'levels'>('levels');
  useEffect(
    () =>
      input.subscribe(() => {
        setHeld([...input.pressed].join('|'));
        if (input.pressed.has('mode-custom')) setSketchMode('custom');
        if (input.pressed.has('mode-levels')) setSketchMode('levels');
      }),
    [input],
  );
  useEffect(() => {
    // R3F consumes cancellation events without forwarding them to captured meshes.
    // Release only the affected control so a second held touch remains usable.
    const releaseCaptured = (event: PointerEvent) => {
      const action = capturedControls.current.get(event.pointerId);
      if (!action) return;
      capturedControls.current.delete(event.pointerId);
      if (action === 'stick') {
        grip.current = null;
        input.set('left', false);
        input.set('right', false);
        input.set('up', false);
        input.set('down', false);
      } else input.set(action, false);
    };
    const forgetCaptures = () => {
      capturedControls.current.clear();
      grip.current = null;
    };
    canvas.addEventListener('pointercancel', releaseCaptured);
    canvas.addEventListener('lostpointercapture', releaseCaptured);
    window.addEventListener('blur', forgetCaptures);
    return () => {
      canvas.removeEventListener('pointercancel', releaseCaptured);
      canvas.removeEventListener('lostpointercapture', releaseCaptured);
      window.removeEventListener('blur', forgetCaptures);
      forgetCaptures();
    };
  }, [canvas, input, project.id]);
  const active = index === selected;
  useEffect(() => {
    if (active && playing && project.id === 'sketch') setSketchMode('levels');
  }, [active, playing, project.id]);
  const resources = useMemo(() => {
    const shape = new THREE.Shape();
    // Side silhouette of a full-height upright cabinet, extruded across its width.
    shape.moveTo(-0.6, 0.08);
    shape.lineTo(0.5, 0.08);
    shape.lineTo(0.53, 1.05);
    shape.lineTo(0.82, 1.24);
    shape.lineTo(0.81, 1.43);
    shape.lineTo(0.53, 1.61);
    shape.lineTo(0.38, 2.62);
    shape.lineTo(0.58, 2.67);
    shape.lineTo(0.58, 3.05);
    shape.lineTo(-0.6, 3.05);
    shape.closePath();
    const side = new THREE.ExtrudeGeometry(shape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.018,
      bevelThickness: 0.012,
    });
    side.rotateY(-Math.PI / 2);
    const grain = surfaceTexture();
    const body = new THREE.MeshStandardMaterial({
      color: project.cabinetColor,
      roughness: 0.55,
      metalness: 0.15,
      roughnessMap: grain,
      bumpMap: grain,
      bumpScale: 0.008,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: project.accent,
      roughness: 0.32,
      metalness: 0.3,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: '#9ca6a6',
      metalness: 0.88,
      roughness: 0.28,
    });
    const black = new THREE.MeshStandardMaterial({
      color: '#12171a',
      roughness: 0.34,
      metalness: 0.2,
    });
    return {
      side,
      grain,
      body,
      edge,
      metal,
      black,
      marquee: labelTexture(
        project.shortTitle,
        `${project.genre}  /  JC EXPERIMENTS`,
        project.accent,
      ),
      screen: attractTexture(project),
      sideArt: sideTexture(project),
      badge: labelTexture('JC', 'ORIGINAL EXPERIMENTS', '#c9d2c7', true),
      keyCap: rounded(0.205, 0.07, 0.15, 0.017),
      rockerCap: rounded(0.232, 0.055, 0.15, 0.014),
      modeMaps: ['CUSTOM', 'LEVELS'].map(switchTexture),
      controlMaps: project.controls.map((control) =>
        controlTexture(
          project.id === 'shoreline'
            ? ({ left: 'Left', right: 'Right', up: 'Jump', down: 'Pump' }[control.action] ??
                control.label)
            : control.label,
          control.key,
          project.id === 'shoreline',
        ),
      ),
    };
  }, [project]);
  useEffect(
    () => () => {
      Object.values(resources).forEach((r) =>
        Array.isArray(r) ? r.forEach((texture) => texture.dispose()) : r.dispose(),
      );
    },
    [resources],
  );
  const count = arcadeProjects.length;
  const half = Math.floor(count / 2);
  const order = count === 2 ? index - selected : ((index - selected + count + half) % count) - half;
  const pairedLobby = count === 2 && size.width / size.height >= 0.8;
  // Balance a desktop pair, but keep the selected cabinet fully visible on narrow screens.
  // Playing always brings its selected screen to x=0 for the projected game surface.
  const targetX = playing ? order * 3.9 : pairedLobby ? (index - 0.5) * 2.1 : order * 2.24;
  const targetZ = active ? (playing ? 0.35 : 0.72) : playing ? -1.4 : -0.62;
  const targetR =
    !playing && pairedLobby
      ? (index === 0 ? 1 : -1) * (active ? 0.055 : 0.18)
      : active
        ? playing
          ? 0
          : -0.055
        : -order * 0.3;
  const initialPosition = useRef<[number, number, number]>([targetX, 0, targetZ]);
  const initialRotation = useRef<[number, number, number]>([0, targetR, 0]);
  const boxes = useMemo(() => new Map<string, THREE.BufferGeometry>(), []);
  useEffect(() => () => boxes.forEach((g) => g.dispose()), [boxes]);
  useEffect(() => {
    resources.body.color.set(project.cabinetColor).multiplyScalar(active ? 1 : 0.64);
    resources.body.envMapIntensity = active ? 0.9 : 0.45;
    resources.metal.envMapIntensity = active ? 1 : 0.4;
    resources.black.envMapIntensity = active ? 0.85 : 0.35;
    invalidate();
  }, [active, project.cabinetColor, resources, invalidate]);
  useFrame((_, dt) => {
    if (!group.current) return;
    const g = group.current;
    const a = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.06) * 7);
    g.position.x = THREE.MathUtils.lerp(g.position.x, targetX, a);
    g.position.z = THREE.MathUtils.lerp(g.position.z, targetZ, a);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetR, a);
    const hotspot = machineRefs.current[index];
    if (hotspot && !playing) {
      g.updateWorldMatrix(true, false);
      let left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity;
      hotspotCorners.forEach((corner) => {
        hotspotPoint.copy(corner).applyMatrix4(g.matrixWorld).project(camera);
        const x = ((hotspotPoint.x + 1) * size.width) / 2;
        const y = ((1 - hotspotPoint.y) * size.height) / 2;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      });
      hotspot.style.left = `${Math.max(0, left)}px`;
      hotspot.style.top = `${Math.max(0, top)}px`;
      hotspot.style.width = `${Math.max(0, Math.min(size.width, right) - Math.max(0, left))}px`;
      hotspot.style.height = `${Math.max(0, Math.min(size.height, bottom) - Math.max(0, top))}px`;
      hotspot.style.zIndex = active ? '3' : '2';
      hotspot.style.visibility = 'visible';
    }
    if (
      Math.abs(g.position.x - targetX) +
        Math.abs(g.position.z - targetZ) +
        Math.abs(g.rotation.y - targetR) >
      0.0005
    )
      invalidate();
  });
  const press = (action: string, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!active || !playing) {
      onSelect(index);
      return;
    }
    if (!controlsEnabled) return;
    (event.target as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture(
      event.pointerId,
    );
    capturedControls.current.set(event.pointerId, action);
    input.set(action, true);
  };
  const release = (action: string, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    capturedControls.current.delete(event.pointerId);
    input.set(action, false);
  };
  const releaseStick = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    capturedControls.current.delete(event.pointerId);
    grip.current = null;
    input.set('left', false);
    input.set('right', false);
    input.set('up', false);
    input.set('down', false);
  };
  const box = (
    key: string,
    position: [number, number, number],
    size: [number, number, number],
    material = resources.body,
    radius = 0.02,
  ) => {
    if (!boxes.has(key)) boxes.set(key, rounded(...size, radius));
    return (
      <mesh key={key} position={position} castShadow receiveShadow material={material}>
        <primitive object={boxes.get(key)!} attach="geometry" />
      </mesh>
    );
  };

  return (
    <group
      ref={group}
      position={initialPosition.current}
      rotation={initialRotation.current}
      onClick={(e) => {
        e.stopPropagation();
        if (!playing || !active) onSelect(index);
      }}
      onPointerOver={() => {
        document.body.style.cursor = !playing || !active ? 'pointer' : '';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {[-0.71, 0.775].map((x) => (
        <mesh
          key={x}
          geometry={resources.side}
          material={resources.body}
          position={[x, 0, 0]}
          castShadow
          receiveShadow
        />
      ))}
      {[-0.735, 0.735].map((x) => (
        <group key={x}>
          {box(`edge-${x}`, [x, 0.62, 0.51], [0.018, 1.1, 0.025], resources.edge, 0.005)}
          {box(`topedge-${x}`, [x, 2.85, 0.595], [0.022, 0.33, 0.025], resources.edge, 0.006)}
          <mesh
            position={[x * 1.075, 1.83, -0.17]}
            rotation={[0, x < 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[0.69, 1.3]} />
            <meshStandardMaterial map={resources.sideArt} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {box('back', [0, 1.56, -0.56], [1.42, 2.95, 0.12])}
      {box('base', [0, 0.08, -0.04], [1.5, 0.16, 1.15], resources.black)}
      {box('front', [0, 0.62, 0.48], [1.4, 1.04, 0.11])}
      {box('top', [0, 3.04, -0.01], [1.5, 0.09, 1.17])}
      {box('marquee-frame', [0, 2.85, 0.5], [1.43, 0.36, 0.23], resources.black)}
      <mesh position={[0, 2.85, 0.625]}>
        <planeGeometry args={[1.32, 0.265]} />
        <meshStandardMaterial
          map={resources.marquee}
          emissiveMap={resources.marquee}
          emissive="#ffffff"
          emissiveIntensity={active ? 0.6 : 0.12}
          roughness={0.23}
          metalness={0.1}
        />
      </mesh>
      <group position={[0, SCREEN.y, SCREEN.z]} rotation={[SCREEN.tilt, 0, 0]}>
        {box('monitor-recess', [0, 0, -0.16], [1.43, 1.01, 0.24], resources.black, 0.045)}
        {box('crt-surround', [0, 0, -0.055], [1.405, 0.915, 0.1], resources.black, 0.035)}
        <mesh>
          <planeGeometry args={[SCREEN.width, SCREEN.height, 14, 10]} />
          <meshBasicMaterial
            map={resources.screen}
            color={active ? '#ffffff' : '#718394'}
            toneMapped={false}
          />
        </mesh>
      </group>
      <group position={[0, DECK.y, DECK.z]} rotation={[DECK.tilt, 0, 0]}>
        {box('deck', [0, -0.085, 0], [1.53, 0.16, 0.59], resources.black, 0.045)}
        {box('deck-face', [0, -0.17, 0.29], [1.5, 0.14, 0.07], resources.body)}
        {box('deck-trim', [0, -0.14, 0.325], [1.49, 0.025, 0.025], resources.edge, 0.008)}
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.39, 0.47]} />
          <meshStandardMaterial color={project.cabinetColor} metalness={0.45} roughness={0.28} />
        </mesh>
        {[-0.67, 0.67].flatMap((x) =>
          [-0.2, 0.2].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.012, z]}>
              <cylinderGeometry args={[0.016, 0.016, 0.01, 12]} />
              <primitive object={resources.metal} attach="material" />
            </mesh>
          )),
        )}
        {project.id !== 'shoreline' && (
          <group
            position={[-0.44, 0.017, 0.055]}
            rotation={[
              active ? (held.includes('down') ? 0.16 : held.includes('up') ? -0.16 : 0) : 0,
              0,
              active ? (held.includes('left') ? 0.18 : held.includes('right') ? -0.18 : 0) : 0,
            ]}
          >
            <mesh>
              <cylinderGeometry args={[0.105, 0.112, 0.024, 32]} />
              <primitive object={resources.black} attach="material" />
            </mesh>
            <mesh position={[0, 0.065, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.13, 20]} />
              <primitive object={resources.metal} attach="material" />
            </mesh>
            <mesh
              position={[0, 0.15, 0]}
              castShadow
              onPointerDown={(e) => {
                e.stopPropagation();
                if (!active || !playing) {
                  onSelect(index);
                  return;
                }
                if (!controlsEnabled) return;
                grip.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
                capturedControls.current.set(e.pointerId, 'stick');
                (
                  e.target as unknown as { setPointerCapture: (id: number) => void }
                ).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!controlsEnabled || !grip.current || grip.current.pointerId !== e.pointerId)
                  return;
                e.stopPropagation();
                const dx = e.clientX - grip.current.x;
                const dy = e.clientY - grip.current.y;
                input.set('left', dx < -8);
                input.set('right', dx > 8);
                input.set('up', dy < -8);
                input.set('down', dy > 8);
              }}
              onPointerUp={releaseStick}
            >
              <sphereGeometry args={[0.062, 32, 24]} />
              <meshPhysicalMaterial
                color={project.accent}
                roughness={0.24}
                clearcoat={1}
                clearcoatRoughness={0.16}
              />
            </mesh>
          </group>
        )}
        {project.controls.map((control, j) => {
          const arrows = project.id === 'shoreline';
          const x = arrows
            ? control.action === 'left'
              ? -0.245
              : control.action === 'right'
                ? 0.245
                : 0
            : 0.27 + j * 0.25;
          const z = arrows ? (control.action === 'up' ? -0.11 : 0.085) : 0.06 - j * 0.055;
          const depressed = active && held.includes(control.action);
          return (
            <group key={control.action} position={[x, 0.017, z]}>
              <mesh>
                {arrows ? (
                  <boxGeometry args={[0.222, 0.022, 0.166]} />
                ) : (
                  <cylinderGeometry args={[0.11, 0.116, 0.022, 40]} />
                )}
                <primitive object={resources.metal} attach="material" />
              </mesh>
              <mesh
                position={[0, depressed ? 0.022 : 0.042, 0]}
                castShadow
                onPointerDown={(e) => press(control.action, e)}
                onPointerUp={(e) => release(control.action, e)}
              >
                {arrows ? (
                  <primitive object={resources.keyCap} attach="geometry" />
                ) : (
                  <cylinderGeometry args={[0.097, 0.104, 0.05, 40]} />
                )}
                <meshPhysicalMaterial
                  color={arrows || j === 0 ? project.accent : '#edf0e7'}
                  clearcoat={1}
                  roughness={0.24}
                  metalness={0.05}
                />
                <mesh
                  position={[0, arrows ? 0.036 : 0.026, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  onPointerDown={(e) => press(control.action, e)}
                  onPointerUp={(e) => release(control.action, e)}
                >
                  <planeGeometry args={arrows ? [0.185, 0.142] : [0.18, 0.18]} />
                  <meshBasicMaterial
                    map={resources.controlMaps[j]}
                    transparent
                    toneMapped={false}
                    depthWrite={false}
                  />
                </mesh>
              </mesh>
            </group>
          );
        })}
        {project.id === 'sketch' && (
          <group position={[-0.08, 0.017, -0.12]}>
            {box('mode-switch-base', [0, 0.008, 0], [0.5, 0.05, 0.183], resources.black, 0.016)}
            {(['custom', 'levels'] as const).map((mode, modeIndex) => {
              const chosen = sketchMode === mode;
              return (
                <group key={mode} position={[(modeIndex - 0.5) * 0.24, chosen ? 0.036 : 0.051, 0]}>
                  <mesh
                    geometry={resources.rockerCap}
                    castShadow
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      if (!active || !playing) onSelect(index);
                      else if (controlsEnabled) input.pulse(`mode-${mode}`);
                    }}
                  >
                    <meshPhysicalMaterial
                      color={chosen ? project.accent : '#bdc8c0'}
                      clearcoat={0.75}
                      roughness={0.3}
                    />
                  </mesh>
                  <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.215, 0.1]} />
                    <meshBasicMaterial
                      map={resources.modeMaps[modeIndex]}
                      transparent
                      toneMapped={false}
                      depthWrite={false}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        )}
      </group>
      {box('coin-door', [-0.27, 0.69, 0.553], [0.42, 0.49, 0.035], resources.black, 0.015)}
      {box('slot-metal', [-0.27, 0.84, 0.58], [0.21, 0.075, 0.02], resources.metal, 0.007)}
      {box('slot', [-0.27, 0.84, 0.594], [0.15, 0.015, 0.012], resources.black, 0.002)}
      <mesh position={[-0.27, 0.67, 0.582]}>
        <planeGeometry args={[0.17, 0.105]} />
        <meshStandardMaterial
          color="#e78d50"
          emissive="#f78e36"
          emissiveIntensity={0.4}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[-0.27, 0.53, 0.582]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.02, 20]} />
        <primitive object={resources.metal} attach="material" />
      </mesh>
      {Array.from({ length: 7 }, (_, i) =>
        box(
          `vent-${i}`,
          [0.33, 0.91 - i * 0.047, 0.55],
          [0.35, 0.015, 0.012],
          resources.black,
          0.004,
        ),
      )}
      <mesh position={[0.31, 0.36, 0.548]}>
        <planeGeometry args={[0.38, 0.095]} />
        <meshStandardMaterial map={resources.badge} roughness={0.6} />
      </mesh>
      <mesh position={[0.65, 2.62, 0.43]}>
        <sphereGeometry args={[0.012, 12, 8]} />
        <meshBasicMaterial color={project.accent} />
      </mesh>
      {[-0.51, 0.51].flatMap((x) =>
        [-0.4, 0.36].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.025, z]}>
            <cylinderGeometry args={[0.075, 0.08, 0.05, 16]} />
            <primitive object={resources.black} attach="material" />
          </mesh>
        )),
      )}
    </group>
  );
}

function Room({ selected, playing, reduced, screenRef, onReady, ...props }: SceneProps) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const target = useRef(new THREE.Vector3(0, 1.5, 0));
  const ready = useRef(false);
  const heroTarget = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(0, 1.55, 0.45);
    return object;
  }, []);
  const projection = useMemo(
    () => ({
      world: new THREE.Matrix4(),
      camera: new THREE.Matrix4(),
      viewport: new THREE.Matrix4(),
      combined: new THREE.Matrix4(),
      point: new THREE.Vector3(),
    }),
    [],
  );
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const map = generator.fromScene(room, 0.04);
    room.dispose();
    generator.dispose();
    scene.environment = map.texture;
    scene.environmentIntensity = 0.55;
    invalidate();
    return () => {
      scene.environment = null;
      map.dispose();
    };
  }, [gl, scene, invalidate]);
  useEffect(() => {
    invalidate();
  }, [selected, playing, reduced, invalidate]);
  useFrame((_, dt) => {
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    const aspect = size.width / size.height;
    const closeZ =
      SCREEN.z +
      0.35 +
      SCREEN.width /
        (2 * Math.tan(THREE.MathUtils.degToRad(34 / 2)) * Math.min(aspect * 0.96, 1.02));
    const closeTargetY = 1.98;
    const closeTargetZ = 0.88;
    const closeY = closeTargetY + (closeZ - closeTargetZ) * Math.tan(THREE.MathUtils.degToRad(18));
    const desired = playing
      ? new THREE.Vector3(0, closeY, closeZ)
      : new THREE.Vector3(0, 2.7, aspect < 0.8 ? 7.9 : 7.45);
    const desiredTarget = new THREE.Vector3(
      0,
      playing ? closeTargetY : 1.61,
      playing ? closeTargetZ : 0.1,
    );
    const factor = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.06) * 6);
    heroTarget.position.x = THREE.MathUtils.lerp(
      heroTarget.position.x,
      !playing && arcadeProjects.length === 2 && aspect >= 0.8 ? (selected - 0.5) * 2.1 : 0,
      factor,
    );
    camera.position.lerp(desired, factor);
    target.current.lerp(desiredTarget, factor);
    camera.lookAt(target.current);
    camera.updateMatrixWorld();
    const dist = camera.position.distanceTo(desired) + target.current.distanceTo(desiredTarget);
    if (dist > 0.0003) invalidate();
    const element = screenRef.current;
    if (element) {
      // Transform the whole DOM game plane through the same perspective camera.
      // A bounding rectangle would drift away from the CRT when looking down at it.
      projection.point.set(SCREEN.width / 2, SCREEN.y, SCREEN.z + 0.35).project(camera);
      const width = Math.max(1, projection.point.x * size.width);
      const height = width / 1.6;
      const cosine = Math.cos(SCREEN.tilt);
      const sine = Math.sin(SCREEN.tilt);
      // DOM pixels -> local display plane -> the backward-tilted monitor in world space.
      // Keep its four corners on the physical glass, including the perspective taper.
      projection.world.set(
        SCREEN.width / width,
        0,
        0,
        -SCREEN.width / 2,
        0,
        (-SCREEN.height / height) * cosine,
        -sine,
        SCREEN.y + (SCREEN.height / 2) * cosine,
        0,
        (-SCREEN.height / height) * sine,
        cosine,
        SCREEN.z + 0.35 + (SCREEN.height / 2) * sine,
        0,
        0,
        0,
        1,
      );
      projection.camera.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      projection.viewport.set(
        size.width / 2,
        0,
        0,
        size.width / 2,
        0,
        -size.height / 2,
        0,
        size.height / 2,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
      );
      projection.combined
        .copy(projection.viewport)
        .multiply(projection.camera)
        .multiply(projection.world);
      const m = projection.combined.elements;
      const k = m[15];
      const css = [
        m[0] / k,
        m[1] / k,
        0,
        m[3] / k,
        m[4] / k,
        m[5] / k,
        0,
        m[7] / k,
        0,
        0,
        1,
        0,
        m[12] / k,
        m[13] / k,
        0,
        1,
      ];
      element.style.left = '0px';
      element.style.top = '0px';
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.transformOrigin = '0 0';
      element.style.transform = `matrix3d(${css.join(',')})`;
      element.style.opacity = playing && dist < 0.018 ? '1' : '0';
      element.style.pointerEvents = playing && dist < 0.018 ? 'auto' : 'none';
      element.dataset.settled = playing && dist < 0.018 ? 'true' : 'false';
    }
  });
  return (
    <>
      <fog attach="fog" args={['#070c15', 10, 26]} />
      <ambientLight intensity={0.16} />
      <directionalLight
        position={[2, 6, 5]}
        intensity={1.15}
        color="#e8f0ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0002}
      />
      <primitive object={heroTarget} />
      <spotLight
        position={[0, 5.3, 1.4]}
        target={heroTarget}
        angle={0.34}
        penumbra={0.75}
        intensity={46}
        color="#eef3e3"
        distance={10}
      />
      <spotLight
        position={[-5, 4, 2]}
        angle={0.7}
        penumbra={0.9}
        intensity={13}
        color="#98bdf5"
        distance={15}
      />
      <pointLight position={[4, 2.8, -0.5]} intensity={8} color="#b6a5f8" distance={10} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#03070b"
          metalness={0.05}
          roughness={0.88}
          envMapIntensity={0.05}
        />
      </mesh>
      {[2.8, 3.2, 4.3].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]}>
          <ringGeometry args={[r, r + 0.006, 128]} />
          <meshBasicMaterial color="#526878" transparent opacity={0.3} />
        </mesh>
      ))}
      {arcadeProjects.map((project, index) => (
        <Cabinet
          key={project.id}
          {...props}
          selected={selected}
          playing={playing}
          reduced={reduced}
          project={project}
          index={index}
        />
      ))}
    </>
  );
}

export default function ArcadeScene(props: SceneProps) {
  return (
    <Canvas
      className="arcade-webgl"
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.7, 9.1], fov: 34, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.domElement.addEventListener('webglcontextlost', props.onFailure, { once: true });
      }}
    >
      <Room {...props} />
    </Canvas>
  );
}
