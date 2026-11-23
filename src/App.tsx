import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { BriefcaseBusiness, CircleUserRound, Compass, FileText, LayoutDashboard, Menu, Settings2, UserRound, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { sections, sectionForPath, type SectionId } from './navigation';

const icons = {
  dashboard: LayoutDashboard,
  discover: Compass,
  career: UserRound,
  applications: BriefcaseBusiness,
  studio: FileText,
  settings: Settings2,
};

const comingSoon: Record<Exclude<SectionId, 'dashboard'>, { heading: string; detail: string; phase: string }> = {
  discover: { heading: 'Find opportunities worth pursuing', detail: 'Search, job details, saved opportunities and user-controlled job capture will arrive in Phase 4.', phase: 'Phase 4' },
  career: { heading: 'Build your Career Intelligence Profile', detail: 'Upload your base CV, review AI-extracted facts, then confirm your experience and preferred CV style. Manual setup will remain available.', phase: 'Phases 1–2' },
  applications: { heading: 'Keep every application organised', detail: 'Track jobs, document versions, milestones and follow-ups. Opening an external application will never automatically mark it as submitted.', phase: 'Phase 7' },
  studio: { heading: 'Make each CV relevant to the job', detail: 'Tailor documents from verified career evidence with review, edit and version history, using your preferred base CV format where possible.', phase: 'Phase 6' },
  settings: { heading: 'Your account, your data', detail: 'Private account controls, secure sign-in, preferences and privacy settings will be added with authentication and profile management.', phase: 'Phases 1–2' },
};

function navigate(path: string) {
  if (window.location.pathname !== path) window.history.pushState(null, '', path);
  window.dispatchEvent(new Event('guidon:navigate'));
}

export default function App({ user, onSignOut }: { user?: User; onSignOut?: () => Promise<void> }) {
  const [active, setActive] = useState<SectionId>(() => sectionForPath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sync = () => setActive(sectionForPath(window.location.pathname));
    window.addEventListener('popstate', sync);
    window.addEventListener('guidon:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('guidon:navigate', sync);
    };
  }, []);

  const selected = sections.find(s => s.id === active)!;
  const go = (path: string) => { navigate(path); setMenuOpen(false); };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`} aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark">G<span>.</span></span>
          <div><strong>GuidOn</strong><small>CAREER</small></div>
          <button className="mobile-close icon-button" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {sections.map(section => {
            const Icon = icons[section.id];
            return <a key={section.id} href={section.path} className={active === section.id ? 'nav-link active' : 'nav-link'} aria-current={active === section.id ? 'page' : undefined} onClick={e => { e.preventDefault(); go(section.path); }}>
              <Icon size={19} strokeWidth={1.9} /><span>{section.title}</span>
            </a>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="phase-pill"><ShieldCheck size={15} /> Independent platform build</div>
          <p>Phase 0 · Foundation preview</p>
        </div>
      </aside>
      {menuOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMenuOpen(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
          <span className="breadcrumb">Workspace <span>/</span> <strong>{selected.title}</strong></span>
          <div className="topbar-right"><span className="preview-badge">{user ? "Signed in" : "Static preview"}</span>{user && <span className="signed-in-email" title={user.email ?? ""}>{user.email}</span>}{onSignOut && <button className="signout-action" type="button" onClick={() => void onSignOut()}>Sign out</button>}<div className="avatar" aria-label={user ? "Signed-in account" : "Preview account"}><CircleUserRound size={21} /></div></div>
        </header>
        <main className="content">
          {active === 'dashboard' ? (
            <>
              <section className="welcome">
                <div className="eyebrow">YOUR CAREER WORKSPACE</div>
                <h1>A clearer path to<br /><em>what’s next.</em></h1>
                <p>One evolving profile, relevant opportunities and tailored applications — all in one place.</p>
                <div className="welcome-actions">
                  <button onClick={() => go('/career')} className="primary-action">Explore My Career <ArrowRight size={17} /></button>
                  <span>CV-first onboarding begins in Phase 2</span>
                </div>
              </section>
              <section className="section-block">
                <div className="section-heading"><div><div className="eyebrow">GETTING STARTED</div><h2>Your journey, connected</h2></div><span className="section-note">Planned product flow</span></div>
                <div className="feature-grid">
                  <article className="feature-card"><div className="feature-number">01</div><div className="feature-symbol"><UserRound size={23} /></div><h3>Your career story</h3><p>Start with a base CV. Review AI-extracted career information before it becomes verified evidence.</p><span>Coming in Phases 1–2</span></article>
                  <article className="feature-card"><div className="feature-number">02</div><div className="feature-symbol"><Compass size={23} /></div><h3>Better opportunities</h3><p>Find and save jobs that match your goals, location and experience.</p><span>Coming in Phases 4–5</span></article>
                  <article className="feature-card"><div className="feature-number">03</div><div className="feature-symbol"><FileText size={23} /></div><h3>Stronger applications</h3><p>Create accurate, tailored CVs, then manage every application and outcome.</p><span>Coming in Phases 6–7</span></article>
                </div>
              </section>
              <section className="status-panel"><div><strong>Development status</strong><p>This workspace currently previews the upcoming CV-first journey. Sign-in is supported when Firebase is configured; CV uploads, job feeds and AI generation are not enabled yet.</p></div><span>Phase 0</span></section>
            </>
          ) : active === "settings" && user ? (
            <section className="page-intro"><span className="eyebrow">PHASE 1 · ACCOUNT</span><h1>Your account</h1><p>Your Firebase sign-in is active. Your career profile and documents will be stored privately when the next phase is implemented.</p><div className="account-detail"><h2>Account information</h2><dl><dt>Email</dt><dd>{user.email ?? "Not provided"}</dd><dt>Email verification</dt><dd>{user.emailVerified ? "Verified" : "Pending verification"}</dd><dt>Sign-in provider</dt><dd>{user.providerData.map(p => p.providerId).join(", ") || "Email and password"}</dd></dl><button type="button" className="secondary-action" onClick={() => void onSignOut?.()}>Sign out</button></div></section>
          ) : (
            <section className="page-intro">
              <span className="eyebrow">{comingSoon[active].phase} · PLANNED</span>
              <h1>{comingSoon[active].heading}</h1>
              <p>{comingSoon[active].detail}</p>
              <div className="empty-state"><div className="empty-icon">{(() => { const Icon = icons[active]; return <Icon size={29} />; })()}</div><h2>Under development</h2><p>This page is a navigation preview, not a working feature. No account information or documents are being stored.</p><button className="secondary-action" onClick={() => go('/')}>Back to dashboard <ArrowRight size={16} /></button></div>
            </section>
          )}
        </main>
        <footer>GuidOn Career <span>·</span> Built around your next opportunity</footer>
      </div>
    </div>
  );
}
