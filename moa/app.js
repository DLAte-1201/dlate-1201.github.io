(()=>{
'use strict';
const Feed=window.MoaPublicFeed,{HubStore,STATUSES,PREFIX}=window.HubStorage;
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=(v,seconds=false)=>v?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:seconds?'medium':'short'}).format(new Date(v))+' KST':'미확인';
const kindName=k=>k==='research'?'연구':'일반';
let data=null,projects=[],lastRevision=null,feedView=null,store,state={latest:{},history:{},damaged:[]},storageError=false,kind='all',status='all',query='',selected=null,pending=null,generation=0;
const labels=Feed.LABELS,defaultStatus=p=>({active:'active',maintenance:'maintenance',completed:'completed'}[p.workClass]||'paused'),personal=p=>state.latest[p.id]?.status??defaultStatus(p);
function notify(message,error=false){$('#save-status').textContent=message;$('#save-status').dataset.error=error;$('#detail-feedback').textContent=selected?message:'';}
function resetImport(){generation++;pending=null;$('#import-file').value='';$('#import-preview').hidden=true;$('#import-preview').textContent='';}
function read(){if(!store)store=new HubStore(window.localStorage,Feed.IDS);state=store.read();storageError=false;}
try{read();}catch(e){storageError=true;notify(e.message,true);}
function detail(){
 const p=projects.find(p=>p.id===selected);if(!p)return;
 const latest=state.latest[p.id],stale=Date.now()-Date.parse(p.recordCheckedAt)>1200000;
 $('#detail-content').innerHTML='<span class="detail-kind">'+kindName(p.kind)+' 프로젝트</span><h2 id="detail-title">'+esc(p.name)+'</h2><p>확인된 주 상태 · <span class="badge">'+labels[p.workClass]+'</span></p><p>'+esc(p.summary)+'</p><dl class="feed-times"><dt>최근 결과</dt><dd>'+date(p.lastResultAt)+'</dd><dt>출처 조회</dt><dd>'+date(p.sourceQueriedAt)+'</dd><dt>자료 확인</dt><dd>'+date(p.recordCheckedAt)+(stale?' · 최근 확인되지 않음':'')+'</dd><dt>현황 갱신</dt><dd>'+date(p.sourceUpdatedAt)+'</dd></dl><section class="manage"><label for="manage-status">내 분류 · 이 기기에만 저장</label><select id="manage-status" '+(storageError?'disabled':'')+'>'+Object.entries(STATUSES).map(([k,v])=>'<option value="'+k+'" '+(personal(p)===k?'selected':'')+'>'+v+'</option>').join('')+'</select><div class="buttons"><button id="reset-status" '+(storageError||!latest?.status?'disabled':'')+'>내 분류 초기화</button><button id="restore-status" '+(storageError||!state.history[p.id]?.length?'disabled':'')+'>내 분류 되돌리기</button></div></section>';
}
function render(){
 const activeId=document.activeElement?.id;
 $('#summary').innerHTML=data?Object.entries(labels).map(([k,v])=>'<div class="stat stat-'+k+'"><span class="stat-label">'+v+'</span><span class="stat-number">'+projects.filter(p=>p.workClass===k).length+'</span></div>').join(''):'<p>확인할 수 있는 공개 자료가 없습니다.</p>';
 const scope=projects.filter(p=>kind==='all'||p.kind===kind);
 $('#status-filters').innerHTML=[['all','전체 상태'],...Object.entries(labels)].map(([k,v])=>'<button data-status="'+k+'" aria-pressed="'+(k===status)+'">'+v+(k==='all'?'':'<span>'+scope.filter(p=>p.workClass===k).length+'</span>')+'</button>').join('');
 const found=scope.filter(p=>(status==='all'||p.workClass===status)&&p.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 $('#result-count').textContent=data?found.length+' / '+scope.length:'자료 미확인';
 const order=Object.keys(labels),sorted=[...found].sort((a,b)=>order.indexOf(a.workClass)-order.indexOf(b.workClass));
 $('#projects').innerHTML=sorted.map((p,i,list)=>(i===0||list[i-1].workClass!==p.workClass?'<div class="status-group-heading"><h3>'+labels[p.workClass]+' <span>'+found.filter(q=>q.workClass===p.workClass).length+'</span></h3></div>':'')+'<article class="project-card" data-project="'+p.id+'"><div class="card-top"><span>'+kindName(p.kind)+'</span><span class="badge">'+labels[p.workClass]+'</span></div><h3>'+esc(p.name)+'</h3><p>'+esc(p.summary)+'</p><p class="card-checked" data-checked="'+p.id+'"></p><button data-detail="'+p.id+'">프로젝트 보기</button></article>').join('');
 $('#empty').hidden=!data||!!found.length;
 $('#scope').textContent=data?'공개 프로젝트 '+projects.length+'개':feedView?.error?'공개 자료를 불러오지 못했습니다.':'공개 자료를 불러오는 중입니다.';
 $('#storage-warning').hidden=!storageError&&!state.damaged.length;
 $('#storage-warning').textContent=storageError?'개인 분류를 읽거나 저장하지 못했습니다. 공개 현황은 계속 표시합니다.':state.damaged.length+'개의 해석할 수 없는 개인 기록을 그대로 보존했습니다.';
 if(selected)detail();if(activeId&&$('#detail-dialog').open)document.getElementById(activeId)?.focus();
 ageCards();
}
function ageCards(){for(const p of projects){const el=document.querySelector('[data-checked="'+p.id+'"]');if(el){const stale=Date.now()-Date.parse(p.recordCheckedAt)>1200000;el.textContent='자료 확인 '+date(p.recordCheckedAt)+(stale?' · 최근 확인되지 않음':'');el.dataset.stale=stale;}}}
function renderFeed(view){
 feedView=view;
 const refreshButton=$('#refresh-feed');refreshButton.disabled=!!view.checking;refreshButton.setAttribute('aria-busy',String(!!view.checking));refreshButton.textContent=view.checking?'확인 중…':'공개 자료 다시 확인';
 const names={unavailable:'공개 자료를 확인하지 못했습니다.',overdue:'최근 확인되지 않은 자료가 있습니다.',recentlyChecked:'자료 확인 완료','recently-checked':'자료 확인 완료','fetch-failed':'공개 자료 재조회 실패 · 이전 자료를 표시합니다.','source-unconfirmed':'자료 출처 확인이 실패해 기존 현황을 표시합니다.'};
 $('#feed-health').textContent=view.checking?'공개 자료를 확인하고 있습니다.':names[view.state]||'자료 확인 중';
 $('#feed-health').dataset.state=view.state;
 $('#refresh-feedback').textContent=view.checking?'':view.lastFetchOutcome==='unchanged'?'공개 자료 확인 완료 · 변경 없음 · '+date(view.lastAttemptFinishedAt,true):view.lastFetchOutcome==='updated'?'공개 자료 확인 완료 · 새 자료 반영 · '+date(view.lastAttemptFinishedAt,true):view.lastFetchOutcome==='failed'?'공개 자료 재조회 실패 · 이전 자료 유지':'';
 const updatedAt=view.data?.projects?.reduce((latest,p)=>!latest||Date.parse(p.sourceUpdatedAt)>Date.parse(latest)?p.sourceUpdatedAt:latest,null);
 $('#feed-times').textContent='10분마다 갱신 · 마지막 갱신 '+date(updatedAt);
 if(view.data&&view.data.revision!==lastRevision){data=view.data;projects=data.projects;lastRevision=data.revision;render();}
 else if(!data)render();else ageCards();
}
function mutate(action,value){try{state=action==='restore'?store.restore(selected):store.set(selected,value);storageError=false;render();notify('내 분류를 저장했습니다.');$('#manage-status')?.focus();}catch(e){storageError=true;render();notify(e.message,true);}}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.kind){kind=b.dataset.kind;document.querySelectorAll('[data-kind]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.kind===kind));render();}
 if(b.dataset.status){status=b.dataset.status;render();document.querySelector('[data-status="'+status+'"]')?.focus();}
 if(b.dataset.detail){selected=b.dataset.detail;$('#detail-feedback').textContent='';detail();$('#detail-dialog').showModal();$('#close-detail').focus();}
 if(b.id==='reset-status')mutate('set',null);if(b.id==='restore-status')mutate('restore');
});
document.addEventListener('change',e=>{if(e.target.id==='manage-status')mutate('set',e.target.value);});
$('#search').addEventListener('input',e=>{query=e.target.value;render();});
$('#clear-filters').addEventListener('click',()=>{kind='all';status='all';query='';$('#search').value='';document.querySelectorAll('[data-kind]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.kind==='all'));render();$('#search').focus();});
$('#close-detail').addEventListener('click',()=>$('#detail-dialog').close());
$('#detail-dialog').addEventListener('close',()=>{const id=selected;selected=null;$('#detail-feedback').textContent='';(document.querySelector('[data-detail="'+id+'"]')||$('#projects')).focus();});
$('#reread').addEventListener('click',()=>{try{read();render();notify('저장된 개인 분류를 다시 불러왔습니다.');}catch(e){storageError=true;render();notify(e.message,true);}});
window.addEventListener('storage',e=>{if(e.key?.startsWith(PREFIX))try{read();render();notify('다른 탭에서 바꾼 개인 분류를 반영했습니다.');}catch(error){notify(error.message,true);}});
$('#export-backup').addEventListener('click',()=>{try{const url=URL.createObjectURL(new Blob([JSON.stringify(store.backup(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='moa-public-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){notify(e.message,true);}});
$('#import-file').addEventListener('change',async e=>{
 const token=++generation;pending=null;$('#import-preview').hidden=true;$('#import-preview').textContent='';const file=e.target.files[0];e.target.value='';if(!file)return;
 try{if(file.size>500000)throw Error('500KB 이하의 JSON 백업을 선택하세요.');const text=await file.text();if(token!==generation)return;const backup=store.parseBackup(text),preview=store.preview(backup);pending=backup;$('#import-preview').innerHTML='<p>새로 반영할 분류 '+preview.incoming.length+'개 · 유지할 분류 '+preview.kept+'개</p><ul>'+preview.incoming.map(c=>'<li>'+esc(projects.find(p=>p.id===c.projectId)?.name||c.projectId)+' · '+(c.status?STATUSES[c.status]:'기본 분류')+'</li>').join('')+'</ul><div class="buttons"><button id="apply-import">백업 적용</button><button id="cancel-import">취소</button></div>';$('#import-preview').hidden=false;}catch(error){if(token===generation){resetImport();notify(error.message,true);}}
});
$('#import-preview').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='cancel-import')resetImport();if(b.id==='apply-import'&&pending){try{const imported=store.importBackup(pending);state=imported.state;storageError=false;resetImport();render();notify('백업 분류 '+imported.added+'개 반영 · 기존 분류 '+imported.kept+'개 유지');}catch(error){resetImport();notify(error.message,true);}}});
let storage=null;try{storage=window.localStorage;}catch{}
const controller=Feed.create({storage,fetchData:async()=>{const u=new URL('feed.json',window.location.href);u.searchParams.set('check',String(Date.now()));const r=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Public data unavailable');const text=await r.text();if(new TextEncoder().encode(text).length>200000)throw Error('Public feed too large');return JSON.parse(text);},render:renderFeed});
$('#refresh-feed').addEventListener('click',()=>controller.refresh());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)controller.refresh();});
window.addEventListener('pagehide',()=>controller.stop());
window.addEventListener('pageshow',e=>{if(e.persisted)controller.start();});
$('#build-revision').textContent='화면 버전 '+document.querySelector('meta[name="moa-public-revision"]').content.slice(0,12);
controller.start();
})();
