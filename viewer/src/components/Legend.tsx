'use client';

import { HEIGHT_RANGES, TYPE_COLORS, SOURCE_COLORS } from '@/lib/colors';
import { DataStats, RenderMode } from '@/lib/types';

interface LegendProps {
  stats: DataStats | null;
  renderMode: RenderMode;
  visible: boolean;
  onToggle: () => void;
}

export default function Legend({ stats, renderMode, visible, onToggle }: LegendProps) {
  return (
    <div className="fixed left-4 bottom-4 z-40">
      <button
        onClick={onToggle}
        className="mb-2 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all flex items-center gap-1.5"
        style={{
          background: 'rgba(10, 15, 32, 0.85)',
          backdropFilter: 'blur(10px)',
          color: '#00f5ff',
          border: '1px solid rgba(0, 245, 255, 0.25)',
        }}
      >
        <span>{visible ? '◀' : '▶'}</span>
        <span>{visible ? 'Hide Legend' : 'Show Legend'}</span>
      </button>

      {visible && (
        <div
          className="rounded-2xl overflow-hidden animate-fade-in w-64"
          style={{
            background: 'rgba(10, 15, 32, 0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 245, 255, 0.18)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-white text-xs font-semibold tracking-wider uppercase">
              {renderMode === 'height' && 'Building Height'}
              {renderMode === 'type' && 'Land Use / Type'}
              {renderMode === 'quality' && 'Elevation Source'}
              {renderMode === 'solar' && 'Solar Potential'}
              {renderMode === 'flood' && 'Flood Risk Status'}
              {renderMode === 'xray' && 'Tactical CAD Wireframe'}
            </h4>
            <span className="text-[10px] text-cyan-400 font-mono capitalize">
              {renderMode}
            </span>
          </div>

          {/* Color items based on active render mode */}
          <div className="px-4 py-3 space-y-2">
            {renderMode === 'height' &&
              HEIGHT_RANGES.map((range) => (
                <LegendItem key={range.label} color={range.color} label={range.label} />
              ))}

            {renderMode === 'type' &&
              Object.entries(TYPE_COLORS)
                .filter(([k]) => k !== 'yes')
                .slice(0, 5)
                .map(([_, item]) => (
                  <LegendItem key={item.label} color={item.color} label={item.label} />
                ))}

            {renderMode === 'quality' &&
              Object.entries(SOURCE_COLORS).map(([_, item]) => (
                <LegendItem key={item.label} color={item.color} label={item.label} />
              ))}

            {renderMode === 'solar' && (
              <>
                <LegendItem color="#ffd600" label="High Catchment (>1500 m²)" />
                <LegendItem color="#ffab00" label="Medium Catchment (500–1500 m²)" />
                <LegendItem color="#ff6d00" label="Standard Roof (<500 m²)" />
              </>
            )}

            {renderMode === 'flood' && (
              <>
                <LegendItem color="#ff1744" label="Inundated / Vulnerable" pulse />
                <LegendItem color="#37474f" label="Safe Above Flood Crest" />
                <LegendItem color="#00e5ff" label="Durgam Cheruvu Lake" />
              </>
            )}

            {renderMode === 'xray' && (
              <>
                <LegendItem color="#00f5ff" label="Cyan Laser Wireframe" />
                <LegendItem color="#ffffff" label="Prominent High-Rise Edges" />
              </>
            )}
          </div>

          {/* Dataset Statistics */}
          {stats && (
            <div className="px-4 py-2.5 space-y-1.5 border-t border-white/5 bg-white/[0.02]">
              <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                5-Tier Engine Stats
              </p>
              <StatRow label="Total buildings" value={stats.total} />
              {stats.withLandmarkRegistry !== undefined && (
                <StatRow label="Landmark registry" value={stats.withLandmarkRegistry} />
              )}
              <StatRow label="OSM levels / tags" value={(stats.withOsmLevels ?? 0) + (stats.withOsmHeight ?? 0)} />
              {stats.withMorphological !== undefined ? (
                <StatRow label="Morphology model" value={stats.withMorphological} />
              ) : (
                <StatRow label="Raster height" value={stats.withRasterHeight} />
              )}
              <StatRow label="Default fallback" value={stats.withDefault} />
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}

function LegendItem({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
        style={{
          background: color,
          boxShadow: `0 0 8px ${color}55`,
        }}
      />
      <span className="text-gray-300 text-xs truncate">{label}</span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-400 text-[11px]">{label}</span>
      <span className="text-white font-mono font-medium">{(value ?? 0).toLocaleString()}</span>
    </div>
  );
}
