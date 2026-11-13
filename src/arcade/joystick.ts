import * as THREE from 'three';

export function createCabinetJoystick(
  black: THREE.Material,
  metal: THREE.Material,
  accent: string,
) {
  const root = new THREE.Group();
  root.name = 'joystick-mount';
  const pivot = new THREE.Group();
  pivot.name = 'joystick-pivot';
  pivot.position.y = 0.012;
  const geometries = [
    new THREE.CylinderGeometry(0.042, 0.044, 0.006, 24),
    new THREE.SphereGeometry(0.03, 16, 10),
    new THREE.CylinderGeometry(0.008, 0.008, 0.065, 12),
    new THREE.SphereGeometry(0.0315, 24, 16),
    new THREE.SphereGeometry(0.055, 12, 8),
  ];
  const capMaterial = new THREE.MeshPhysicalMaterial({
    color: accent,
    roughness: 0.29,
    clearcoat: 0.65,
    clearcoatRoughness: 0.24,
    metalness: 0,
  });
  // Invisible material skips drawing, while the mesh remains a generous raycast target.
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const base = new THREE.Mesh(geometries[0], black);
  base.name = 'joystick-fixed-base';
  base.position.y = 0.003;
  const boot = new THREE.Mesh(geometries[1], black);
  boot.position.y = 0.008;
  boot.scale.y = 0.25;
  const shaft = new THREE.Mesh(geometries[2], metal);
  shaft.position.y = 0.0325;
  shaft.name = 'joystick-shaft';
  const grip = new THREE.Mesh(geometries[3], capMaterial);
  grip.name = 'joystick-grip';
  grip.position.y = 0.065;
  grip.castShadow = true;
  const hit = new THREE.Mesh(geometries[4], hitMaterial);
  hit.name = 'joystick-hit-area';
  hit.position.copy(grip.position);
  pivot.add(shaft, grip, hit);
  root.add(base, boot, pivot);
  return {
    root,
    pivot,
    base,
    shaft,
    grip,
    isGrip: (object: THREE.Object3D) => object === grip || object === hit,
    dispose() {
      geometries.forEach((g) => g.dispose());
      capMaterial.dispose();
      hitMaterial.dispose();
    },
  };
}

export function poseCabinetJoystick(
  model: ReturnType<typeof createCabinetJoystick>,
  held: readonly string[],
  active: boolean,
) {
  const x = active ? Number(held.includes('down')) - Number(held.includes('up')) : 0;
  const z = active ? Number(held.includes('left')) - Number(held.includes('right')) : 0;
  const gate = 0.22 / Math.max(1, Math.hypot(x, z));
  // Only the shaft/grip pivot moves. The mounting flange and dust cover stay seated.
  model.pivot.rotation.set(x * gate, 0, z * gate);
}
