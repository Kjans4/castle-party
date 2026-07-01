'use client';

// [File: src/ui/menus/PostRun.tsx]
// [BLOCK: Post Run Screen]
// Reads runResult from Zustand store (Phase 2) instead of hardcoding Victory.
// Falls back to 'victory' display if runResult is null (e.g. direct nav during dev).
// Styles extracted to src/styles/PostRun.module.css — victory/defeat theming
// (glow color, title text-shadow) expressed via a data-victory attribute
// instead of inline ternary styles.

import { useRouter } from 'next/navigation';
import { useGameStore, formatTimer } from '@/ui/store/gameStore';
import { RUN_DURATION_SECONDS } from '@/game/config/constants';
import styles from '@/styles/PostRun.module.css';

export default function PostRun() {
  const router = useRouter();
  const runTimer   = useGameStore((s) => s.runTimer);
  const runResult  = useGameStore((s) => s.runResult);
  const resetRun   = useGameStore((s) => s.resetRun);

  const isVictory = runResult !== 'defeat'; // null or 'victory' both render as Victory

  const timeSurvivedSeconds = RUN_DURATION_SECONDS - runTimer;
  const timeSurvivedDisplay = formatTimer(timeSurvivedSeconds);

  function handlePlayAgain() {
    resetRun();
    router.push('/select');
  }

  function handleMainMenu() {
    resetRun();
    router.push('/menu');
  }

  return (
    <main className={styles.root}>
      {/* Background grid */}
      <div className={styles.grid} />

      {/* Glow */}
      <div className={styles.glow} data-victory={isVictory} />

      {/* Result */}
      <div className={styles.resultBlock}>
        <p className={styles.eyebrow}>Run Complete</p>
        <h1 className={styles.resultTitle} data-victory={isVictory}>
          {isVictory ? 'Victory' : 'Defeat'}
        </h1>
      </div>

      {/* Stats */}
      <div className={styles.statsBox}>
        <p className={styles.statsLabel}>Time Survived</p>
        <p className={styles.statsValue}>{timeSurvivedDisplay}</p>
      </div>

      {/* Buttons */}
      <div className={styles.buttonRow}>
        <button className={styles.mainMenuButton} onClick={handleMainMenu}>
          Main Menu
        </button>

        <button className={styles.playAgainButton} onClick={handlePlayAgain}>
          Play Again
        </button>
      </div>
    </main>
  );
}