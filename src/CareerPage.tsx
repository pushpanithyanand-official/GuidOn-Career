import { useEffect, useState, type FormEvent } from 'react';
import { callGuidon, safeError } from './api';
import { useSession } from './auth';

type Metric = { id: string; label: string; value: number; unit: string; context?: string;
  verification: 'unconfirmed'|'user_confirmed' };
type Star = { id: string; situation: string; task: string; action: string; result: string;
  linkedKeyNumberIds: string[]; verification: 'unconfirmed'|'user_confirmed' };
type Experience = { id: string; title: string; employer: string; officialDepartment?: string;
  startDate?: string; endDate?: string; highlights: string[]; keyNumbers: Metric[]; starStories: Star[] };
type Education = { id: string; institution: string; credential: string; fieldOfStudy?: string;
  endDate?: string; highlights: string[]; keyNumbers: Metric[]; starStories: Star[] };
interface Profile {
  displayName?: string; headline?: string; professionalSummary?: string;
  contact?: { email?: string; city?: string; country?: string };
  skills: string[]; targetRoles: string[]; targetLocations: string[];
  experience: Experience[]; education: Education[];
}
type ProfileResponse = { confirmed: { profile: Profile; revisionId: string } | null;
  draft: { profile: Profile } | null };
const blank = (): Profile => ({
  displayName: '', headline: '', professionalSummary: '', contact: {},
  skills: [], targetRoles: [], targetLocations: [], experience: [], education: [],
});
const csv = (values: string[]) => values.join(', ');
const split = (value: string) => value.split(',').map(x => x.trim()).filter(Boolean);
const metric = (): Metric => ({ id: crypto.randomUUID(), label: '', value: 0, unit: '%',
  verification: 'unconfirmed' });
const story = (): Star => ({ id: crypto.randomUUID(), situation: '', task: '', action: '',
  result: '', linkedKeyNumberIds: [], verification: 'unconfirmed' });

