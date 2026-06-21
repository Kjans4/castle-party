'use client';

// [File: src/ui/menus/MainMenu.tsx]
// [BLOCK: Main Menu]
// Pure inline styles — no Tailwind dependency.
// Play -> /select. Settings and Exit are visible but disabled.

import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react';

// [BLOCK: Shared Styles]
const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0a0a0f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: 'sans-serif',
  } as CSSProperties,

  grid: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
    backgroundSize: '64px 64px',
  } as CSSProperties,

  glow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(ellipse at center, rgba(255,140,40,0.07) 0%, transparent 70%)',
    pointerEvents: 'none',
  } as CSSProperties,

  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  } as CSSProperties,

  title: {
    fontSize: '72px',
    fontWeight: 900,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    color: '#ffffff',
    textShadow: '0 0 60px rgba(255,140,40,0.4)',
    margin: 0,
  } as CSSProperties,

  tagline: {
    fontSize: '11px',
    fontWeight: 300,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3em',
    color: 'rgba(255,255,255,0.35)',
    margin: 0,
  } as CSSProperties,

  nav: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginTop: '56px',
  } as CSSProperties,

  buttonActive: {
    width: '192px',
    padding: '12px 0',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as CSSProperties,

  buttonDisabled: {
    width: '192px',
    padding: '12px 0',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'not-allowed',
  } as CSSProperties,

  version: {
    position: 'absolute',
    bottom: '24px',
    right: '32px',
    fontSize: '10px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.12)',
  } as CSSProperties,
} as const;

// [BLOCK: Main Menu Component]
export default function MainMenu() {
  const router = useRouter();

  return (
    <main style={styles.root}>
      {/* Background grid */}
      <div style={styles.grid} />

      {/* Beacon glow */}
      <div style={styles.glow} />

      {/* Title */}
      <div style={styles.content}>
        <h1 style={styles.title}>Castle Party</h1>
        <p style={styles.tagline}>The party isn&apos;t over until the sun comes up.</p>
      </div>

      {/* Nav buttons */}
      <nav style={styles.nav}>
        <button
          style={styles.buttonActive}
          onClick={() => router.push('/select')}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,140,40,0.6)';
            (e.currentTarget as HTMLButtonElement).style.color = '#ff8c28';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,140,40,0.1)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
            (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
          }}
        >
          Play
        </button>

        <button style={styles.buttonDisabled} disabled>
          Settings
        </button>

        <button style={styles.buttonDisabled} disabled>
          Exit
        </button>
      </nav>

      {/* Version tag */}
      <p style={styles.version}>Phase 1 — Prototype</p>
    </main>
  );
}