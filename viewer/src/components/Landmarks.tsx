'use client';

import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { LandmarkData } from '@/lib/types';

interface LandmarksProps {
  onSelectLandmark: (landmark: LandmarkData) => void;
  selectedLandmarkId?: string | null;
}

export default function Landmarks({ onSelectLandmark, selectedLandmarkId }: LandmarksProps) {
  const [landmarks, setLandmarks] = useState<LandmarkData[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/landmarks.json')
      .then((res) => res.json())
      .then((data) => setLandmarks(data))
      .catch((err) => console.error('Failed to load landmarks:', err));
  }, []);

  // High-performance Instanced Laser Beams and Ground Rings (Consolidates 30 draw calls into 2)
  const { laserMesh, ringMesh } = useMemo(() => {
    if (landmarks.length === 0) return { laserMesh: null, ringMesh: null };

    const cylGeom = new THREE.CylinderGeometry(0.25, 0.25, 1.0, 8);
    cylGeom.translate(0, 0.5, 0); // origin at base

    const ringGeom = new THREE.RingGeometry(4, 5, 24);
    ringGeom.rotateX(-Math.PI / 2);

    const cylMat = new THREE.MeshBasicMaterial({
      color: '#00f5ff',
      transparent: true,
      opacity: 0.35,
    });

    const ringMat = new THREE.MeshBasicMaterial({
      color: '#00f5ff',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    const lMesh = new THREE.InstancedMesh(cylGeom, cylMat, landmarks.length);
    const rMesh = new THREE.InstancedMesh(ringGeom, ringMat, landmarks.length);

    const dummy = new THREE.Object3D();
    const cyanColor = new THREE.Color('#00f5ff');
    const pinkColor = new THREE.Color('#ff007f');

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const beamHeight = Math.max(12, lm.height);
      const isSel = selectedLandmarkId === lm.id;

      // Laser Cylinder
      dummy.position.set(lm.pos[0], lm.pos[1] - beamHeight, lm.pos[2]);
      dummy.scale.set(1, beamHeight, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      lMesh.setMatrixAt(i, dummy.matrix);
      lMesh.setColorAt(i, isSel ? pinkColor : cyanColor);

      // Target Ring
      dummy.position.set(lm.pos[0], lm.pos[1] - beamHeight + 0.5, lm.pos[2]);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rMesh.setMatrixAt(i, dummy.matrix);
      rMesh.setColorAt(i, isSel ? pinkColor : cyanColor);
    }

    lMesh.instanceMatrix.needsUpdate = true;
    rMesh.instanceMatrix.needsUpdate = true;
    if (lMesh.instanceColor) lMesh.instanceColor.needsUpdate = true;
    if (rMesh.instanceColor) rMesh.instanceColor.needsUpdate = true;

    return { laserMesh: lMesh, ringMesh: rMesh };
  }, [landmarks, selectedLandmarkId]);

  if (landmarks.length === 0) return null;

  return (
    <group name="landmarks-group">
      {/* 🚀 Instanced Laser Beams: 1 Single Draw Call */}
      {laserMesh && <primitive object={laserMesh} />}

      {/* 🎯 Instanced Ground Rings: 1 Single Draw Call */}
      {ringMesh && <primitive object={ringMesh} />}

      {/* 3D Floating HTML Badges */}
      {landmarks.map((landmark) => {
        const isSelected = selectedLandmarkId === landmark.id;
        const isHovered = hoveredId === landmark.id;

        return (
          <group key={landmark.id} position={landmark.pos}>
            <Html
              position={[0, 4, 0]}
              center
              distanceFactor={800}
              zIndexRange={[10, 0]}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLandmark(landmark);
                }}
                onMouseEnter={() => setHoveredId(landmark.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`cursor-pointer select-none transition-all duration-300 transform ${
                  isSelected ? 'scale-110' : isHovered ? 'scale-105' : 'scale-100'
                }`}
                style={{
                  background: isSelected
                    ? 'rgba(255, 0, 127, 0.9)'
                    : 'rgba(10, 15, 35, 0.88)',
                  backdropFilter: 'blur(12px)',
                  border: isSelected
                    ? '1.5px solid #ff007f'
                    : isHovered
                    ? '1.5px solid #00f5ff'
                    : '1px solid rgba(0, 245, 255, 0.3)',
                  boxShadow: isSelected
                    ? '0 0 25px rgba(255, 0, 127, 0.7)'
                    : isHovered
                    ? '0 0 20px rgba(0, 245, 255, 0.5)'
                    : '0 4px 15px rgba(0, 0, 0, 0.5)',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  whiteSpace: 'nowrap',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wide text-white">
                    {landmark.badge}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-tight">
                      {landmark.name}
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      {landmark.height > 0 ? `${landmark.height}m` : 'Basin'} · {landmark.category}
                    </span>
                  </div>
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
