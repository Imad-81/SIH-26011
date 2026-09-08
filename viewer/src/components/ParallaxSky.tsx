'use client';

import React, { useMemo } from 'react';
import { TimeOfDay } from '@/lib/types';
import { SKY_CONFIGS } from '@/lib/skyConfig';

interface ParallaxSkyProps {
  timeOfDay: TimeOfDay;
}

export default function ParallaxSky({ timeOfDay }: ParallaxSkyProps) {
  const config = useMemo(() => SKY_CONFIGS[timeOfDay] || SKY_CONFIGS.night, [timeOfDay]);

  // Generate deterministic stars for night/dawn/dusk
  const starfield = useMemo(() => {
    if (config.stars.count === 0) return [];
    const stars = [];
    // Seeded random for consistency
    let seed = 42;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    const count = Math.min(config.stars.count, 140);
    for (let i = 0; i < count; i++) {
      stars.push({
        id: i,
        x: rand() * 100, // percentage across width
        y: rand() * 55,  // upper 55% of the sky
        size: rand() * 2 + 0.8,
        opacity: rand() * 0.7 + 0.3,
        twinkleDuration: 2 + rand() * 4,
        twinkleDelay: rand() * 3,
      });
    }
    return stars;
  }, [config.stars.count]);

  return (
    <div
      id="sky-parallax-container"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{
        zIndex: 0,
        backgroundColor: config.horizonColor,
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* LAYER 0: Deep Atmospheric Rayleigh Scattering Gradient         */}
      {/* ------------------------------------------------------------- */}
      <div
        id="sky-layer-gradient"
        className="absolute inset-0 transition-colors duration-1000 ease-out"
        style={{
          background: `linear-gradient(180deg, 
            ${config.zenithColor} 0%, 
            ${config.midColor} 48%, 
            ${config.horizonColor} 82%, 
            ${config.fogColor} 100%)`,
          willChange: 'transform',
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* LAYER 1: Night Starfield & Twinkle Effects                     */}
      {/* ------------------------------------------------------------- */}
      {config.stars.opacity > 0 && (
        <div
          id="sky-layer-stars"
          className="absolute inset-x-0 top-0 h-3/4 transition-opacity duration-1000"
          style={{
            opacity: config.stars.opacity,
            willChange: 'transform',
          }}
        >
          {starfield.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDuration: `${star.twinkleDuration}s`,
                animationDelay: `${star.twinkleDelay}s`,
                boxShadow: star.size > 1.8 ? '0 0 4px rgba(255, 255, 255, 0.9)' : undefined,
              }}
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LAYER 2: Celestial Sphere (Sun / Moon with Dynamic Flares)     */}
      {/* ------------------------------------------------------------- */}
      <div
        id="sky-layer-celestial"
        className="absolute inset-0"
        style={{ willChange: 'transform' }}
      >
        {/* Sun Disc & Corona */}
        {config.sun.visible && (
          <div
            id="sky-sun-disc"
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-1000 pointer-events-none"
            style={{
              // Position will be dynamically updated or placed in 360 pano
              left: '50%',
              top: `${Math.max(12, 60 - config.sun.elevationDeg * 0.75)}%`,
            }}
          >
            {/* Outer Corona Bloom */}
            <div
              className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"
              style={{
                width: `${config.sun.glowRadius * 2.2}px`,
                height: `${config.sun.glowRadius * 2.2}px`,
                background: `radial-gradient(circle, ${config.sun.coronaColor} 0%, ${config.sun.flareColor} 45%, transparent 75%)`,
                filter: 'blur(12px)',
              }}
            />

            {/* Mid Corona */}
            <div
              className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `${config.sun.glowRadius * 1.1}px`,
                height: `${config.sun.glowRadius * 1.1}px`,
                background: `radial-gradient(circle, ${config.sun.coronaColor} 0%, rgba(255,255,255,0.4) 40%, transparent 80%)`,
                filter: 'blur(4px)',
              }}
            />

            {/* Solar Core */}
            <div
              className="relative rounded-full shadow-2xl"
              style={{
                width: '64px',
                height: '64px',
                background: config.sun.coreColor,
                boxShadow: `0 0 40px ${config.sun.coronaColor}, 0 0 80px ${config.sun.flareColor}`,
              }}
            />

            {/* Subtle Horizon Sun Shafts / Rays during dawn/dusk */}
            {(timeOfDay === 'dawn' || timeOfDay === 'dusk') && (
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: '900px',
                  height: '350px',
                  background: `radial-gradient(ellipse at center, ${config.sun.flareColor} 0%, transparent 70%)`,
                  opacity: 0.65,
                  mixBlendMode: 'screen',
                }}
              />
            )}
          </div>
        )}

        {/* Moon Disc & Lunar Aura */}
        {config.moon.visible && (
          <div
            id="sky-moon-disc"
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-1000 pointer-events-none"
            style={{
              left: '72%',
              top: `${Math.max(15, 65 - config.moon.elevationDeg * 0.75)}%`,
            }}
          >
            {/* Lunar Glow */}
            <div
              className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                width: '180px',
                height: '180px',
                background: `radial-gradient(circle, ${config.moon.glowColor} 0%, transparent 70%)`,
                filter: 'blur(8px)',
              }}
            />
            {/* Moon Body */}
            <div
              className="relative rounded-full"
              style={{
                width: '42px',
                height: '42px',
                background: 'radial-gradient(circle at 35% 35%, #f8fafc 0%, #cbd5e1 55%, #64748b 100%)',
                boxShadow: '0 0 24px rgba(224, 242, 254, 0.45)',
              }}
            >
              {/* Moon Crescent Shadow for realism */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 75% 70%, rgba(2, 6, 23, 0.65) 0%, transparent 60%)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAYER 3: High Cirrus Cloud Band (Slow Parallax + Drift)       */}
      {/* ------------------------------------------------------------- */}
      <div
        id="sky-layer-cirrus"
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: config.clouds.cirrusOpacity,
          willChange: 'transform',
        }}
      >
        <svg
          className="absolute top-0 left-0 w-[4000px] h-[550px]"
          viewBox="0 0 4000 550"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cirrusGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={config.clouds.cirrusTint} stopOpacity="0.0" />
              <stop offset="40%" stopColor={config.clouds.cirrusTint} stopOpacity="0.85" />
              <stop offset="100%" stopColor={config.clouds.cirrusTint} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cirrusGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={config.clouds.cirrusTint} stopOpacity="0.0" />
              <stop offset="50%" stopColor={config.clouds.cirrusTint} stopOpacity="0.65" />
              <stop offset="100%" stopColor={config.clouds.cirrusTint} stopOpacity="0.0" />
            </linearGradient>
            <filter id="cirrusBlur" x="-10%" y="-20%" width="120%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* Wispy Cirrus Streaks across 4000px panoramic width */}
          <g filter="url(#cirrusBlur)">
            {/* Stream 1 */}
            <path
              d="M0 120 Q 300 80, 650 140 T 1300 95 T 1950 150 T 2600 110 T 3250 160 T 4000 120"
              stroke="url(#cirrusGrad1)"
              strokeWidth="48"
              strokeLinecap="round"
            />
            <path
              d="M100 160 Q 450 120, 800 180 T 1500 130 T 2150 190 T 2850 140 T 3500 185 T 4000 160"
              stroke="url(#cirrusGrad2)"
              strokeWidth="36"
              strokeLinecap="round"
            />
            {/* Stream 2 (Higher altitude) */}
            <path
              d="M0 60 Q 350 30, 750 75 T 1450 45 T 2200 80 T 2900 50 T 3650 85 T 4000 60"
              stroke="url(#cirrusGrad2)"
              strokeWidth="28"
              strokeLinecap="round"
            />
            {/* Feathered Wisps */}
            <path
              d="M250 210 Q 600 170, 950 230 T 1700 190 T 2400 240 T 3100 195 T 3850 235"
              stroke="url(#cirrusGrad1)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeDasharray="80 30"
            />
          </g>
        </svg>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAYER 4: Mid Cumulus Cloud Banks (Volumetric Two-Tone Shading) */}
      {/* ------------------------------------------------------------- */}
      <div
        id="sky-layer-cumulus"
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: config.clouds.cumulusOpacity,
          willChange: 'transform',
        }}
      >
        <svg
          className="absolute top-[8%] left-0 w-[4200px] h-[550px]"
          viewBox="0 0 4200 550"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cumulusBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={config.clouds.cumulusTop} stopOpacity="0.95" />
              <stop offset="65%" stopColor={config.clouds.cumulusTop} stopOpacity="0.8" />
              <stop offset="100%" stopColor={config.clouds.cumulusBottom} stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="cumulusRimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={config.clouds.rimLightColor} stopOpacity="1.0" />
              <stop offset="40%" stopColor={config.clouds.cumulusTop} stopOpacity="0.7" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            <filter id="cumulusSoft" x="-5%" y="-10%" width="110%" height="120%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* Cumulus Cloud Puffs & Billows */}
          <g filter="url(#cumulusSoft)">
            {/* Cloud Cluster 1 (Left 0-1400) */}
            <path
              d="M-50 360 
                 C 60 300, 120 280, 200 290 
                 C 260 220, 360 210, 440 250 
                 C 500 180, 620 170, 720 220 
                 C 800 160, 920 180, 980 240 
                 C 1060 210, 1160 230, 1220 280 
                 C 1300 270, 1380 310, 1420 360 
                 L 1420 440 L -50 440 Z"
              fill="url(#cumulusBodyGrad)"
            />
            {/* Sunlit Rim Highlights */}
            <path
              d="M-40 355 
                 C 60 295, 120 275, 200 285 
                 C 260 215, 360 205, 440 245 
                 C 500 175, 620 165, 720 215 
                 C 800 155, 920 175, 980 235 
                 C 1060 205, 1160 225, 1220 275 
                 C 1300 265, 1380 305, 1410 355"
              stroke="url(#cumulusRimGrad)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />

            {/* Cloud Cluster 2 (Center 1400-2800) */}
            <path
              d="M1380 370 
                 C 1480 310, 1560 290, 1640 300 
                 C 1720 220, 1840 200, 1940 230 
                 C 2020 160, 2160 150, 2260 210 
                 C 2340 180, 2460 190, 2520 250 
                 C 2600 220, 2700 240, 2760 290 
                 C 2820 280, 2900 320, 2940 370 
                 L 2940 450 L 1380 450 Z"
              fill="url(#cumulusBodyGrad)"
            />
            {/* Center Rim Highlight */}
            <path
              d="M1390 365 
                 C 1480 305, 1560 285, 1640 295 
                 C 1720 215, 1840 195, 1940 225 
                 C 2020 155, 2160 145, 2260 205 
                 C 2340 175, 2460 185, 2520 245 
                 C 2600 215, 2700 235, 2760 285 
                 C 2820 275, 2900 315, 2930 365"
              stroke="url(#cumulusRimGrad)"
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
            />

            {/* Cloud Cluster 3 (Right 2800-4200 seamless wrap) */}
            <path
              d="M2900 360 
                 C 3000 300, 3080 280, 3160 290 
                 C 3240 210, 3360 200, 3460 240 
                 C 3540 170, 3680 160, 3780 220 
                 C 3860 170, 3960 185, 4030 245 
                 C 4100 220, 4170 240, 4220 290 
                 L 4220 440 L 2900 440 Z"
              fill="url(#cumulusBodyGrad)"
            />
            {/* Right Rim Highlight */}
            <path
              d="M2910 355 
                 C 3000 295, 3080 275, 3160 285 
                 C 3240 205, 3360 195, 3460 235 
                 C 3540 165, 3680 155, 3780 215 
                 C 3860 165, 3960 180, 4030 240 
                 C 4100 215, 4170 235, 4210 285"
              stroke="url(#cumulusRimGrad)"
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAYER 5: Distant Hyderabad Topography / Deccan Ridge Silhouette*/}
      {/* ------------------------------------------------------------- */}
      <div
        id="sky-layer-hills"
        className="absolute inset-x-0 bottom-0 h-1/2 transition-opacity duration-1000"
        style={{
          opacity: config.distantHills.opacity,
          willChange: 'transform',
        }}
      >
        <svg
          className="absolute bottom-[20%] left-0 w-[4200px] h-[220px]"
          viewBox="0 0 4200 220"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="hillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={config.distantHills.fillColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={config.fogColor} stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Deccan Plateau undulating hills & distant skyline towers */}
          <path
            d="M0 160 
               Q 250 110, 500 145 
               T 950 120 
               L 980 90 L 995 90 L 1000 125 
               T 1450 150 
               T 1850 115 
               L 1870 75 L 1885 75 L 1890 120 
               T 2350 140 
               T 2750 110 
               T 3150 135 
               L 3180 80 L 3195 80 L 3200 130 
               T 3650 150 
               T 4200 160 
               L 4200 220 L 0 220 Z"
            fill="url(#hillGrad)"
          />
        </svg>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAYER 6: Night Urban Skyglow (Cyberabad City Light Reflection) */}
      {/* ------------------------------------------------------------- */}
      {config.cityGlow.opacity > 0 && (
        <div
          id="sky-layer-cityglow"
          className="absolute inset-x-0 bottom-[15%] h-56 transition-opacity duration-1000 pointer-events-none"
          style={{
            opacity: config.cityGlow.opacity,
            background: `radial-gradient(ellipse at 50% 100%, ${config.cityGlow.color} 0%, rgba(245, 158, 11, 0.15) 45%, transparent 75%)`,
            filter: 'blur(20px)',
            mixBlendMode: 'screen',
            willChange: 'transform',
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* LAYER 7: Horizon Atmospheric Fog Blend Band                   */}
      {/* Smoothly bridges the 3D ground into the 2D sky                */}
      {/* ------------------------------------------------------------- */}
      <div
        id="sky-layer-horizon-blend"
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none transition-colors duration-1000"
        style={{
          background: `linear-gradient(to top, 
            ${config.fogColor} 0%, 
            ${config.hazeColor} 45%, 
            transparent 100%)`,
        }}
      />
    </div>
  );
}
