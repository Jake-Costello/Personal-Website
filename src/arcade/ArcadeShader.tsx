import { useEffect, useRef } from 'react';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';
import { useFrame, useThree } from '@react-three/fiber';

type ShaderProps = {
  paused: boolean;
  onReady: () => void;
};

function RenderLifecycle({ paused, onReady }: ShaderProps) {
  const setFrameloop = useThree((state) => state.setFrameloop);
  const invalidate = useThree((state) => state.invalidate);
  const ready = useRef(false);

  useEffect(() => {
    // Freeze the current image when paused without leaving a background GPU loop running.
    setFrameloop(paused ? 'demand' : 'always');
    invalidate();
  }, [paused, setFrameloop, invalidate]);

  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  return null;
}

export default function ArcadeShader({ paused, onReady }: ShaderProps) {
  return (
    <ShaderGradientCanvas
      style={{ position: 'absolute', inset: 0 }}
      pixelDensity={1}
      fov={45}
      pointerEvents="none"
      powerPreference="low-power"
      preserveDrawingBuffer={false}
      lazyLoad={false}
    >
      <ShaderGradient
        type="waterPlane"
        animate={paused ? 'off' : 'on'}
        color1="#2451a4"
        color2="#7867b8"
        color3="#050713"
        lightType="3d"
        brightness={1}
        grain="off"
        reflection={0}
        uSpeed={0.1}
        uStrength={2.4}
        uDensity={1.1}
        uAmplitude={0}
        uTime={0.2}
        uFrequency={5.5}
        cDistance={3.9}
        cPolarAngle={115}
        cAzimuthAngle={180}
        positionX={-0.5}
        positionY={0.1}
        rotationX={0}
        rotationY={0}
        rotationZ={235}
        enableTransition={false}
        enableCameraUpdate={false}
      />
      <RenderLifecycle paused={paused} onReady={onReady} />
    </ShaderGradientCanvas>
  );
}
