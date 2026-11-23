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
  return sections.find(section => section.path === path)?.id ?? 'dashboard';
}
