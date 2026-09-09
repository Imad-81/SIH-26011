import { TimeOfDay } from './types';

export interface SkyPalette {
  // Gradients
  zenithColor: string;
  midColor: string;
  horizonColor: string;
  hazeColor: string;

  // Fog synchronization for Three.js
  fogColor: string;
  fogNear: number;
  fogFar: number;

  // Celestial Body
  sun: {
    visible: boolean;
    azimuthDeg: number; // 0-360 compass heading
    elevationDeg: number; // 0-90 degrees above horizon
    coreColor: string;
    coronaColor: string;
    flareColor: string;
    glowRadius: number; // px
  };

  moon: {
    visible: boolean;
    azimuthDeg: number;
    elevationDeg: number;
    glowColor: string;
    phase: number; // 0 = new, 0.5 = full
  };

  // Clouds
  clouds: {
    cirrusOpacity: number;
    cirrusTint: string;
    cumulusOpacity: number;
    cumulusTop: string;
    cumulusBottom: string;
    rimLightColor: string;
  };

  // Distant Horizon Topography (Hyderabad Deccan Ridge & Far Skyline)
  distantHills: {
    fillColor: string;
    opacity: number;
  };

  // Night Elements
  stars: {
    opacity: number;
    count: number;
  };
  cityGlow: {
    opacity: number;
    color: string;
  };

  // 3D Lighting harmonization
  directionalLight: {
    color: string;
    intensity: number;
    position: [number, number, number];
  };
  ambientLight: {
    color: string;
    intensity: number;
  };
  fillLight: {
    color: string;
    intensity: number;
  };
}

