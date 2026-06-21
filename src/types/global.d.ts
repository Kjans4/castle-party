// [File: src/types/global.d.ts]
// [BLOCK: CSS Import Declaration]
// Tells TypeScript to accept CSS file imports as side-effects.
// Required because TS has no built-in understanding of .css files.

declare module '*.css';

// [BLOCK: Asset Declarations]
// Stub declarations for future asset imports (images, audio, etc.)
// Expand as needed when real art and audio are added in later phases.

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.ogg' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}