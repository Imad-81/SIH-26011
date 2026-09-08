'use client';

import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  progress: number;
  onComplete?: () => void;
}

export default function LoadingScreen({ progress, onComplete }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 800);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-700 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a2a 100%)' }}
    >
      {/* Animated grid background */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="grid-animation" />
      </div>

      {/* Glowing orb */}
      <div className="relative mb-12">
        <div
          className="w-32 h-32 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, #00f5ff 0%, #0088ff44 40%, transparent 70%)',
            boxShadow: '0 0 60px #00f5ff44, 0 0 120px #0088ff22',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-16 h-16 animate-spin-slow"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00f5ff"
            strokeWidth="1"
          >
            {/* Building icon */}
            <path d="M3 21h18M5 21V7l8-4v18M13 21V7l6 3v11" />
            <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">
        SIH<span style={{ color: '#00f5ff' }}>26011</span>
      </h1>
      <p className="text-gray-400 text-sm mb-8 tracking-widest uppercase">
        Hyderabad 3D Building Viewer
      </p>

      {/* Progress bar */}
      <div className="w-80 h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00f5ff, #0088ff, #00f5ff)',
            boxShadow: '0 0 10px #00f5ff88',
          }}
        />
      </div>

      {/* Status text */}
      <p className="text-gray-500 text-xs font-mono">
        {progress < 30
          ? 'Loading building data...'
          : progress < 60
          ? 'Processing geometries...'
          : progress < 90
          ? 'Loading terrain...'
          : 'Initializing scene...'}
      </p>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
