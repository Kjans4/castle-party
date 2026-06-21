'use client';

// [File: src/ui/menus/HeroSelect.tsx]
// [BLOCK: Hero Select Screen]
// Pure inline styles — no Tailwind dependency.
// All 3 heroes always selected in Phase 1.
// Confirm -> /game. Back -> /menu.

import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react';
import { HERO_ROSTER, type HeroConfig } from '@/game/config/heroes';
import { useGameStore } from '@/ui/store/gameStore';

// [BLOCK: Hero Card Component]
function HeroCard({ hero, selected }: { hero: HeroConfig; selected: boolean }) {
  const accentColor = hero.color;
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };
  const rgb = hexToRgb(accentColor);

  return (
    <div style={{
      width: '200px',
      padding: '24px',
      border: `1px solid ${selected ? accentColor : 'rgba(255,255,255,0.1)'}`,
      backgroundColor: selected ? `rgba(${rgb}, 0.06)` : 'rgba(255,255,255,0.02)',
      boxShadow: selected ? `0 0 24px rgba(${rgb}, 0.13)` : 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      position: 'relative',
      transition: 'all 0.15s',
    } as CSSProperties}>

      {/* Color swatch */}
      <div style={{
        height: '88px',
        width: '100%',
        backgroundColor: `rgba(${rgb}, 0.1)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '36px',
          height: '48px',
          backgroundColor: accentColor,
          opacity: selected ? 1 : 0.4,
        }} />
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: selected ? accentColor : 'rgba(255,255,255,0.35)',
          margin: 0,
        }}>
          {hero.name}
        </h3>
        <p style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.25)',
          margin: 0,
        }}>
          {hero.roles.join(' / ')}
        </p>
        <p style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: `rgba(${rgb}, 0.6)`,
          margin: 0,
        }}>
          {hero.resource}
        </p>
      </div>

      <p style={{
        fontSize: '11px',
        lineHeight: 1.6,
        color: 'rgba(255,255,255,0.35)',
        margin: 0,
      }}>
        {hero.description}
      </p>

      {/* Selected dot */}
      {selected && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: accentColor,
        }} />
      )}
    </div>
  );
}

// [BLOCK: Hero Select Component]
export default function HeroSelect() {
  const router = useRouter();
  const setSquad = useGameStore((s) => s.setSquad);
  const selectedHeroes = HERO_ROSTER;

  function handleConfirm() {
    setSquad(selectedHeroes);
    router.push('/game');
  }

  return (
    <main style={{
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
      color: '#ffffff',
    }}>

      {/* Background grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      {/* Header */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '40px',
      }}>
        <p style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.4em',
          color: 'rgba(255,255,255,0.3)',
          margin: 0,
        }}>
          Choose Your Squad
        </p>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: 0,
        }}>
          3 Heroes
        </h2>
      </div>

      {/* Hero cards */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        gap: '20px',
      }}>
        {HERO_ROSTER.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={selectedHeroes.some((h) => h.id === hero.id)}
          />
        ))}
      </div>

      {/* Count */}
      <p style={{
        position: 'relative',
        zIndex: 10,
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: 'rgba(255,255,255,0.2)',
        marginTop: '24px',
      }}>
        {selectedHeroes.length} / 3 selected
      </p>

      {/* Buttons */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        gap: '12px',
        marginTop: '32px',
      }}>
        <button
          onClick={() => router.push('/menu')}
          style={{
            width: '144px',
            padding: '12px 0',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.4)',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
          }}
        >
          Back
        </button>

        <button
          onClick={handleConfirm}
          style={{
            width: '144px',
            padding: '12px 0',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#ff8c28',
            backgroundColor: 'rgba(255,140,40,0.08)',
            border: '1px solid rgba(255,140,40,0.5)',
            cursor: 'pointer',
          }}
        >
          Confirm
        </button>
      </div>
    </main>
  );
}