export const SKY_CONFIGS: Record<TimeOfDay, SkyPalette> = {
  day: {
    // Crisp, radiant atmospheric Rayleigh scattering
    zenithColor: '#1d4ed8', // Deep sapphire/azure zenith
    midColor: '#38bdf8',    // Sky cyan
    horizonColor: '#bae6fd', // Pale atmospheric horizon
    hazeColor: 'rgba(186, 230, 253, 0.75)',

    // Fog matches the luminous pale horizon
    fogColor: '#b0d6f5',
    fogNear: 3500,
    fogFar: 22000,

    sun: {
      visible: true,
      azimuthDeg: 65,
      elevationDeg: 52,
      coreColor: '#ffffff',
      coronaColor: 'rgba(255, 245, 204, 0.85)',
      flareColor: 'rgba(255, 230, 150, 0.35)',
      glowRadius: 280,
    },

    moon: {
      visible: false,
      azimuthDeg: 240,
      elevationDeg: 15,
      glowColor: 'rgba(255, 255, 255, 0.2)',
      phase: 0.8,
    },

    clouds: {
      cirrusOpacity: 0.75,
      cirrusTint: 'rgba(255, 255, 255, 0.8)',
      cumulusOpacity: 0.92,
      cumulusTop: '#ffffff',
      cumulusBottom: '#94a3b8',
      rimLightColor: '#ffffff',
    },

    distantHills: {
      fillColor: '#60a5fa',
      opacity: 0.35,
    },

    stars: {
      opacity: 0,
      count: 0,
    },
    cityGlow: {
      opacity: 0,
      color: '#f59e0b',
    },

    directionalLight: {
      color: '#fffbf0',
      intensity: 1.85,
      position: [2400, 3800, 1200],
    },
    ambientLight: {
      color: '#93c5fd',
      intensity: 0.75,
    },
    fillLight: {
      color: '#7dd3fc',
      intensity: 0.45,
    },
  },

  dawn: {
    // Golden hour sunrise with coral, peach, and indigo
    zenithColor: '#1e1b4b', // Deep indigo zenith
    midColor: '#be185d',    // Rich magenta-rose
    horizonColor: '#f97316', // Fiery amber-orange horizon
    hazeColor: 'rgba(249, 115, 22, 0.65)',

    fogColor: '#432342',
    fogNear: 2500,
    fogFar: 18000,

    sun: {
      visible: true,
      azimuthDeg: 80,
      elevationDeg: 14,
      coreColor: '#fffbeb',
      coronaColor: 'rgba(251, 146, 60, 0.9)',
      flareColor: 'rgba(244, 63, 94, 0.4)',
      glowRadius: 360,
    },

    moon: {
      visible: true,
      azimuthDeg: 260,
      elevationDeg: 28,
      glowColor: 'rgba(254, 240, 138, 0.35)',
      phase: 0.3,
    },

    clouds: {
      cirrusOpacity: 0.85,
      cirrusTint: 'rgba(254, 215, 170, 0.8)',
      cumulusOpacity: 0.9,
      cumulusTop: '#fed7aa',
      cumulusBottom: '#4c1d95',
      rimLightColor: '#fde047',
    },

    distantHills: {
      fillColor: '#3b0764',
      opacity: 0.6,
    },

    stars: {
      opacity: 0.35,
      count: 600,
    },
    cityGlow: {
      opacity: 0.25,
      color: '#f59e0b',
    },

    directionalLight: {
      color: '#ffb07c',
      intensity: 1.5,
      position: [3200, 1400, 1800],
    },
    ambientLight: {
      color: '#4a2545',
      intensity: 0.6,
    },
    fillLight: {
      color: '#701a75',
      intensity: 0.4,
    },
  },

  dusk: {
    // Twilight sunset with crimson, violet, and gold
    zenithColor: '#2e1065', // Deep purple-violet zenith
    midColor: '#831843',    // Twilight crimson
    horizonColor: '#ea580c', // Blazing sunset orange
    hazeColor: 'rgba(234, 88, 12, 0.6)',

    fogColor: '#341539',
    fogNear: 2500,
    fogFar: 18000,

    sun: {
      visible: true,
      azimuthDeg: 275,
      elevationDeg: 8,
      coreColor: '#ffedd5',
      coronaColor: 'rgba(239, 68, 68, 0.95)',
      flareColor: 'rgba(234, 88, 12, 0.5)',
      glowRadius: 400,
    },

    moon: {
      visible: true,
      azimuthDeg: 95,
      elevationDeg: 35,
      glowColor: 'rgba(254, 240, 138, 0.4)',
      phase: 0.6,
    },

    clouds: {
      cirrusOpacity: 0.88,
      cirrusTint: 'rgba(253, 164, 175, 0.85)',
      cumulusOpacity: 0.94,
      cumulusTop: '#f97316',
      cumulusBottom: '#3b0764',
      rimLightColor: '#fde047',
    },

    distantHills: {
      fillColor: '#1e0836',
      opacity: 0.75,
    },

    stars: {
      opacity: 0.5,
      count: 900,
    },
    cityGlow: {
      opacity: 0.4,
      color: '#f97316',
    },

    directionalLight: {
      color: '#ff6f00',
      intensity: 1.6,
      position: [-3200, 1200, -1500],
    },
    ambientLight: {
      color: '#381647',
      intensity: 0.55,
    },
    fillLight: {
      color: '#86198f',
      intensity: 0.4,
    },
  },

  night: {
    // Deep cosmic obsidian with distant HITEC city light pollution glow
    zenithColor: '#020617', // Pitch dark navy-black
    midColor: '#090d1f',    // Obsidian midnight
    horizonColor: '#0f172a', // Subtle dark horizon
    hazeColor: 'rgba(15, 23, 42, 0.8)',

    fogColor: '#080c18',
    fogNear: 3000,
    fogFar: 20000,

    sun: {
      visible: false,
      azimuthDeg: 270,
      elevationDeg: -30,
      coreColor: '#000000',
      coronaColor: 'transparent',
      flareColor: 'transparent',
      glowRadius: 0,
    },

    moon: {
      visible: true,
      azimuthDeg: 140,
      elevationDeg: 55,
      glowColor: 'rgba(186, 230, 253, 0.65)',
      phase: 0.85,
    },

    clouds: {
      cirrusOpacity: 0.35,
      cirrusTint: 'rgba(30, 41, 59, 0.5)',
      cumulusOpacity: 0.45,
      cumulusTop: '#1e293b',
      cumulusBottom: '#090d16',
      rimLightColor: '#38bdf8',
    },

    distantHills: {
      fillColor: '#05070f',
      opacity: 0.9,
    },

    stars: {
      opacity: 0.95,
      count: 3200,
    },
    cityGlow: {
      opacity: 0.5,
      color: '#f59e0b', // Cyberabad city light pollution reflection on horizon
    },

    directionalLight: {
      color: '#7dd3fc',
      intensity: 0.65,
      position: [2400, 3200, 1400],
    },
    ambientLight: {
      color: '#0a0f1d',
      intensity: 0.38,
    },
    fillLight: {
      color: '#0284c7',
      intensity: 0.3,
    },
  },
};
