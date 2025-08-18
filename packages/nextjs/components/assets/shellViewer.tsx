"use client";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three-stdlib";
import { MeshStandardMaterial, Mesh } from "three";
import React, { useEffect } from "react";

type Props = {
  objUrl: string;
  color?: string;
  scale?: number;
};

export const ShellModel: React.FC<Props> = ({ objUrl, color = "#cfcfcf", scale = 1 }) => {
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

  return <primitive object={obj} scale={scale} />;
};
