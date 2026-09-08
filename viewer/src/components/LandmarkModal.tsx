'use client';

import { LandmarkData } from '@/lib/types';

interface LandmarkModalProps {
  landmark: LandmarkData | null;
  onClose: () => void;
  onFlyTo: (landmark: LandmarkData) => void;
}

export default function LandmarkModal({ landmark, onClose, onFlyTo }: LandmarkModalProps) {
  if (!landmark) return null;

  return (
    <div
      className="fixed right-4 top-20 w-84 rounded-2xl overflow-hidden z-40 animate-slide-in"
      style={{
        background: 'rgba(10, 15, 32, 0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 245, 255, 0.25)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 50px rgba(0, 245, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.15), transparent)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{landmark.badge.split(' ')[0]}</span>
          <div>
            <h3 className="text-white font-bold text-sm tracking-wide">
              {landmark.name}
            </h3>
            <p className="text-cyan-400 text-xs font-mono">
              {landmark.category}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Description & specs */}
      <div className="px-5 py-4 space-y-4">
        <p className="text-gray-300 text-xs leading-relaxed">
          {landmark.description}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white/5 rounded-xl p-2.5">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Height</p>
            <p className="text-white font-mono text-sm font-semibold mt-0.5">
              {landmark.height > 0 ? `${landmark.height}m` : 'Ground Basin'}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Location</p>
            <p className="text-white font-mono text-xs font-semibold mt-0.5">
              Hyderabad, TG
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onFlyTo(landmark)}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25 transition-all flex items-center justify-center gap-2"
        >
          <span>🚁</span> Fly Camera to Landmark
        </button>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
