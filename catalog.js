/* Local-only content workflow. This is not an authentication boundary. */
(() => {
  'use strict';
  const KEY = 'serbisyoGuide.catalog.v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const cleanText = (value, max = 1000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  const validService = s => s && cleanText(s.id,100) && /^[a-z0-9-]+$/.test(s.id) && cleanText(s.name,120) && cleanText(s.description,1000) && cleanText(s.category,100) && cleanText(s.icon,10) && Array.isArray(s.purposes) && s.purposes.length > 0 && s.purposes.length <= 30 && s.purposes.every(p => cleanText(p,150)) && new Set(s.purposes).size === s.purposes.length && Array.isArray(s.requirements) && s.requirements.length > 0 && s.requirements.length <= 50 && s.requirements.every(r => r && cleanText(r.id,150) && cleanText(r.text,500) && typeof r.note === 'string' && r.note.length <= 1000) && new Set(s.requirements.map(r => r.id)).size === s.requirements.length && Array.isArray(s.steps) && s.steps.length > 0 && s.steps.length <= 50 && s.steps.every(p => cleanText(p,1000));
  let state = {version:1, published:clone(window.SERVICE_DATA), drafts:[], history:[]};
  let raw = null, error = '';
  try {
    raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.published) || !parsed.published.every(validService) || new Set(parsed.published.map(s => s.id)).size !== parsed.published.length || !Array.isArray(parsed.drafts) || !parsed.drafts.every(d => d && validService(d.service) && ['draft','pending','rejected'].includes(d.status) && cleanText(d.id,100)) || !Array.isArray(parsed.history)) throw new Error('Saved catalog is invalid.');
      state = parsed;
    }
  } catch { error = 'Saved catalog could not be read. Demo services are shown; management is disabled to protect saved data.'; }
  function commit(change) {
    if (error) throw new Error(error);
    const next = clone(state); change(next);
    try {
      if (localStorage.getItem(KEY) !== raw) throw new Error('Service information changed in another tab. Reload this page before continuing.');
      const serialized = JSON.stringify(next);
      localStorage.setItem(KEY, serialized);
      raw = serialized; state = next;
    } catch (e) { throw new Error(e.message || 'Could not save. Browser storage may be unavailable or full.'); }
  }
  function draftById(next,id) { const draft = next.drafts.find(d => d.id === id); if(!draft) throw new Error('Draft no longer exists. Refresh the list.'); return draft; }
  function log(next, action, draft, actor, note = '') {
    next.history.unshift({action,service:draft.service.name,actor,note,time:new Date().toISOString()}); next.history = next.history.slice(0,100);
  }
  window.Catalog = {
    key: KEY, validService, get error() { return error; }, snapshot: () => clone(state),
    saveDraft(service, actor, id = null) {
      if (!validService(service) || !cleanText(actor,100)) throw new Error('Enter valid service details and an editor name.');
      let result;
      commit(next => {
        if (next.drafts.some(d => d.service.id === service.id && d.id !== id)) throw new Error('This service already has an open draft. Edit that draft instead.');
        if(id) { const old = draftById(next,id); if(old.status === 'pending') throw new Error('Pending changes cannot be edited until returned for revision.'); if(old.service.id !== service.id) throw new Error('Service identity cannot change.'); }
        result = {id:id || crypto.randomUUID(),service:clone(service),editor:actor.trim(),status:'draft',updated:new Date().toISOString(),note:''};
        next.drafts = next.drafts.filter(d => d.id !== result.id); next.drafts.unshift(result); log(next,'Draft saved',result,actor);
      }); return clone(result);
    },
    submit(id, actor) { commit(next => {const d = draftById(next,id); if(d.status !== 'draft' && d.status !== 'rejected') throw new Error('This draft is already awaiting review.'); if(!cleanText(actor,100)) throw new Error('Enter an editor name.'); d.status='pending'; d.editor=actor.trim(); d.updated=new Date().toISOString(); log(next,'Submitted for review',d,actor);}); },
    review(id, reviewer, approved, note) {
      if(!cleanText(reviewer,100)) throw new Error('Enter a reviewer name.');
      if(!approved && !cleanText(note,1000)) throw new Error('Explain what must be corrected before returning this draft.');
      if(typeof note !== 'string' || note.length > 1000) throw new Error('Review notes must be 1,000 characters or fewer.');
      commit(next => {
        const d = draftById(next,id); if(d.status !== 'pending') throw new Error('Only pending changes can be reviewed.');
        if(d.editor.trim().toLowerCase() === reviewer.trim().toLowerCase()) throw new Error('Use a different reviewer name from the submitting editor for this demo review.');
        if(approved) { const service = {...d.service,revision:crypto.randomUUID(),reviewedAt:new Date().toISOString(),reviewedBy:reviewer.trim()}; const index = next.published.findIndex(s => s.id === service.id); if(index < 0) next.published.push(service); else next.published[index]=service; log(next,'Approved and published locally',d,reviewer,note); next.drafts=next.drafts.filter(item => item.id !== id); }
        else { d.status='rejected'; d.note=note.trim(); log(next,'Returned for revision',d,reviewer,note); }
      });
    }
  };
})();
