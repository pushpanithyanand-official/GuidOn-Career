import { useEffect, useState, type FormEvent } from 'react';
import { callGuidon, safeError } from './api';

interface CvItem {
  workspaceId:string; jobId:string|null; folderName:string;company:string;designation:string;
  location:string;stage:string;stageVersion:number;generationMode:string;
  approvedCvVersionId:string|null;latestCvQualityPassed:boolean;
}
interface Score {
  rawAts?:{ score?:number; percentage?:number };
  recruiterFit?:{ score?:number; percentage?:number };
}
interface CvReport extends CvItem {
  gaps:Array<{id:string;kind:string;prompt:string;resolution:string}>;
  preCvScore:Score|null;postCvScores:Score[];
  tokenCounter:{totalTokens:number;requests:number;estimatedUsd:number;completeCostAvailable:boolean};
}
interface JobDetail {
  job:{id:string;company:string;designation:string;location:string;source:{url?:string}};
  originalJd:string|null;
}
const empty = {company:'',designation:'',location:'',originalJd:''};

export default function CvStudioPage(){
  const [workspaces,setWorkspaces]=useState<CvItem[]>([]);
  const [selected,setSelected]=useState<CvReport|null>(null);
  const [jobId,setJobId]=useState<string|null>(new URLSearchParams(window.location.search).get('job'));
  const [job,setJob]=useState<JobDetail|null>(null);
  const [draft,setDraft]=useState(empty);
  const [cleaned,setCleaned]=useState('');
  const [requirement,setRequirement]=useState('');
  const [keywords,setKeywords]=useState('');
  const [mode,setMode]=useState<'evidence_first'|'think_creatively'>('evidence_first');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  async function loadList(){
    setLoading(true);
    try{
      const r=await callGuidon<{workspaces:CvItem[]}>('listMyCvWorkspaces',{limit:100});
      setWorkspaces(r.workspaces);
    }catch(e){setError(safeError(e));}
    finally{setLoading(false);}
  }
  async function openWorkspace(id:string){
    setError('');
    try{
      const report=await callGuidon<CvReport>('getMyCvWorkspaceReport',{workspaceId:id});
      setSelected(report);setMode(report.generationMode==='think_creatively'?'think_creatively':'evidence_first');
      if(report.stage==='jd_review'){
        const preview=await callGuidon<{cleanedText:string}>('previewMyJdReview',{workspaceId:id});
        setCleaned(preview.cleanedText);
      }
    }catch(e){setError(safeError(e));}
  }
  useEffect(()=>{loadList();},[]);
  useEffect(()=>{
    if(!jobId)return;
    callGuidon<JobDetail>('getMyJobDetails',{jobId}).then(value=>{
      setJob(value);
      setDraft({company:value.job.company,designation:value.job.designation,
        location:value.job.location,originalJd:value.originalJd??value.job.source?.url??''});
    }).catch(e=>setError(safeError(e)));
  },[jobId]);
  async function create(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      if(draft.originalJd.trim().length<50)throw new Error('A captured or pasted job description of at least 50 characters is required.');
      const result=await callGuidon<{workspaceId:string}>('createMyCvWorkspace',{
        clientRequestId:crypto.randomUUID(),...(jobId?{jobId}:{}),
        company:draft.company,designation:draft.designation,
        location:draft.location,originalJd:draft.originalJd.trim(),
        ...(job?.job.source.url?{sourceUrl:job.job.source.url}:{}),
      });
      setMessage('Private JD audit folder created. Confirm requirements before any matching.');
      await loadList();await openWorkspace(result.workspaceId);
    }catch(e){setError(safeError(e));}
    finally{setBusy(false);}
  }
  async function chooseMode(){
    if(!selected)return;
    setBusy(true);setError('');
    try{
      const result=await callGuidon<{stageVersion:number}>('setMyCvGenerationMode',{
        workspaceId:selected.workspaceId,modeChangeId:crypto.randomUUID(),
        expectedStageVersion:selected.stageVersion,generationMode:mode,
        acknowledgeFactPreservation:true,
      });
      setMessage('Generation mode saved to the job audit trail.');
      setSelected({...selected,stageVersion:result.stageVersion,generationMode:mode});
    }catch(e){setError(safeError(e));}
    finally{setBusy(false);}
  }
  async function reviewJd(){
    if(!selected)return;
    setBusy(true);setError('');setMessage('');
    try{
      const quote=requirement.trim();
      if(!quote||!cleaned.toLowerCase().includes(quote.toLowerCase())){
        throw new Error('Paste one exact requirement quote that appears in the cleaned JD.');
      }
      const phrases=keywords.split(',').map(x=>x.trim()).filter(Boolean);
      const extracted=phrases.map(phrase=>{
        const found=cleaned.toLowerCase().indexOf(phrase.toLowerCase());
        if(found<0)throw new Error('Every keyword must appear literally in the cleaned JD: '+phrase);
        return {phrase,importance:'required',jdQuote:cleaned.slice(found,found+phrase.length)};
      });
      await callGuidon('confirmMyJdReview',{
        workspaceId:selected.workspaceId,reviewId:crypto.randomUUID(),
        expectedStageVersion:selected.stageVersion,
        cleanedText:cleaned,cleanupNotes:[],confirmedByUser:true,
        requirements:[{id:crypto.randomUUID(),text:quote,directJdQuote:quote,
          priority:'required',validation:'user_confirmed'}],
        keywords:extracted,
      });
      setMessage('JD reviewed and locked. Automated profile matching and gap scoring are the next worker integrations.');
      await openWorkspace(selected.workspaceId);await loadList();
    }catch(e){setError(safeError(e));}
    finally{setBusy(false);}
  }
  return <section className="working-page">
    <div className="eyebrow">CV STUDIO</div><h1>Prepare a job-specific CV</h1>
    <p>Verified JD, evidence, short gaps, dual scores and immutable versions all belong to a private Company · Designation · Location workspace.</p>
    <div className="notice-panel"><strong>Generation release gate</strong>
      <p>AI profile matching, DOCX generation, one-page PDF rendering and final post-CV scoring are not deployed. The current workflow supports authenticated source capture and JD review only. No placeholder CV is presented as generated.</p>
    </div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {message&&<p className="form-success" role="status">{message}</p>}
    {!selected&&<form className="form-panel" onSubmit={create}>
      <h2>Start from a vacancy</h2>
      <div className="form-grid">
        <label>Company<input value={draft.company} required onChange={e=>setDraft({...draft,company:e.target.value})} /></label>
        <label>Designation<input value={draft.designation} required onChange={e=>setDraft({...draft,designation:e.target.value})} /></label>
        <label>Location<input value={draft.location} required onChange={e=>setDraft({...draft,location:e.target.value})} /></label>
        <label className="span-all">Original JD<textarea rows={7} required minLength={50}
          value={draft.originalJd} onChange={e=>setDraft({...draft,originalJd:e.target.value})}/></label>
      </div><button type="submit" className="primary-action" disabled={busy}>Create private CV workspace</button>
    </form>}
    <div className="form-panel">
      <div className="panel-head"><h2>Saved CV workspaces</h2>
        {selected&&<button onClick={()=>{setSelected(null);setJobId(null);setJob(null);setDraft(empty);setCleaned('');}}>New workspace</button>}</div>
      {loading?<p>Loading…</p>:workspaces.length===0?<p>No saved CV workspaces yet.</p>:
        <div className="job-results">{workspaces.map(item=><article className="job-item" key={item.workspaceId}>
          <div><strong>{item.designation}</strong><p>{item.company} · {item.location}</p>
            <small>{item.stage.replaceAll('_',' ')} · {item.generationMode.replaceAll('_',' ')}</small></div>
          <button onClick={()=>openWorkspace(item.workspaceId)}>Open</button>
        </article>)}</div>}
    </div>
    {selected&&<div className="form-panel detail-panel">
      <div className="eyebrow">PRIVATE APPLICATION FOLDER</div>
      <h2>{selected.folderName}</h2>
      <p>Current stage: <strong>{selected.stage.replaceAll('_',' ')}</strong></p>
      <div className="form-grid">
        <label>CV writing mode<select value={mode} onChange={e=>setMode(e.target.value as 'evidence_first'|'think_creatively')}>
          <option value="evidence_first">Evidence First — verified facts</option>
          <option value="think_creatively">Think Creatively — verified creative reframing</option>
        </select></label>
      </div>
      <p className="helper-text">Creative mode cannot alter official employers, titles, dates or unverified numbers. Both modes must produce a one-page, no-tables ATS-friendly CV.</p>
      <button onClick={chooseMode} disabled={busy}>Save generation mode</button>
      {selected.stage==='jd_review'&&<>
        <h3>Stage 1 · Clean and approve job description</h3>
        <label>Cleaned JD<textarea rows={10} value={cleaned} onChange={e=>setCleaned(e.target.value)} /></label>
        <label>Exact required JD excerpt<input value={requirement} onChange={e=>setRequirement(e.target.value)}
          placeholder="Paste one requirement exactly from above" /></label>
        <label>Relevant exact keywords (comma-separated)<input value={keywords} onChange={e=>setKeywords(e.target.value)}
          placeholder="For example SQL, Power BI" /></label>
        <p className="helper-text">This is manual source confirmation until the AI JD analyst is connected. Only phrases grounded in the JD are accepted.</p>
        <button className="primary-action" onClick={reviewJd} disabled={busy}>Confirm JD and continue to matching queue</button>
      </>}
      <div className="stats-row">
        <div><strong>{selected.tokenCounter?.totalTokens??0}</strong><span>Model tokens recorded</span></div>
        <div><strong>{selected.tokenCounter?.requests??0}</strong><span>Model calls</span></div>
        <div><strong>{selected.postCvScores?.length??0}</strong><span>Post-CV score snapshots</span></div>
      </div>
      {selected.gaps?.length>0&&<div><h3>Brief gaps</h3>{selected.gaps.map(gap=><p key={gap.id}>{gap.prompt}</p>)}</div>}
      <div className="notice-panel"><strong>Final generation unavailable</strong>
        <p>Generate, score and approve will be enabled only after real DOCX/PDF rendering, evidence checks, one-page quality gates and both final scores pass.</p></div>
    </div>}
  </section>;
}
