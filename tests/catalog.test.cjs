const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {randomUUID} = require('node:crypto');
function setup(initial=null, blocked=false) {
  const data=new Map(initial ? [['serbisyoGuide.catalog.v1',initial]] : []);
  const context={window:{},crypto:{randomUUID},localStorage:{getItem:key=>{if(blocked)throw Error('Storage blocked');return data.get(key)||null;},setItem:(key,value)=>{if(blocked)throw Error('Storage blocked');data.set(key,value);}}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('services.js','utf8'),context);
  vm.runInContext(fs.readFileSync('catalog.js','utf8'),context);
  return {catalog:context.window.Catalog,data,context};
}
const {catalog,data}=setup();
const original=catalog.snapshot().published[0];
const edited={...original,name:'Updated clearance',requirements:[{id:'new-id',text:'New identity proof',note:'Original and copy'}],steps:['Visit the service desk.']};
let draft=catalog.saveDraft(edited,'Editor');
assert.equal(catalog.snapshot().published[0].name,original.name,'Draft must not leak');
assert.equal(catalog.snapshot().drafts[0].status,'draft');
assert.throws(()=>catalog.review(draft.id,'Reviewer',true,''),/Only pending/);
catalog.submit(draft.id,'Editor');
assert.equal(catalog.snapshot().published[0].name,original.name,'Pending must not leak');
assert.throws(()=>catalog.saveDraft(edited,'Editor',draft.id),/Pending/);
assert.throws(()=>catalog.review(draft.id,' editor ',true,''),/different reviewer/);
assert.throws(()=>catalog.review(draft.id,'Reviewer',false,''),/Explain/);
catalog.review(draft.id,'Reviewer',false,'Confirm the ID requirements.');
assert.equal(catalog.snapshot().drafts[0].status,'rejected');
assert.equal(catalog.snapshot().published[0].name,original.name);
draft=catalog.saveDraft(edited,'Editor',draft.id);catalog.submit(draft.id,'Editor');catalog.review(draft.id,'Reviewer',true,'Verified for this test.');
assert.equal(catalog.snapshot().published[0].name,edited.name);
assert(catalog.snapshot().published[0].revision);
assert.equal(catalog.snapshot().drafts.length,0);
const restored=setup(data.get(catalog.key)).catalog;
assert.equal(restored.snapshot().published[0].requirements[0].text,'New identity proof');
const added={...original,id:'new-service',name:'New service'};
draft=catalog.saveDraft(added,'Editor');
assert.equal(catalog.snapshot().published.length,3);
assert.throws(()=>catalog.saveDraft(added,'Editor'),/open draft/);
catalog.submit(draft.id,'Editor');catalog.review(draft.id,'Reviewer',true,'');
assert.equal(catalog.snapshot().published.length,4);
assert.throws(()=>catalog.saveDraft({...original,requirements:[]},'Editor'),/valid service/);
assert.throws(()=>catalog.saveDraft({...original,purposes:['Other','Other']},'Editor'),/valid service/);
const before=JSON.stringify(catalog.snapshot());data.set(catalog.key,'changed elsewhere');
assert.throws(()=>catalog.saveDraft(edited,'Editor'),/another tab/);
assert.equal(JSON.stringify(catalog.snapshot()),before,'Failed writes must not mutate state');
assert(setup('{bad json').catalog.error);
assert(setup(null,true).catalog.error);
const ruleContext={window:{},document:{}};vm.createContext(ruleContext);vm.runInContext(fs.readFileSync('services.js','utf8'),ruleContext);
ruleContext.window.Catalog={snapshot:()=>({published:ruleContext.window.SERVICE_DATA})};
const source=fs.readFileSync('script.js','utf8');vm.runInContext(source.slice(0,source.indexOf('function notify')),ruleContext);
let cases=0;
for(const service of ruleContext.window.SERVICE_DATA) for(const firstTime of ['yes','no']) for(const purpose of service.purposes) for(const category of ['adult','minor']) for(const representative of ['self','proxy']) {
 const answers={firstTime,purpose,category,representative};assert(ruleContext.validAnswers(service,answers));
 const items=ruleContext.getRequirements(service,answers);const ids=items.map(r=>r.id);assert.equal(new Set(ids).size,ids.length);assert.equal(ids.includes('minor'),category==='minor');assert.equal(ids.includes('proxy'),representative==='proxy');cases++;
}
for(const [htmlFile,jsFile] of [['index.html','script.js'],['admin.html','admin.js']]) {
 const html=fs.readFileSync(htmlFile,'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const match of fs.readFileSync(jsFile,'utf8').matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(match[1]),`Missing ${match[1]} in ${htmlFile}`);
}
vm.runInContext(source.slice(source.indexOf('function searchableServiceText'),source.indexOf('function renderServices')),ruleContext);
for(const service of ruleContext.window.SERVICE_DATA) {
 const text=ruleContext.searchableServiceText(service);
 assert(text.includes('identification'),'Search must include base document text');
 assert(text.includes('birth certificate'),'Search must include conditional document text');
}

console.log(`PASS: draft isolation, review transitions, rejection, publication, reload persistence, new services, invalid input, concurrent edits, unavailable storage, DOM targets, document search, and ${cases} questionnaire combinations.`);
