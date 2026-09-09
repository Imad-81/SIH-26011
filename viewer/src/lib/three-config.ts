import * as THREE from 'three';

// Suppress known upstream deprecation notices between Three.js r183+ and @react-three/fiber v9
if (typeof window !== 'undefined') {
  const isDeprecatedNotice = (msg: unknown): boolean => {
    if (typeof msg !== 'string') return false;
    return (
      msg.includes('Clock: This module has been deprecated') ||
      msg.includes('PCFSoftShadowMap has been deprecated')
    );
  };

  // 1. Hook Three.js official internal logging dispatcher
  if (typeof THREE.setConsoleFunction === 'function') {
    THREE.setConsoleFunction((type, message, ...params) => {
      if (isDeprecatedNotice(message)) return;
      if (type === 'warn') {
        console.warn(message, ...params);
      } else if (type === 'error') {
        console.error(message, ...params);
      } else {
        console.log(message, ...params);
      }
    });
  }

  // 2. Global console.warn safety net
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (isDeprecatedNotice(args[0])) {
      return;
    }
    origWarn.apply(console, args);
  };
}
