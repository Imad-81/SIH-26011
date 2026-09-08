'use client';

import { useEffect, useState } from 'react';
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

  if (landmarks.length === 0) return null;

  return (
    <group>
      {landmarks.map((landmark) => {
        const isSelected = selectedLandmarkId === landmark.id;
        const isHovered = hoveredId === landmark.id;

        const beamHeight = Math.max(12, landmark.height);

        return (
          <group key={landmark.id} position={landmark.pos}>
            {/* Vertical Laser Beacon Beam from building base up to the badge */}
            <mesh position={[0, -beamHeight / 2, 0]}>
              <cylinderGeometry args={[0.25, 0.25, beamHeight, 8]} />
              <meshBasicMaterial
                color={isSelected ? '#ff007f' : '#00f5ff'}
                transparent
                opacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.25}
              />
            </mesh>

            {/* Glowing Base Target Ring on Ground */}
            <mesh position={[0, -beamHeight + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[4, 5, 24]} />
              <meshBasicMaterial
                color={isSelected ? '#ff007f' : '#00f5ff'}
                transparent
                opacity={isSelected ? 0.9 : 0.4}
                side={2}
              />
            </mesh>

            {/* 3D Floating HTML Badge */}
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
