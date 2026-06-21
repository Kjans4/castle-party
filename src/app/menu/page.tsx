// [File: src/app/menu/page.tsx]
// [BLOCK: Menu Route]
// Renders the MainMenu component.
// MainMenu is a Client Component (uses useRouter) so this page
// does not need 'use client' — Next.js inherits it from the component.

import MainMenu from '@/ui/menus/MainMenu';

export default function MenuPage() {
  return <MainMenu />;
}