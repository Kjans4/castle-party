'use client';

// [File: src/ui/menus/MainMenu.tsx]
// [BLOCK: Main Menu]
// Play -> /select. Settings and Exit are visible but disabled.
// Styles extracted to src/styles/MainMenu.module.css — the Play button's
// hover color swap (was inline onMouseEnter/Leave) is now a CSS :hover rule.

import { useRouter } from 'next/navigation';
import styles from '@/styles/MainMenu.module.css';

// [BLOCK: Main Menu Component]
export default function MainMenu() {
  const router = useRouter();

  return (
    <main className={styles.root}>
      {/* Background grid */}
      <div className={styles.grid} />

      {/* Beacon glow */}
      <div className={styles.glow} />

      {/* Title */}
      <div className={styles.content}>
        <h1 className={styles.title}>Castle Party</h1>
        <p className={styles.tagline}>The party isn&apos;t over until the sun comes up.</p>
      </div>

      {/* Nav buttons */}
      <nav className={styles.nav}>
        <button className={styles.playButton} onClick={() => router.push('/select')}>
          Play
        </button>

        <button className={styles.disabledButton} disabled>
          Settings
        </button>

        <button className={styles.disabledButton} disabled>
          Exit
        </button>
      </nav>

      {/* Version tag */}
      <p className={styles.version}>Phase 1 — Prototype</p>
    </main>
  );
}