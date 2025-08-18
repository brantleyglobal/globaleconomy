"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three-stdlib";
import { useLoader } from "@react-three/fiber";
import { MeshStandardMaterial, Mesh } from "three";

type Props = {
  objUrl: string;
  color?: string;
};

const Model = ({ objUrl, color = "#cfcfcf" }: Props) => {
  const obj = useLoader(OBJLoader, objUrl);

  obj.traverse((child) => {
    if ((child as Mesh).isMesh) {
      (child as Mesh).material = new MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.5,
      });
    }
  });

  return <primitive object={obj} scale={1.5} />;
};

export const InteractiveAssetViewer = ({ objUrl }: { objUrl: string }) => {
  return (
    <div className="w-full h-48 rounded overflow-hidden">
      <Canvas camera={{ position: [0, 0, 6] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[0, 4, 4]} intensity={0.4} />
        <Suspense fallback={null}>
          <Model objUrl={objUrl} />
        </Suspense>
        <OrbitControls enableZoom enablePan />
      </Canvas>
    </div>
  );
};
