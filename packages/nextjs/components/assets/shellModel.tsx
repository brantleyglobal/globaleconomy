"use client";
import React, { useRef, useEffect } from "react";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three-stdlib";
import { Mesh, MeshStandardMaterial } from "three";

type Props = {
  objUrl: string;
  color?: string;
  scale?: number;
};

const ShellModel: React.FC<Props> = ({ objUrl, color = "#cfcfcf", scale = 1 }) => {
  const objRef = useRef<Mesh>(null);
  const obj = useLoader(OBJLoader, objUrl);

  useEffect(() => {
    obj.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = new MeshStandardMaterial({
          color,
          metalness: 0.2,
          roughness: 0.5,
        });
      }
    });
  }, [obj, color]);

  return (
    <primitive
      ref={objRef}
      object={obj}
      scale={scale}
      position={[0, 0, 0]}
      castShadow
      receiveShadow
    />
  );
};

export default ShellModel;