export default function CareerPage() {
  const { workspace, refresh } = useSession();
  const [profile, setProfile] = useState<Profile>(blank);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [state, setState] = useState<'loading'|'draft'|'confirmed'>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function load() {
    setError('');
    try {
      const result = await callGuidon<ProfileResponse>('getMyCareerProfile');
      setProfile({ ...blank(), ...(result.draft?.profile ?? result.confirmed?.profile ?? {}) });
      setRevisionId(result.confirmed?.revisionId ?? null);
      setState(result.draft ? 'draft' : result.confirmed ? 'confirmed' : 'draft');
    } catch (cause) { setError(safeError(cause)); setState('draft'); }
  }
  useEffect(() => { load(); }, []);
  function change<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile(previous => ({ ...previous, [field]: value })); setMessage('');
  }
  function changeExp(index: number, patch: Partial<Experience>) {
    setProfile(previous => ({ ...previous, experience: previous.experience.map((item, i) =>
      i === index ? { ...item, ...patch } : item) }));
  }
  function changeEdu(index: number, patch: Partial<Education>) {
    setProfile(previous => ({ ...previous, education: previous.education.map((item, i) =>
      i === index ? { ...item, ...patch } : item) }));
  }
  async function save(confirmed: boolean) {
    setBusy(true); setMessage(''); setError('');
    try {
      if (confirmed && (!profile.displayName?.trim() ||
        (!profile.experience.length && !profile.education.length))) {
        throw new Error('Add a name and at least one education or work entry before confirming.');
      }
      if (confirmed) {
        const result = await callGuidon<{ revisionId: string }>('confirmCareerProfile', {
          profile, expectedRevisionId: revisionId, userConfirmed: true,
        });
        setRevisionId(result.revisionId); setState('confirmed');
        setMessage('Your verified career profile is saved. Later edits create a new revision.');
        await refresh();
      } else {
        await callGuidon('saveMyProfileDraft', { profile });
        setState('draft');
        setMessage('Draft saved. Draft information cannot be used as confirmed CV evidence.');
      }
    } catch (cause) { setError(safeError(cause)); }
    finally { setBusy(false); }
  }
  const formSave = (event: FormEvent) => { event.preventDefault(); save(false); };
  return <section className="working-page">
    <div className="eyebrow">CAREER INTELLIGENCE PROFILE</div>
    <h1>Build your verified career story</h1>
    <p>CV-first onboarding is the intended workflow. While secure CV upload and AI extraction remain disabled, you can enter, revise and confirm the same evidence manually.</p>
    <div className="notice-panel"><strong>Base CV upload</strong>
      <p>{workspace?.capabilities.cvUploadsEnabled && workspace.capabilities.aiProfileExtractionEnabled
        ? 'Document processing is configured; use the secure uploader when it becomes available here.'
        : 'Not enabled: CV scanning, protected uploads and AI extraction are still release gates. Do not upload personal documents through an unverified link.'}</p>
    </div>
    {state === 'loading' ? <p>Loading your profile…</p> : <form onSubmit={formSave}>
      <div className="form-panel">
        <h2>Personal and career goals</h2>
        <div className="form-grid">
          <label>Full or preferred name<input value={profile.displayName ?? ''} onChange={e => change('displayName',e.target.value)} /></label>
          <label>Professional headline<input value={profile.headline ?? ''} onChange={e => change('headline',e.target.value)} /></label>
          <label>Email<input type="email" value={profile.contact?.email ?? ''} onChange={e => change('contact',{ ...profile.contact, email: e.target.value || undefined })} /></label>
          <label>Current city<input value={profile.contact?.city ?? ''} onChange={e => change('contact',{ ...profile.contact, city: e.target.value })} /></label>
          <label>Target roles (comma separated)<input value={csv(profile.targetRoles)} onChange={e => change('targetRoles',split(e.target.value))} /></label>
          <label>Target locations (comma separated)<input value={csv(profile.targetLocations)} onChange={e => change('targetLocations',split(e.target.value))} /></label>
          <label className="span-all">Skills (comma separated)<textarea rows={2} value={csv(profile.skills)} onChange={e => change('skills',split(e.target.value))} /></label>
          <label className="span-all">Professional summary<textarea rows={3} value={profile.professionalSummary ?? ''} onChange={e => change('professionalSummary',e.target.value)} /></label>
        </div>
      </div>
      <div className="form-panel">
        <div className="panel-head"><h2>Work experience</h2><button type="button" onClick={() => change('experience',[...profile.experience,{
          id: crypto.randomUUID(), title:'', employer:'', highlights:[], keyNumbers:[], starStories:[],
        }])}>Add job</button></div>
        {profile.experience.length === 0 && <p>No employment entries yet. You can add them later.</p>}
        {profile.experience.map((entry,i) => <div key={entry.id} className="evidence-record">
          <div className="panel-head"><h3>Job {i+1}</h3>
            <button type="button" onClick={() => change('experience',profile.experience.filter(x=>x.id!==entry.id))}>Remove</button></div>
          <div className="form-grid">
            <label>Official job title<input value={entry.title} onChange={e => changeExp(i,{title:e.target.value})} /></label>
            <label>Employer<input value={entry.employer} onChange={e => changeExp(i,{employer:e.target.value})} /></label>
            <label>Official department (optional)<input value={entry.officialDepartment ?? ''} onChange={e => changeExp(i,{officialDepartment:e.target.value})} /></label>
            <label>Dates (for example 2023–2026)<input value={entry.startDate ?? ''} onChange={e => changeExp(i,{startDate:e.target.value})} /></label>
            <label className="span-all">Responsibilities and results, one per line<textarea rows={3} value={entry.highlights.join('\n')} onChange={e => changeExp(i,{highlights:e.target.value.split('\n').map(x=>x.trim()).filter(Boolean)})} /></label>
          </div>
          <EvidenceEditor metrics={entry.keyNumbers} stories={entry.starStories}
            onMetrics={keyNumbers=>changeExp(i,{keyNumbers})} onStories={starStories=>changeExp(i,{starStories})} />
        </div>)}
      </div>
      <div className="form-panel">
        <div className="panel-head"><h2>Education</h2><button type="button" onClick={()=>change('education',[...profile.education,{
          id:crypto.randomUUID(), institution:'', credential:'', highlights:[], keyNumbers:[], starStories:[],
        }])}>Add education</button></div>
        {profile.education.map((entry,i)=><div key={entry.id} className="evidence-record">
          <div className="panel-head"><h3>Education {i+1}</h3>
            <button type="button" onClick={()=>change('education',profile.education.filter(x=>x.id!==entry.id))}>Remove</button></div>
          <div className="form-grid">
            <label>Institution<input value={entry.institution} onChange={e=>changeEdu(i,{institution:e.target.value})} /></label>
            <label>Qualification<input value={entry.credential} onChange={e=>changeEdu(i,{credential:e.target.value})} /></label>
            <label>Field of study<input value={entry.fieldOfStudy??''} onChange={e=>changeEdu(i,{fieldOfStudy:e.target.value})} /></label>
            <label>Completion year or date<input value={entry.endDate??''} onChange={e=>changeEdu(i,{endDate:e.target.value})} /></label>
            <label className="span-all">Academic achievements, one per line<textarea rows={2} value={entry.highlights.join('\n')} onChange={e=>changeEdu(i,{highlights:e.target.value.split('\n').map(x=>x.trim()).filter(Boolean)})} /></label>
          </div>
          <EvidenceEditor metrics={entry.keyNumbers} stories={entry.starStories}
            onMetrics={keyNumbers=>changeEdu(i,{keyNumbers})} onStories={starStories=>changeEdu(i,{starStories})} />
        </div>)}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <div className="form-actions">
        <button disabled={busy} type="submit" className="secondary-action">Save unconfirmed draft</button>
        <button disabled={busy} type="button" className="primary-action" onClick={()=>save(true)}>
          {state === 'confirmed' ? 'Confirm new profile revision' : 'Confirm career facts'}
        </button>
      </div>
      <p className="helper-text">Confirm only facts you know are accurate. STAR stories and numbers require separate verification. A future CV generator must cite these confirmed records.</p>
    </form>}
  </section>;
}

