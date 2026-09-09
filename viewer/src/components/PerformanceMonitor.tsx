'use client';

import { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Activity, Minimize2, Maximize2 } from 'lucide-react';

export interface PerfMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  frameTimeMs: number;
}

// Global metrics store for zero-latency frame updates
let globalMetrics: PerfMetrics = {
  fps: 60,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  frameTimeMs: 16.6,
};

/**
 * In-Canvas Three.js telemetry sampler (runs in R3F render loop)
 */
export function PerformanceTracker() {
  const frameCount = useRef(0);
  const lastTime = useRef<number | null>(null);
  const fpsAccumulator = useRef(60);

  useFrame(({ gl }) => {
    const now = performance.now();
    if (lastTime.current === null) {
      lastTime.current = now;
      return;
    }

    frameCount.current++;
    const delta = now - lastTime.current;

    if (delta >= 400) {
      const currentFps = Math.round((frameCount.current * 1000) / delta);
      fpsAccumulator.current = currentFps;
      frameCount.current = 0;
      lastTime.current = now;

      globalMetrics = {
        fps: Math.min(currentFps, 120),
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        frameTimeMs: parseFloat((1000 / Math.max(currentFps, 1)).toFixed(1)),
      };
    }
  });

  return null;
}

/**
 * DOM HUD Display Widget (mounted in the UI layer)
 */
export default function PerformanceHUD() {
  const [metrics, setMetrics] = useState<PerfMetrics>(globalMetrics);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({ ...globalMetrics });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const fpsColor =
    metrics.fps >= 55 ? 'text-emerald-400' : metrics.fps >= 35 ? 'text-amber-400' : 'text-rose-400';
  const dotColor =
    metrics.fps >= 55 ? 'bg-emerald-400' : metrics.fps >= 35 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="fixed bottom-4 right-4 z-40 font-mono text-[11px] select-none">
      <div className="bg-gray-950/85 backdrop-blur-md border border-gray-800/80 rounded-xl p-2.5 shadow-2xl transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 text-gray-400 pb-1.5 border-b border-gray-800/60">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
            <span className="font-semibold tracking-wider text-gray-300 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> GPU TELEMETRY
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-white transition-colors p-0.5 rounded"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
        </div>

        {/* Minimized Pill */}
        {isMinimized ? (
          <div className="flex items-center gap-3 pt-1.5 text-xs">
            <span className={`font-bold ${fpsColor}`}>{metrics.fps} FPS</span>
            <span className="text-gray-500">|</span>
            <span className="text-cyan-400 font-medium">{metrics.drawCalls} calls</span>
          </div>
        ) : (
          /* Full Telemetry Grid */
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2">
            <div>
              <span className="text-gray-500 text-[10px] block">FRAME RATE</span>
              <span className={`text-sm font-bold ${fpsColor}`}>
                {metrics.fps}{' '}
                <span className="text-[10px] font-normal text-gray-500">
                  ({metrics.frameTimeMs}ms)
                </span>
              </span>
            </div>

            <div>
              <span className="text-gray-500 text-[10px] block">DRAW CALLS</span>
              <span className="text-sm font-bold text-cyan-400">
                {metrics.drawCalls}{' '}
                <span className="text-[10px] font-normal text-emerald-400">
                  {metrics.drawCalls <= 15 ? '🚀 99% optimized' : ''}
                </span>
              </span>
            </div>

            <div>
              <span className="text-gray-500 text-[10px] block">TRIANGLES</span>
              <span className="text-gray-200 font-medium">
                {(metrics.triangles / 1000).toFixed(1)}k
              </span>
            </div>

            <div>
              <span className="text-gray-500 text-[10px] block">GEOMETRIES</span>
              <span className="text-gray-200 font-medium">{metrics.geometries}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
