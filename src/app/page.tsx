// [File: src/app/page.tsx]
// [BLOCK: Root Redirect]
// Root route immediately redirects to /menu.

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/menu');
}