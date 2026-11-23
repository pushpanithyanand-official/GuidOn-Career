import { useEffect, useState } from 'react';
import { BriefcaseBusiness, CircleUserRound, Compass, FileText, LayoutDashboard, Menu, Settings2, UserRound, X, ShieldCheck } from 'lucide-react';
import { sections, sectionForPath, type SectionId } from './navigation';
import { useSession } from './auth';
import CareerPage from './CareerPage';
import JobsPage from './JobsPage';
import ApplicationsPage from './ApplicationsPage';
import CvStudioPage from './CvStudioPage';
import DashboardPage from './DashboardPage';

const icons = {
  dashboard: LayoutDashboard, discover: Compass, career: UserRound,
  applications: BriefcaseBusiness, studio: FileText, settings: Settings2,
};
function navigate(path: string) {
  if (window.location.pathname !== path) window.history.pushState(null, '', path);
  window.dispatchEvent(new Event('guidon:navigate'));
}
function SettingsPage(){
  const {user,workspace,logout}=useSession();
  return <section className="working-page"><div className="eyebrow">ACCOUNT SETTINGS</div>
    <h1>Private workspace settings</h1>
    <div className="form-panel"><h2>Your account</h2>
      <p>Signed in as: <strong>{user?.email??'Google account'}</strong></p>
      <p>Workspace ID: {workspace?.uid??'Not connected'}</p>
      <button className="secondary-action" onClick={logout}>Sign out</button>
    </div>
    <div className="notice-panel"><strong>Gmail and application tracking</strong>
      <p>Email job alerts and automated interview tracking are on the future roadmap. No Gmail permissions or mailbox access have been requested.</p>
    </div>
    <div className="notice-panel"><strong>Document security</strong>
      <p>Base-CV uploads, AI extraction and production data export/deletion are gated pending scanning, ownership, retention and privacy review.</p>
    </div>
  </section>;
}
export default function App() {
  const { configured,user,logout }=useSession();
  const [active,setActive]=useState<SectionId>(()=>sectionForPath(window.location.pathname));
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{
    const sync=()=>setActive(sectionForPath(window.location.pathname));
    window.addEventListener('popstate',sync);
    window.addEventListener('guidon:navigate',sync);
    return()=>{window.removeEventListener('popstate',sync);
      window.removeEventListener('guidon:navigate',sync);};
  },[]);
  const selected=sections.find(x=>x.id===active)!;
  const go=(path:string)=>{navigate(path);setMenuOpen(false);};
  function currentPage(){
    if (!configured) {
      return <section className="working-page"><div className="eyebrow">DEPLOYMENT PREVIEW</div>
        <h1>GuidOn Career foundation</h1>
        <p>The independent Firebase web application has not been configured in this deployment. Account registration, uploads, private jobs and AI generation are not enabled yet.</p>
        <div className="notice-panel"><strong>No account information or documents are being stored</strong>
          <p>Connect the Firebase project's public web configuration and deploy the authenticated backend before using real candidate data.</p></div>
      </section>;
    }
    switch(active){
      case 'dashboard': return <DashboardPage />;
      case 'discover': return <JobsPage />;
      case 'career': return <CareerPage />;
      case 'applications': return <ApplicationsPage />;
      case 'studio': return <CvStudioPage />;
      case 'settings': return <SettingsPage />;
    }
  }
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen?'sidebar--open':''}`} aria-label="Primary navigation">
      <div className="brand"><span className="brand-mark">G<span>.</span></span>
        <div><strong>GuidOn</strong><small>CAREER</small></div>
        <button className="mobile-close icon-button" aria-label="Close menu" onClick={()=>setMenuOpen(false)}><X size={20}/></button>
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{sections.map(section=>{
        const Icon=icons[section.id];
        return <a key={section.id} href={section.path}
          className={active===section.id?'nav-link active':'nav-link'}
          aria-current={active===section.id?'page':undefined}
          onClick={e=>{e.preventDefault();go(section.path);}}>
          <Icon size={19} strokeWidth={1.9}/><span>{section.title}</span></a>;
      })}</nav>
      <div className="sidebar-bottom"><div className="phase-pill"><ShieldCheck size={15}/> Private GuidOn account</div>
        <p>{configured?'Core platform implementation':'Firebase setup required'}</p></div>
    </aside>
    {menuOpen&&<button aria-label="Close navigation" className="mobile-scrim" onClick={()=>setMenuOpen(false)}/>}
    <div className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open menu" onClick={()=>setMenuOpen(true)}><Menu size={22}/></button>
        <span className="breadcrumb">Workspace <span>/</span><strong>{selected.title}</strong></span>
        <div className="topbar-right">
          <span className="preview-badge">{configured?'Private account':'Not connected'}</span>
          {configured&&user&&<button className="topbar-signout" onClick={logout}>Sign out</button>}
          <div className="avatar" aria-label={user?.email??'Career account'}><CircleUserRound size={21}/></div>
        </div>
      </header>
      <main className="content">{currentPage()}</main>
      <footer>GuidOn Career <span>·</span> Verified evidence and user-controlled applications</footer>
    </div>
  </div>;
}
