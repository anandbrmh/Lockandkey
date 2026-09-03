import React from 'react';
import { useSelector } from 'react-redux';
import { selectWizard } from '../../features/wizard/wizardSlice';
import { Key, AlertCircle } from 'lucide-react';

export default function ReviewSubmit({ onSubmit, isSubmitting, isEditing }) {
  const wizardState = useSelector(selectWizard);
  const { lockPhoto, keyPhoto, keyCount, placementPhoto, handoverPersons } = wizardState;
  const keyCountNum = parseInt(keyCount) || 1;
  const rawPersons = Array.isArray(handoverPersons) && handoverPersons.length ? handoverPersons : [{ name: '', role: '', contact: '', keysGiven: keyCountNum, photo: null, status: 'active' }];
  const personsForDisplay = rawPersons;
  const sumGiven = personsForDisplay.reduce((s,p)=>s+(parseInt(p.keysGiven,10)||1),0);
  const photos = [{ label: 'Lock', src: lockPhoto }, { label: `Key (${keyCountNum})`, src: keyPhoto }, { label: 'Placement', src: placementPhoto }];
  const hasMissing = !lockPhoto || !keyPhoto || !placementPhoto || personsForDisplay.some(p=>!p.photo) || sumGiven !== keyCountNum;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Review</h2>
        <p className="text-xs font-mono text-zinc-500">Confirm before saving.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((p,i)=>(
          <div key={i} className="border border-zinc-200 rounded-md overflow-hidden bg-white">
            <div className="aspect-video bg-zinc-50 flex items-center justify-center overflow-hidden">{p.src ? <img src={p.src} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">missing</span>}</div>
            <div className="p-2 text-xs font-mono">{p.label}</div>
          </div>
        ))}
        {personsForDisplay.map((p,idx)=>(
          <div key={idx} className="border border-zinc-200 rounded-md overflow-hidden bg-white">
            <div className="aspect-video bg-zinc-50 flex items-center justify-center overflow-hidden relative">{p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-mono text-zinc-400">no photo</span>}<span className="absolute top-1 left-1 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded">{p.keysGiven||1} key{(p.keysGiven||1)>1?'s':''}</span></div>
            <div className="p-2"><p className="text-xs font-medium truncate">{p.name || 'Unnamed'}</p><p className="text-[11px] font-mono text-zinc-500 truncate">{p.role || '—'} · {p.status} · {p.keysGiven||1} keys</p></div>
          </div>
        ))}
      </div>
      {hasMissing && <div className="border border-zinc-200 bg-zinc-50 text-zinc-600 px-3 py-2 rounded-md text-xs flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5" /> {sumGiven !== keyCountNum ? `Allocated ${sumGiven}/${keyCountNum} keys — adjust per-person keys.` : 'Draft can be saved with only lock photo.'}</div>}
      <div className="flex justify-end">
        <button onClick={onSubmit} disabled={isSubmitting || !lockPhoto} className="wire-btn wire-btn-primary disabled:opacity-40">
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : hasMissing ? 'Save draft' : 'Submit'} <Key className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
