import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { OBJLoader } from "three-stdlib";
import { Center, Html, OrbitControls, useProgress } from "@react-three/drei";

const LegionViewer = () => {
  const obj = useLoader(OBJLoader, "/LegionE.obj");

  useEffect(() => {
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x0077ff,
          metalness: 0.4,
          roughness: 0.6,
        });
      }
    });
  }, [obj]);

  return (
    <Center>
      <primitive object={obj} scale={2.2} />
    </Center>
  );
};

const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center style={{ color: "#ffffff", fontSize: "14px" }}>
      {progress.toFixed(0)}% loaded
    </Html>
  );
};

export default function ViewerTest() {
  return (
    <div style={{ width: "100%", height: "400px", background: "#121212" }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[0, 10, 10]} intensity={1} />
        <OrbitControls />
        <Suspense fallback={<Loader />}>
          <LegionViewer />
        </Suspense>
      </Canvas>
    </div>
  );
}
