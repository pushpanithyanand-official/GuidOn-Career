import { useEffect, useState } from 'react';
import { callGuidon, safeError } from './api';

interface Application {
  applicationId:string;jobId:string;company:string;designation:string;location:string;
  status:string;version:number;submittedOn:string|null;cvVersionId:string|null;
  latestNote:string|null;sourceUrl:string|null;updatedAt:string|null;
}
interface Event {
  eventId:string;status:string;previousStatus:string|null;source:string;
  note:string|null;at:string|null;interview?:{startsAt:string;timezone:string;meetingUrl?:string};
}
const stages=[
  ['preparing','Preparing'],['submitted','Submitted'],['in_review','In Review'],
  ['assessment_requested','Assessment Requested'],['interview_invited','Interview Invited'],
  ['interview_scheduled','Interview Scheduled'],['interview_completed','Interview Completed'],
  ['offer_received','Offer Received'],['rejected','Rejected'],['withdrawn','Withdrawn'],
];

export default function ApplicationsPage(){
  const [apps,setApps]=useState<Application[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [events,setEvents]=useState<Event[]>([]);
  const [status,setStatus]=useState('submitted');
  const [note,setNote]=useState('');
  const [dateTime,setDateTime]=useState('');
  const [timezone,setTimezone]=useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [meetingUrl,setMeetingUrl]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  async function load(){
    setLoading(true);setError('');
    try {
      const r=await callGuidon<{applications:Application[]}>('listMyApplications',{limit:100});
      setApps(r.applications);
    } catch(e){setError(safeError(e));}
    finally{setLoading(false);}
  }
  async function openTimeline(id:string){
    setSelected(id);setEvents([]);
    try{
      const r=await callGuidon<{events:Event[]}>('getMyApplicationTimeline',{applicationId:id});
      setEvents(r.events);
      const found=apps.find(x=>x.applicationId===id);
      if(found)setStatus(found.status);
    }catch(e){setError(safeError(e));}
  }
  useEffect(()=>{load();},[]);
  async function update(){
    if(!selected)return;
    const selectedApp=apps.find(x=>x.applicationId===selected);
    if(!selectedApp)return;
    if(!window.confirm('Record this application update in your permanent history? Only confirm events that actually occurred.'))return;
    setBusy(true);setError('');setMessage('');
    try{
      const interview=status==='interview_scheduled'&&dateTime?{
        startsAt:new Date(dateTime).toISOString(),timezone,
        ...(meetingUrl.trim()?{meetingUrl:meetingUrl.trim()}:{}),
      }:undefined;
      await callGuidon('updateMyApplication',{
        applicationId:selected,eventId:crypto.randomUUID(),expectedVersion:selectedApp.version,
        status,userConfirmed:true,...(note.trim()?{note:note.trim()}:{}),
        ...(interview?{interview}:{}),
      });
      setMessage('Application timeline updated. Earlier events remain available.');
      setNote('');setDateTime('');setMeetingUrl('');
      await load();
      await openTimeline(selected);
    }catch(e){setError(safeError(e));}
    finally{setBusy(false);}
  }
  return <section className="working-page">
    <div className="eyebrow">MY APPLICATIONS</div><h1>Application history</h1>
    <p>Only submitted applications confirmed by you are recorded as Applied. Every status change has its own historical event.</p>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {message&&<p className="form-success" role="status">{message}</p>}
    {loading?<p>Loading applications…</p>:apps.length===0?<div className="form-panel">
      <h2>No applications recorded yet</h2>
      <p>From Discover Jobs, open a vacancy after submitting on the employer website, then select “I submitted this application”.</p>
      <a className="secondary-action" href="/discover">Discover jobs</a>
    </div>:<div className="job-results">{apps.map(a=><article key={a.applicationId} className="job-item">
      <div><strong>{a.designation}</strong><p>{a.company} · {a.location}</p>
        <small>{a.status.replaceAll('_',' ')} · {a.submittedOn?'Applied '+a.submittedOn:'Preparation'}</small></div>
      <div className="job-actions">
        {a.sourceUrl&&<a className="secondary-action" href={a.sourceUrl} target="_blank" rel="noopener noreferrer">Employer</a>}
        <button onClick={()=>openTimeline(a.applicationId)}>View timeline</button>
      </div>
    </article>)}</div>}
    {selected&&<div className="form-panel detail-panel">
      <div className="panel-head"><h2>Application timeline</h2><button onClick={()=>setSelected(null)}>Close</button></div>
      <div className="timeline">{events.map(event=><div className="timeline-event" key={event.eventId}>
        <strong>{event.status.replaceAll('_',' ')}</strong><small>{event.at?new Date(event.at).toLocaleString():''} · {event.source}</small>
        {event.note&&<p>{event.note}</p>}
        {event.interview&&<p>Interview: {new Date(event.interview.startsAt).toLocaleString()} ({event.interview.timezone})</p>}
      </div>)}</div>
      <h3>Record a new event</h3>
      <div className="form-grid">
        <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>
          {stages.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select></label>
        {status==='interview_scheduled'&&<>
          <label>Interview local date/time<input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} /></label>
          <label>Time zone<input value={timezone} onChange={e=>setTimezone(e.target.value)} /></label>
          <label>Meeting link (optional)<input type="url" value={meetingUrl} onChange={e=>setMeetingUrl(e.target.value)} /></label>
        </>}
        <label className="span-all">Notes<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} /></label>
      </div>
      <button disabled={busy|| (status==='interview_scheduled'&&!dateTime)} onClick={update} className="primary-action">Save confirmed event</button>
    </div>}
  </section>;
}
