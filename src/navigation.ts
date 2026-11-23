export const sections = [
  { id: 'dashboard', title: 'Dashboard', path: '/' },
  { id: 'discover', title: 'Discover Jobs', path: '/discover' },
  { id: 'career', title: 'My Career', path: '/career' },
  { id: 'applications', title: 'My Applications', path: '/applications' },
  { id: 'studio', title: 'CV Studio', path: '/cv-studio' },
  { id: 'settings', title: 'Settings', path: '/settings' },
] as const;

export type SectionId = typeof sections[number]['id'];

export function sectionForPath(path: string): SectionId {
  const canonical = path.replace(/[/]+/g, '/').replace(/[/]$/, '') || '/';
  const exact = sections.find(section => section.path === canonical);
  if (exact) return exact.id;
  if (canonical === '/jobs' || canonical.startsWith('/jobs/')) return 'discover';
  if (canonical.startsWith('/applications/')) return 'applications';
  if (canonical.startsWith('/cv-studio/')) return 'studio';
  if (canonical.startsWith('/career/')) return 'career';
  if (canonical.startsWith('/settings/')) return 'settings';
  return 'dashboard';
}
