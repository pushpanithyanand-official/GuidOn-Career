import { useEffect, useState, type FormEvent } from 'react';
import { callGuidon, safeError } from './api';

export interface ListedJob {
  id: string; company: string; designation: string; location: string; summary?: string;
  source: { name: string; category: string; url?: string };
  department?: { name: string; provenance: string };
  userState: { status: string; favorite: boolean; version: number };
  smartMatch?: { score: number|null; reasons: string[] };
}
interface ListingsResponse {
  jobs: ListedJob[]; totalMatches: number; page: number; hasMore: boolean;
  smartSortUsedConfirmedProfile: boolean; sortFallback: string|null;
  statusCounts: Record<string,number>;
}
interface DetailResponse { job: ListedJob; originalJd: string|null; isUserAdded: boolean; userState: ListedJob['userState'] }

const statusOptions = [
  ['discovered','Discovered'],['interested','Interested'],['cv_preparing','CV Preparing'],
  ['cv_prepared','CV Prepared'],['applied','Applied'],['applied_connected','Applied + Connected'],
  ['rejected','Rejected'],['not_interested','Not Interested'],['snoozed','Snoozed'],
];
const emptyJob = { company:'', designation:'', location:'', sourceUrl:'', originalJd:'' };

export default function JobsPage() {
  const [rows,setRows] = useState<ListedJob[]>([]);
  const [counts,setCounts] = useState<Record<string,number>>({});
  const [total,setTotal] = useState(0);
  const [page,setPage] = useState(1);
  const [more,setMore] = useState(false);
  const [sort,setSort] = useState('smart_match');
  const [search,setSearch] = useState('');
  const [statusPreset,setStatusPreset] = useState('active');
  const [favoritesOnly,setFavoritesOnly] = useState(false);
  const [company,setCompany] = useState('');
  const [location,setLocation] = useState('');
  const [designation,setDesignation] = useState('');
  const [department,setDepartment] = useState('');
  const [selected,setSelected] = useState<DetailResponse|null>(null);
  const [adding,setAdding] = useState(false);
  const [draft,setDraft] = useState(emptyJob);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [fallback,setFallback] = useState<string|null>(null);

  async function load(next=page) {
    setLoading(true);setError('');
    try {
      const filters = {
        search, statusPreset, favoritesOnly,
        company:{include:company.trim()?[company.trim()]:[],exclude:[]},
        location:{include:location.trim()?[location.trim()]:[],exclude:[]},
        designation:{include:designation.trim()?[designation.trim()]:[],exclude:[]},
        department:{include:department.trim()?[department.trim()]:[],exclude:[]},
      };
      const result = await callGuidon<ListingsResponse>('getMyJobListings',{
        page:next,pageSize:20,sort,filters,
      });
      setRows(result.jobs);setCounts(result.statusCounts);setTotal(result.totalMatches);
      setMore(result.hasMore);setPage(next);setFallback(result.sortFallback);
    } catch(cause){setError(safeError(cause));}
    finally{setLoading(false);}
  }
  useEffect(()=>{load(1);},[]);
  const setField=(key:keyof typeof emptyJob,value:string)=>setDraft(prev=>({...prev,[key]:value}));
  async function saveNew(e:FormEvent) {
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      const response=await callGuidon<{jobId:string;created:boolean}>('addMyManualJob',{
        clientRequestId:crypto.randomUUID(),company:draft.company,designation:draft.designation,
        location:draft.location,...(draft.sourceUrl.trim()?{sourceUrl:draft.sourceUrl.trim()}:{}),
        ...(draft.originalJd.trim()?{originalJd:draft.originalJd.trim()}:{}),
      });
      setDraft(emptyJob);setAdding(false);setMessage(response.created?'Job saved to your private discovery list.':'This vacancy was already in your list.');
      await load(1);
      await showDetails(response.jobId);
    }catch(cause){setError(safeError(cause));}
    finally{setBusy(false);}
  }
  async function showDetails(jobId:string) {
    setError('');
    try{setSelected(await callGuidon<DetailResponse>('getMyJobDetails',{jobId}));}
    catch(cause){setError(safeError(cause));}
  }
  async function decision(job:ListedJob, patch:{favorite?:boolean;status?:string}, acknowledged=false) {
    setBusy(true);setError('');
    try{
      await callGuidon('setMyJobDecision',{
        jobId:job.id, changeId:crypto.randomUUID(), expectedVersion:job.userState.version,
        ...patch, userConfirmed:acknowledged,
      });
      if(selected?.job.id===job.id)await showDetails(job.id);
      await load(page);
    }catch(cause){setError(safeError(cause));}
    finally{setBusy(false);}
  }
  async function markApplied(job:ListedJob){
    if(!window.confirm('Confirm that YOU have already submitted this application on the employer website? Opening the link or filling a form does not count.')) return;
    setBusy(true);setError('');
    try{
      await callGuidon('createMyApplication',{
        jobId:job.id,eventId:crypto.randomUUID(),status:'submitted',userConfirmed:true,
      });
      setMessage('Submitted application recorded, with a permanent user-confirmed event.');
      if(selected?.job.id===job.id)await showDetails(job.id);
      await load(page);
    }catch(cause){setError(safeError(cause));}
    finally{setBusy(false);}
  }
  const filters = <div className="filters-row">
    <label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Company, job, skills" /></label>
    <label>Company<input value={company} onChange={e=>setCompany(e.target.value)} placeholder="All companies" /></label>
    <label>Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="All locations" /></label>
    <label>Designation<input value={designation} onChange={e=>setDesignation(e.target.value)} placeholder="All designations" /></label>
    <label>Department<input value={department} onChange={e=>setDepartment(e.target.value)} placeholder="All departments" /></label>
    <label>Status<select value={statusPreset} onChange={e=>setStatusPreset(e.target.value)}>
      {['active','all','excluded','cv_pipeline','applied','unapplied'].map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}
    </select></label>
    <label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}>
      {['smart_match','newest','oldest','company_az','designation_az','location_az','recent_status_change'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}
    </select></label>
    <label className="check-field"><input type="checkbox" checked={favoritesOnly} onChange={e=>setFavoritesOnly(e.target.checked)}/>Favourites only</label>
    <div className="form-actions">
      <button type="button" onClick={()=>load(1)} disabled={loading}>Apply filters</button>
      <button type="button" onClick={()=>{
        setSearch('');setCompany('');setLocation('');setDesignation('');setDepartment('');
        setStatusPreset('active');setFavoritesOnly(false);setSort('smart_match');
        setMessage('Filters cleared. Select Apply filters to refresh.');
      }}>Clear all</button>
    </div>
  </div>;
  return <section className="working-page">
    <div className="panel-head"><div><div className="eyebrow">JOB DISCOVERY</div>
      <h1>Find and organise opportunities</h1>
      <p>Your saved states, favourites and applications stay private to your account.</p>
    </div><button className="primary-action" onClick={()=>setAdding(!adding)}>{adding?'Close':'Add a job'}</button></div>
    {adding&&<form className="form-panel" onSubmit={saveNew}>
      <h2>Add vacancy manually</h2><div className="form-grid">
        <label>Company<input required value={draft.company} onChange={e=>setField('company',e.target.value)} /></label>
        <label>Job title<input required value={draft.designation} onChange={e=>setField('designation',e.target.value)} /></label>
        <label>Location<input required value={draft.location} onChange={e=>setField('location',e.target.value)} /></label>
        <label>Employer job URL (optional)<input type="url" value={draft.sourceUrl} onChange={e=>setField('sourceUrl',e.target.value)} /></label>
        <label className="span-all">Job description (optional, at least 50 characters if provided)
          <textarea rows={6} value={draft.originalJd} onChange={e=>setField('originalJd',e.target.value)} /></label>
      </div><button disabled={busy} type="submit" className="primary-action">Save private vacancy</button>
    </form>}
    <div className="form-panel"><h2>Filter & Sort</h2>{filters}</div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {message&&<p className="form-success" role="status">{message}</p>}
    {fallback&&<p className="helper-text">Smart Sort requires a confirmed profile. Using newest vacancies instead.</p>}
    <div className="panel-head"><h2>{total} matching jobs</h2><small>{counts.favorites??0} favourites · {counts.applied??0} applied</small></div>
    {loading?<p>Loading jobs…</p>:rows.length===0?<div className="form-panel"><p>No jobs match these filters. Add a vacancy or change filters.</p></div>:
      <div className="job-results">{rows.map(job=><article className="job-item" key={job.id}>
        <div><strong>{job.designation}</strong><p>{job.company} · {job.location}</p>
          <small>{job.department?.name?job.department.name+' · ':''}{job.source.category} · {job.userState.status.replaceAll('_',' ')}</small>
          {job.smartMatch?.reasons.length?<p className="helper-text">{job.smartMatch.reasons.slice(0,2).join(' · ')}</p>:null}
        </div>
        <div className="job-actions">
          <button disabled={busy} onClick={()=>decision(job,{favorite:!job.userState.favorite})}>
            {job.userState.favorite?'★ Favourite':'☆ Favourite'}</button>
          <button onClick={()=>showDetails(job.id)}>Details</button>
          <button disabled={busy} onClick={()=>{window.location.href='/cv-studio?job='+encodeURIComponent(job.id);}}>Review JD / CV</button>
        </div>
      </article>)}</div>}
    <div className="form-actions">
      <button disabled={page<=1||loading} onClick={()=>load(page-1)}>Previous</button>
      <span>Page {page}</span>
      <button disabled={!more||loading} onClick={()=>load(page+1)}>Next</button>
    </div>
    {selected&&<div className="form-panel detail-panel"><div className="panel-head">
      <h2>{selected.job.designation} · {selected.job.company}</h2>
      <button onClick={()=>setSelected(null)}>Close</button></div>
      <p>{selected.job.location}</p>
      <p>{selected.originalJd??selected.job.summary??'Full job description has not been captured yet.'}</p>
      <div className="form-actions">
        {selected.job.source.url&&<a className="secondary-action" href={selected.job.source.url} target="_blank" rel="noopener noreferrer">Open official listing</a>}
        <button onClick={()=>{window.location.href='/cv-studio?job='+encodeURIComponent(selected.job.id);}}>Review JD / CV</button>
        {!['applied','applied_connected','rejected'].includes(selected.userState.status)
          ? <button disabled={busy} onClick={()=>markApplied(selected.job)}>I submitted this application</button>
          : <a className="secondary-action" href="/applications">View application history</a>}
      </div>
      <div className="form-grid">
        <label>Status<select value={selected.userState.status} disabled={busy} onChange={e=>{
          const status=e.target.value;
          const confirmed=['applied','applied_connected','rejected'].includes(status);
          if(confirmed&&!window.confirm('Confirm this status is based on a real application event?'))return;
          decision(selected.job,{status},confirmed);
        }}>{statusOptions.map(([key,label])=><option key={key} value={key}
            disabled={['applied','rejected'].includes(key) && selected.userState.status!==key}>{label}</option>)}</select></label>
      </div>
    </div>}
  </section>;
}
