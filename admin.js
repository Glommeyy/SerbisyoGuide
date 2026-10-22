'use strict';
const $ = id => document.getElementById(id);
let editing = null, reviewing = null;
function message(text) { $('staff-message').textContent = text; $('staff-message').hidden = false; }
function run(action) { try { action(); } catch(e) { message(e.message); $('staff-message').scrollIntoView({block:'center'}); } }
function element(tag, text, className) { const el = document.createElement(tag); if(text !== undefined) el.textContent = text; if(className) el.className = className; return el; }
function actionButton(text, handler) { const b = element('button',text,'button secondary'); b.type='button'; b.addEventListener('click',() => run(handler)); return b; }
function showTab(review) {
  $('editor-panel').hidden = review; $('review-panel').hidden = !review;
  $('editor-tab').setAttribute('aria-pressed',String(!review)); $('review-tab').setAttribute('aria-pressed',String(review));
  $('editor-tab').className = `button ${review ? 'secondary' : 'primary'}`; $('review-tab').className = `button ${review ? 'primary' : 'secondary'}`;
}
function details(target, service) {
  target.replaceChildren(); if(!service) { target.append(element('p','New service — not yet published.')); return; }
  target.append(element('h4',service.name),element('p',service.category),element('p',service.description),element('h4','Request purposes'),element('p',service.purposes.join(', ')),element('h4','Document requirements'));
  const requirements=element('ul'); for(const item of service.requirements) requirements.append(element('li',`${item.text}${item.note ? ' — '+item.note : ''}`));
  const steps=element('ol'); for(const step of service.steps) steps.append(element('li',step));
  target.append(requirements,element('h4','Application steps'),steps);
}
function render() {
  const state = Catalog.snapshot(); $('service-list').replaceChildren(); $('review-list').replaceChildren();
  const entries = [...state.published.map(service => ({service,draft:state.drafts.find(d=>d.service.id===service.id)})),...state.drafts.filter(d=>!state.published.some(s=>s.id===d.service.id)).map(d=>({service:d.service,draft:d}))];
  for(const {service,draft} of entries) {
    const row=element('article',undefined,'staff-row'); const info=element('div');
    info.append(element('h3',service.name),element('p',draft ? `Published version unchanged · ${draft.status === 'pending' ? 'Awaiting review' : draft.status === 'rejected' ? 'Returned for revision' : 'Draft saved'}${state.published.some(s=>s.id===service.id) ? '' : ' · New service (hidden from residents)'}` : 'Published in this browser'));
    if(draft?.note) info.append(element('p',`Reviewer feedback: ${draft.note}`));
    const controls=element('div',undefined,'staff-controls');
    if(draft?.status==='pending') controls.append(actionButton('View review',()=>{showTab(true);openReview(draft.id);}));
    else controls.append(actionButton(draft ? 'Edit draft' : 'Edit service',()=>openEditor(service,draft)));
    if(draft && draft.status!=='pending') controls.append(actionButton('Submit for review',()=>{Catalog.submit(draft.id,draft.editor); if(editing?.draftId===draft.id){editing=null;$('edit-panel').hidden=true;} render();message('Submitted. Residents still see the current published version.');}));
    row.append(info,controls);$('service-list').append(row);
  }
  const pending = state.drafts.filter(d=>d.status==='pending'); $('pending-count').textContent=pending.length;
  if(!pending.length) $('review-list').append(element('p','No changes are awaiting review.','empty-search'));
  for(const draft of pending) {const row=element('article',undefined,'staff-row');const info=element('div');info.append(element('h3',draft.service.name),element('p',`Submitted by ${draft.editor} · ${new Date(draft.updated).toLocaleString()}`));row.append(info,actionButton('Compare & review',()=>openReview(draft.id)));$('review-list').append(row);}
  $('history-list').replaceChildren();
  if(!state.history.length) $('history-list').append(element('p','No activity yet.','fine-print'));
  for(const event of state.history) $('history-list').append(element('p',`${new Date(event.time).toLocaleString()} · ${event.action} · ${event.service} · ${event.actor}${event.note ? ' · '+event.note : ''}`,'history-item'));
}
function openEditor(service=null,draft=null) {
  if(editing && !window.confirm('Discard the unsaved form and open another service?')) return;
  const value=draft?.service || service;
  editing={serviceId:value?.id || `service-${crypto.randomUUID()}`,draftId:draft?.id || null,original:value};
  $('service-form').reset(); $('edit-title').textContent=value ? `Edit ${value.name}` : 'Add a barangay service';
  $('editor-name').value=draft?.editor || '';
  if(value) {
    $('service-name').value=value.name; $('service-category').value=value.category; $('service-description').value=value.description;
    $('service-purposes').value=value.purposes.join('\n'); $('service-requirements').value=value.requirements.map(r=>`${r.text} | ${r.note}`).join('\n'); $('service-steps').value=value.steps.join('\n');
  }
  $('edit-panel').hidden=false; $('edit-panel').scrollIntoView({block:'start',behavior:'smooth'});$('editor-name').focus({preventScroll:true});
}
function openReview(id) {
  const state=Catalog.snapshot(); const draft=state.drafts.find(d=>d.id===id && d.status==='pending'); if(!draft) throw new Error('Pending draft was not found.');
  reviewing=id; $('review-title').textContent=`Review: ${draft.service.name}`; $('review-author').textContent=`Submitting editor: ${draft.editor}`;
  details($('current-details'),state.published.find(s=>s.id===draft.service.id));details($('proposed-details'),draft.service);
  $('review-form').reset(); $('review-detail').hidden=false; $('review-detail').scrollIntoView({block:'start',behavior:'smooth'});
}
const lines = value => value.split('\n').map(s=>s.trim()).filter(Boolean);
$('service-form').addEventListener('submit',event=>{event.preventDefault();run(()=>{
  if(!editing) throw new Error('Open a service first.');
  const service={id:editing.serviceId,name:$('service-name').value.trim(),category:$('service-category').value.trim(),description:$('service-description').value.trim(),icon:editing.original?.icon || '▤',purposes:lines($('service-purposes').value),steps:lines($('service-steps').value),requirements:lines($('service-requirements').value).map((line,index)=>{const [text,...note]=line.split('|');return {id:`document-${index}`,text:text.trim(),note:note.join('|').trim()};})};
  const draft=Catalog.saveDraft(service,$('editor-name').value.trim(),editing.draftId); editing=null; $('edit-panel').hidden=true; render();message(`Draft saved for ${draft.service.name}. Submit it for review when ready.`);
});});
$('review-form').addEventListener('submit',event=>{event.preventDefault();run(()=>{
  if(!reviewing) throw new Error('Select a pending draft.');
  const approved=event.submitter?.value==='approve'; Catalog.review(reviewing,$('reviewer-name').value.trim(),approved,$('review-note').value.trim());
  reviewing=null;$('review-detail').hidden=true;render();message(approved ? 'Approved and published in this browser. Open the resident website to see it.' : 'Returned for revision. The published service was not changed.');
});});
$('new-service').addEventListener('click',()=>run(()=>openEditor()));
$('cancel-edit').addEventListener('click',()=>{editing=null;$('edit-panel').hidden=true;});
$('editor-tab').addEventListener('click',()=>showTab(false)); $('review-tab').addEventListener('click',()=>showTab(true));
window.addEventListener('beforeunload',event=>{if(editing){event.preventDefault();event.returnValue='';}});
window.addEventListener('storage',event=>{if(event.key===Catalog.key || event.key===null) message('Catalog changed in another tab. Reload before saving or reviewing. Unsaved form contents have been kept.');});
render(); if(Catalog.error) {message(Catalog.error); for(const button of document.querySelectorAll('main button')) button.disabled=true;}
