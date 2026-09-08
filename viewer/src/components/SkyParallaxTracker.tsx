'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function SkyParallaxTracker() {
  const { camera } = useThree();
  const dirVec = useRef(new THREE.Vector3());
  const windElapsed = useRef(0);

  // Cached DOM references
  const domRefs = useRef<{
    gradient: HTMLElement | null;
    stars: HTMLElement | null;
    celestial: HTMLElement | null;
    cirrus: HTMLElement | null;
    cumulus: HTMLElement | null;
    hills: HTMLElement | null;
    cityglow: HTMLElement | null;
  }>({
    gradient: null,
    stars: null,
    celestial: null,
    cirrus: null,
    cumulus: null,
    hills: null,
    cityglow: null,
  });

  useEffect(() => {
    domRefs.current = {
      gradient: document.getElementById('sky-layer-gradient'),
      stars: document.getElementById('sky-layer-stars'),
      celestial: document.getElementById('sky-layer-celestial'),
      cirrus: document.getElementById('sky-layer-cirrus'),
      cumulus: document.getElementById('sky-layer-cumulus'),
      hills: document.getElementById('sky-layer-hills'),
      cityglow: document.getElementById('sky-layer-cityglow'),
    };
  }, []);

  useFrame((_, delta) => {
    // Ensure references are resolved
    const dom = domRefs.current;
    if (!dom.gradient) dom.gradient = document.getElementById('sky-layer-gradient');
    if (!dom.stars) dom.stars = document.getElementById('sky-layer-stars');
    if (!dom.celestial) dom.celestial = document.getElementById('sky-layer-celestial');
    if (!dom.cirrus) dom.cirrus = document.getElementById('sky-layer-cirrus');
    if (!dom.cumulus) dom.cumulus = document.getElementById('sky-layer-cumulus');
    if (!dom.hills) dom.hills = document.getElementById('sky-layer-hills');
    if (!dom.cityglow) dom.cityglow = document.getElementById('sky-layer-cityglow');

    // Accumulate gentle ambient wind drift
    windElapsed.current += delta;
    const windCirrus = windElapsed.current * 10; // px
    const windCumulus = windElapsed.current * 18; // px

    // Compute camera look direction
    camera.getWorldDirection(dirVec.current);
    const vx = dirVec.current.x;
    const vy = dirVec.current.y;
    const vz = dirVec.current.z;

    // Azimuth yaw in radians [-PI, PI]
    const yaw = Math.atan2(vx, vz);
    // Normalized yaw in [0, 1)
    const normYaw = (((yaw / (2 * Math.PI)) % 1) + 1) % 1;

    // Pitch in radians: vy = 0 is horizon, vy > 0 looking up, vy < 0 looking down
    const pitch = Math.asin(Math.max(-1, Math.min(1, vy)));

    // Vertical pitch response (sky moves down when looking up, moves up when looking down)
    const pitchPx = pitch * 240;

    // Dimensions for seamless wraps
    const PANO_W = 4200;
    const WRAP_1400 = 1400; // Repeat period of cumulus & hills SVGs
    const WRAP_2000 = 2000; // Repeat period of cirrus SVG

    // 1. Atmosphere Gradient (subtle vertical shift with pitch)
    if (domRefs.current.gradient) {
      const gradY = pitch * 120;
      domRefs.current.gradient.style.transform = `translate3d(0, ${gradY.toFixed(1)}px, 0)`;
    }

    // 2. Stars (tracks compass yaw with 0.85 factor, pitch with 160 factor)
    if (domRefs.current.stars) {
      const starsX = (-(normYaw * PANO_W * 0.85) % PANO_W);
      const starsY = pitch * 160;
      domRefs.current.stars.style.transform = `translate3d(${starsX.toFixed(1)}px, ${starsY.toFixed(1)}px, 0)`;
    }

    // 3. Celestial Body: Sun / Moon (tracks compass yaw 1.0x, elevation pitch)
    if (domRefs.current.celestial) {
      // 1.0x tracking puts the sun at its true azimuthal heading
      const celestX = (-(normYaw * PANO_W * 0.75) % PANO_W);
      const celestY = pitchPx * 1.1;
      domRefs.current.celestial.style.transform = `translate3d(${celestX.toFixed(1)}px, ${celestY.toFixed(1)}px, 0)`;
    }

    // 4. High Cirrus Clouds (slow 0.22x yaw parallax + wind)
    if (domRefs.current.cirrus) {
      const cirrusRaw = -(normYaw * PANO_W * 0.22) + windCirrus;
      const cirrusX = -(((Math.abs(cirrusRaw) % WRAP_2000) + WRAP_2000) % WRAP_2000);
      const cirrusY = pitchPx * 0.65;
      domRefs.current.cirrus.style.transform = `translate3d(${cirrusX.toFixed(1)}px, ${cirrusY.toFixed(1)}px, 0)`;
    }

    // 5. Mid Cumulus Cloud Bank (moderate 0.48x yaw parallax + wind + vertical depth)
    if (domRefs.current.cumulus) {
      const cumulusRaw = -(normYaw * PANO_W * 0.48) + windCumulus;
      const cumulusX = -(((Math.abs(cumulusRaw) % WRAP_1400) + WRAP_1400) % WRAP_1400);
      const cumulusY = pitchPx * 0.95;
      domRefs.current.cumulus.style.transform = `translate3d(${cumulusX.toFixed(1)}px, ${cumulusY.toFixed(1)}px, 0)`;
    }

    // 6. Distant Hills / Deccan Ridge Silhouette (grounding 0.80x yaw parallax + pitch)
    if (domRefs.current.hills) {
      const hillsRaw = -(normYaw * PANO_W * 0.8);
      const hillsX = -(((Math.abs(hillsRaw) % WRAP_1400) + WRAP_1400) % WRAP_1400);
      const hillsY = pitchPx * 1.25;
      domRefs.current.hills.style.transform = `translate3d(${hillsX.toFixed(1)}px, ${hillsY.toFixed(1)}px, 0)`;
    }

    // 7. Night Cityglow (matches horizon hills)
    if (domRefs.current.cityglow) {
      const glowRaw = -(normYaw * PANO_W * 0.8);
      const glowX = -(((Math.abs(glowRaw) % WRAP_1400) + WRAP_1400) % WRAP_1400);
      const glowY = pitchPx * 1.25;
      domRefs.current.cityglow.style.transform = `translate3d(${glowX.toFixed(1)}px, ${glowY.toFixed(1)}px, 0)`;
    }
  });

  return null;
}
