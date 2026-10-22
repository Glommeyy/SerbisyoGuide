'use strict';
const services = window.Catalog.snapshot().published;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[char]));
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'serbisyoGuide.checklist.v1';
let selectedService = null;
let saved = null;
let toastTimer;
const purposeOptions = service => service.purposes;
function getRequirements(service, answers) {
  const items = service.requirements.map(item => ({ ...item }));
  if (answers.firstTime === 'yes') items.push({ id: 'first-time', text: 'Confirm first-time applicant verification', note: 'Ask whether a residency check or other supporting evidence is needed.' });
  else items.push({ id: 'previous', text: 'Previous certificate or reference, if required', note: 'Ask if a prior copy is needed for a repeat request.' });
  if (answers.category === 'minor') items.push({ id: 'minor', text: 'Confirm documents for a minor applicant', note: 'Ask about a birth certificate, parent or guardian ID, and consent requirements.' });
  if (answers.representative === 'proxy') items.push({ id: 'proxy', text: 'Confirm representative authorization requirements', note: 'Ask if representatives are accepted and whether an authorization letter and both parties’ IDs are needed.' });
  if (service.id === 'indigency') items.push({ id: 'purpose', text: `Supporting information for ${answers.purpose.toLowerCase()}`, note: 'Ask whether the receiving institution requires a referral, assessment, or purpose-specific documents.' });
  if (answers.purpose === 'Employment') items.push({ id: 'employment', text: 'Confirm employer-specific document instructions', note: 'Check whether your employer needs a particular purpose, format, or recent issue date.' });
  if (answers.purpose === 'School enrollment') items.push({ id: 'school', text: 'Confirm school-specific document instructions', note: 'Ask the school whether enrollment details or a request letter are needed.' });
  return items;
}
function validAnswers(service, answers) {
  return answers && ['yes','no'].includes(answers.firstTime) && service.purposes.includes(answers.purpose) && ['adult','minor'].includes(answers.category) && ['self','proxy'].includes(answers.representative);
}
function notify(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000);
}
function persist() {
  try {
    if (saved) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    else localStorage.removeItem(STORAGE_KEY);
    $('save-status').textContent = saved ? '✓ Progress saved on this device' : 'Your next checklist will be saved on this device';
  } catch {
    $('save-status').textContent = 'Storage unavailable · progress lasts for this visit only';
  }
}
function searchableServiceText(service) {
  const reminders = service.purposes.flatMap(purpose => ['yes','no'].flatMap(firstTime => getRequirements(service, {purpose,firstTime,category:'minor',representative:'proxy'})));
  return `${service.name} ${service.description} ${service.purposes.join(' ')} ${service.requirements.map(r => r.text + ' ' + r.note).join(' ')} ${reminders.map(r => r.text + ' ' + r.note).join(' ')} ${service.steps.join(' ')}`.toLowerCase();
}
function renderServices() {
  $('service-grid').replaceChildren();
  const query = $('service-search').value.trim().toLowerCase();
  const matches = services.filter(s => searchableServiceText(s).includes(query));
  for (const service of matches) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'service-card';
    button.setAttribute('aria-pressed', String(selectedService?.id === service.id));
    button.innerHTML = `<span class="service-icon" aria-hidden="true">${escapeHTML(service.icon)}</span><span class="card-category">${escapeHTML(service.category)}</span><h3>${escapeHTML(service.name)}</h3><p>${escapeHTML(service.description)}</p><span class="card-link">Check requirements <span aria-hidden="true">→</span></span>`;
    button.addEventListener('click', () => selectService(service, true));
    $('service-grid').append(button);
  }
  $('no-results').hidden = matches.length > 0;
  document.querySelector('.search-hint').textContent = `${matches.length} SERVICE${matches.length === 1 ? '' : 'S'}`;
}
function selectService(service, move = false, answers = null) {
  selectedService = service;
  $('questionnaire').hidden = false;
  $('question-title').textContent = service.name;
  $('question-form').reset();
  $('purpose').replaceChildren(new Option('Select your purpose', ''), ...purposeOptions(service).map(p => new Option(p,p)));
  if (answers) for (const [key,value] of Object.entries(answers)) {
    const field = $('question-form').elements.namedItem(key);
    if (field) field.value = value;
  }
  renderServices();
  if (move) { $('questionnaire').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('question-form').elements.namedItem('firstTime')[0].focus({ preventScroll: true }); }
}
function renderChecklist() {
  $('checklist-empty').hidden = !!saved; $('checklist-result').hidden = !saved;
  $('service-instructions').hidden = !saved;
  if (!saved) { $('nav-count').textContent = '0'; return; }
  const service = services.find(s => s.id === saved.serviceId);
  const items = getRequirements(service, saved.answers);
  $('result-title').textContent = service.name;
  const a = saved.answers;
  $('result-summary').textContent = `${a.firstTime === 'yes' ? 'First-time' : 'Repeat'} applicant · ${a.purpose} · ${a.category === 'minor' ? 'Minor' : 'Adult'} · ${a.representative === 'proxy' ? 'Representative applying' : 'Applicant / guardian applying'}`;
  $('checklist-items').replaceChildren();
  for (const item of items) {
    const label = document.createElement('label'); label.className = 'check-item';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = saved.checked.includes(item.id);
    const span = document.createElement('span'); const title = document.createElement('strong'); title.textContent = item.text;
    const note = document.createElement('small'); note.textContent = item.note;
    span.append(title,note); label.append(input,span); $('checklist-items').append(label);
    input.addEventListener('change', () => { saved.checked = input.checked ? [...new Set([...saved.checked,item.id])] : saved.checked.filter(id => id !== item.id); updateProgress(); applyChecklistFilter(); persist(); });
  }
  $('instructions-title').textContent = `${service.name}: sample transaction steps`;
  $('instructions-list').replaceChildren(...service.steps.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  updateProgress(); applyChecklistFilter();
}
function updateProgress() {
  const items = getRequirements(services.find(s => s.id === saved.serviceId), saved.answers);
  const done = items.filter(item => saved.checked.includes(item.id)).length;
  const percentage = Math.round(done / items.length * 100);
  $('progress-text').textContent = `${done} of ${items.length} prepared · ${items.length - done} missing`;
  $('progress-percent').textContent = `${percentage}%`;
  $('progress-bar').value = percentage;
  $('completion-message').hidden = done !== items.length;
  $('nav-count').textContent = `${done}/${items.length}`;
}
function checklistText() {
  const service = services.find(s => s.id === saved.serviceId);
  return ['SERBISYOGUIDE — DEMO PREPARATION CHECKLIST', service.name, $('result-summary').textContent, '', ...getRequirements(service,saved.answers).map(item => `[${saved.checked.includes(item.id) ? 'x' : ' '}] ${item.text}\n    ${item.note}`), '', 'SAMPLE TRANSACTION STEPS', ...service.steps.map((step,i) => `${i+1}. ${step}`), '', 'Illustrative requirements only. Verify documents, eligibility, fees, office hours, and release details with your barangay. Completing this checklist does not guarantee approval.'].join('\n');
}
$('service-search').addEventListener('input', renderServices);
$('question-form').addEventListener('submit', event => {
  event.preventDefault();
  const answers = Object.fromEntries(new FormData(event.target));
  if (!selectedService || !validAnswers(selectedService,answers)) return;
  const same = saved?.serviceId === selectedService.id && Object.keys(answers).every(key => saved.answers[key] === answers[key]);
  saved = { version:1, serviceId:selectedService.id, revision:selectedService.revision || null, answers, checked:same ? saved.checked : [] };
  renderChecklist(); persist(); $('checklist').scrollIntoView({behavior:'smooth'}); $('result-title').focus({preventScroll:true});
  notify('Your checklist is ready. Tick items as you prepare.');
});
$('print-button').addEventListener('click', () => window.print());
$('copy-button').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(checklistText()); notify('Checklist copied to clipboard.'); }
  catch { notify('Clipboard is unavailable. Use Download .txt to keep a copy.'); }
});
$('download-button').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([checklistText()], {type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = `SerbisyoGuide-${saved.serviceId}-checklist.txt`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  notify('Checklist downloaded.');
});
$('edit-button').addEventListener('click', () => { $('service-search').value = ''; selectService(services.find(s => s.id === saved.serviceId), true, saved.answers); });
$('reset-button').addEventListener('click', () => { $('reset-confirm').hidden = false; $('confirm-reset').focus(); });
$('cancel-reset').addEventListener('click', () => { $('reset-confirm').hidden = true; $('reset-button').focus(); });
$('confirm-reset').addEventListener('click', () => { saved = null; persist(); renderChecklist(); $('reset-confirm').hidden = true; selectedService = null; $('questionnaire').hidden = true; $('service-search').value = ''; renderServices(); $('checklist-empty').querySelector('a').focus(); notify('Saved checklist cleared.'); });
$('menu-toggle').addEventListener('click', () => { const open = $('main-nav').classList.toggle('open'); $('menu-toggle').setAttribute('aria-expanded',String(open)); });
$('main-nav').addEventListener('click', event => { if(event.target.closest('a')) { $('main-nav').classList.remove('open'); $('menu-toggle').setAttribute('aria-expanded','false'); } });
$('year').textContent = new Date().getFullYear();
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw); const service = services.find(s => s.id === parsed?.serviceId);
    if (parsed?.version === 1 && service && (parsed.revision || null) === (service.revision || null) && validAnswers(service,parsed.answers) && Array.isArray(parsed.checked) && parsed.checked.every(id => typeof id === 'string')) {
      saved = parsed; saved.checked = [...new Set(saved.checked)].filter(id => getRequirements(service,saved.answers).some(item => item.id === id));
      selectService(service,false,saved.answers); $('save-status').textContent = '✓ Saved checklist restored from this device';
    } else { $('save-status').textContent = 'The service or saved answers changed. Generate a fresh checklist to use current requirements.'; }
  }
} catch { $('save-status').textContent = 'Saved data unavailable · you can still create a checklist'; }
renderServices(); renderChecklist();

function applyChecklistFilter() {
  const mode = $('checklist-filter').value;
  const labels = [...$('checklist-items').children];
  for (const label of labels) {
    const checked = label.querySelector('input').checked;
    label.hidden = mode === 'missing' ? checked : mode === 'prepared' ? !checked : false;
  }
  $('filter-empty').hidden = labels.some(label => !label.hidden);
}
$('checklist-filter').addEventListener('change', applyChecklistFilter);
if (Catalog.error) { $('catalog-notice').textContent = Catalog.error; $('catalog-notice').hidden = false; }
window.addEventListener('storage', event => { if(event.key === Catalog.key || event.key === null) location.reload(); });
window.addEventListener('beforeprint', () => { for (const label of $('checklist-items').children) label.hidden = false; $('filter-empty').hidden = true; });
window.addEventListener('afterprint', applyChecklistFilter);