function EvidenceEditor({ metrics,stories,onMetrics,onStories }: {
  metrics: Metric[]; stories: Star[];
  onMetrics: (value:Metric[])=>void; onStories:(value:Star[])=>void;
}) {
  const changeMetric=(i:number,patch:Partial<Metric>)=>onMetrics(metrics.map((item,j)=>i===j?{...item,...patch}:item));
  const changeStory=(i:number,patch:Partial<Star>)=>onStories(stories.map((item,j)=>i===j?{...item,...patch}:item));
  return <div className="evidence-grid">
    <div><div className="panel-head"><h4>Key numbers</h4><button type="button" onClick={()=>onMetrics([...metrics,metric()])}>Add number</button></div>
      {metrics.map((item,i)=><div className="mini-evidence" key={item.id}>
        <label>Achievement label<input value={item.label} onChange={e=>changeMetric(i,{label:e.target.value})} /></label>
        <div className="form-grid"><label>Number<input type="number" value={item.value} onChange={e=>changeMetric(i,{value:Number(e.target.value)})} /></label>
          <label>Unit<input value={item.unit} onChange={e=>changeMetric(i,{unit:e.target.value})} /></label></div>
        <label>Context<input value={item.context??''} onChange={e=>changeMetric(i,{context:e.target.value})} /></label>
        <label className="check-field"><input type="checkbox" checked={item.verification==='user_confirmed'} onChange={e=>changeMetric(i,{verification:e.target.checked?'user_confirmed':'unconfirmed'})}/>I confirm this number is accurate</label>
        <button type="button" onClick={()=>onMetrics(metrics.filter(x=>x.id!==item.id))}>Remove number</button>
      </div>)}
    </div>
    <div><div className="panel-head"><h4>STAR evidence</h4><button type="button" onClick={()=>onStories([...stories,story()])}>Add STAR</button></div>
      {stories.map((item,i)=><div className="mini-evidence" key={item.id}>
        {(['situation','task','action','result'] as const).map(field=><label key={field}>{field[0].toUpperCase()+field.slice(1)}
          <textarea rows={2} value={item[field]} onChange={e=>changeStory(i,{[field]:e.target.value})} /></label>)}
        <label className="check-field"><input type="checkbox" checked={item.verification==='user_confirmed'} onChange={e=>changeStory(i,{verification:e.target.checked?'user_confirmed':'unconfirmed'})}/>I confirm all four STAR details</label>
        <button type="button" onClick={()=>onStories(stories.filter(x=>x.id!==item.id))}>Remove STAR</button>
      </div>)}
    </div>
  </div>;
}
