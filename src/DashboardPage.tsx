import { useEffect, useState } from 'react';
import { callGuidon, safeError } from './api';
import { useSession } from './auth';

type Overview = {
  statusCounts: Record<string,number>;
  totalMatches: number;
};
type Applications = { applications: Array<{status:string}> };
type CVs = { workspaces: Array<{stage:string}> };

export default function DashboardPage(){
  const {workspace}=useSession();
  const [overview,setOverview]=useState<Overview|null>(null);
  const [applications,setApplications]=useState<Applications|null>(null);
  const [cvs,setCvs]=useState<CVs|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    Promise.all([
      callGuidon<Overview>('getMyJobListings',{filters:{statusPreset:'all'},pageSize:1}),
      callGuidon<Applications>('listMyApplications',{limit:100}),
      callGuidon<CVs>('listMyCvWorkspaces',{limit:100}),
    ]).then(([jobs,apps,workspaces])=>{
      setOverview(jobs);setApplications(apps);setCvs(workspaces);
    }).catch(e=>setError(safeError(e)));
  },[]);
  const values=[
    {name:'Discovered jobs',value:overview?.statusCounts.discovery??0},
    {name:'Favourites',value:overview?.statusCounts.favorites??0},
    {name:'CV preparing',value:overview?.statusCounts.cvPreparing??0},
    {name:'CV prepared',value:overview?.statusCounts.cvPrepared??0},
    {name:'Applications',value:applications?.applications.length??0},
    {name:'CV workspaces',value:cvs?.workspaces.length??0},
  ];
  return <div className="working-page">
    <div className="welcome">
      <div className="eyebrow">YOUR PRIVATE CAREER WORKSPACE</div>
      <h1>Your next opportunity,<br/><em>all in one place.</em></h1>
      <p>Build one verified profile, discover relevant jobs, prepare evidence-based CVs and track each application from one account.</p>
      <div className="welcome-actions"><a href="/career" className="primary-action">Open my career profile</a></div>
    </div>
    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow">WORKSPACE SUMMARY</div>
        <h2>At a glance</h2></div><span className="section-note">Private per-user records</span></div>
      <div className="overview-grid">{values.map(item=><div className="overview-card" key={item.name}>
        <strong>{item.value}</strong><span>{item.name}</span></div>)}</div>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="notice-panel">
        <strong>{workspace?.profile?.state==='user_confirmed'?'Career profile confirmed':'Finish your career profile'}</strong>
        <p>{workspace?.profile?.state==='user_confirmed'
          ?'Your confirmed facts can be referenced by future matching and CV generation.'
          :'Start with manual career facts today. Base-CV upload and AI extraction are not yet released.'}</p>
        <a className="secondary-action" href="/career">Open My Career</a>
      </div>
      <div className="form-grid quick-links">
        <a href="/discover" className="form-panel"><strong>Discover Jobs</strong><p>Save jobs, filter opportunities and mark favourite vacancies.</p></a>
        <a href="/cv-studio" className="form-panel"><strong>CV Studio</strong><p>Review the JD, confirm requirements and view score and version records.</p></a>
        <a href="/applications" className="form-panel"><strong>Applications</strong><p>View job-linked submissions and recorded interview updates.</p></a>
      </div>
    </section>
  </div>;
}
