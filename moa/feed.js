(function(root){
'use strict';
const validISO=typeof module!=='undefined'?require('./dates.js').validISO:v=>root.MoaDates.validISO(v);
const LEGACY_IDS=['mirrorrun','nunchi','goose','anchor','groundwork','skill-dividend','pass-the-buck','seed-vault','portfolio'];
const IDS=['mirrorrun','nunchi','goose','anchor','groundwork','skill-dividend','pass-the-buck','back-on-track','show-your-work','pick-up-the-thread','seed-vault','portfolio'];
const SCOPES={'moa-public-approved-20261025-v1':{ids:LEGACY_IDS,research:7,rank:1},'moa-public-approved-20261025-v2':{ids:IDS,research:10,rank:2}};
const CURRENT_POLICY='moa-public-approved-20261025-v2',CACHE_KEY='moa-public.feed.v3.scope12',LEGACY_CACHE_KEY='moa-public.feed.v2';
const LABELS=Object.freeze({active:'작업 진행 중',technical:'기술·접근 차단',decision:'사용자 결정 대기',input:'자료 입력 대기',held:'사용자 보류',maintenance:'유지관리',completed:'프로젝트 종료'});
const keys=(o,want)=>o&&typeof o==='object'&&!Array.isArray(o)&&JSON.stringify(Object.keys(o).sort())===JSON.stringify([...want].sort());
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
async function sha(v){const text=typeof v==='string'?v:canonical(v);if(typeof module!=='undefined')return require('node:crypto').createHash('sha256').update(text).digest('hex');return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
function safeText(v,max){if(typeof v!=='string'||!v.trim()||v.length>max||/[<>]/.test(v)||/(?:[A-Z]:\\|\/Users\/|\/workspace\/|libfile_|01a[0-9a-f]{5}-|\bsk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\.moa-local|project-hub\.v1\.event\.)/i.test(v))throw Error('공개 문구의 형식이나 포함 내용을 확인할 수 없습니다.');return v;}
function stamp(v,now,nullable=false){if(v===null&&nullable)return null;if(!validISO(v)||Date.parse(v)>now+60000)throw Error('자료 시각이 올바르지 않습니다.');return v;}
function validate(data,{now=Date.now(),previous=null}={}){
 if(!keys(data,['schemaVersion','policyRevision','revision','dataRevision','factsHash','generatedAt','projects','sourceHealth','publication'])||data.schemaVersion!==2||typeof data.policyRevision!=='string'||!Object.hasOwn(SCOPES,data.policyRevision)||!/^[a-f0-9]{64}$/.test(data.revision)||!/^[a-f0-9]{64}$/.test(data.dataRevision)||!/^[a-f0-9]{64}$/.test(data.factsHash))throw Error('공개 자료 계약이 올바르지 않습니다.');
 stamp(data.generatedAt,now);
 const scope=SCOPES[data.policyRevision];
 if(previous&&SCOPES[previous.policyRevision]?.rank>scope.rank)throw Error('이전 공개목록으로 현재 범위를 되돌릴 수 없습니다.');
 if(!Array.isArray(data.projects)||data.projects.length!==scope.ids.length)throw Error('공개 프로젝트 범위가 다릅니다.');
 data.projects.forEach((p,i)=>{
  if(!keys(p,['id','name','kind','workClass','summary','lastResultAt','sourceQueriedAt','recordCheckedAt','sourceUpdatedAt'])||p.id!==scope.ids[i]||p.kind!==(i<scope.research?'research':'general')||typeof p.workClass!=='string'||!Object.hasOwn(LABELS,p.workClass))throw Error('공개 항목의 자료형이나 상태가 올바르지 않습니다.');
  safeText(p.name,80);safeText(p.summary,180);stamp(p.lastResultAt,now,true);stamp(p.sourceQueriedAt,now,true);stamp(p.recordCheckedAt,now);stamp(p.sourceUpdatedAt,now);
  if(p.sourceQueriedAt&&Date.parse(p.sourceQueriedAt)>Date.parse(p.recordCheckedAt))throw Error('출처 조회·자료 확인 시각 불일치');
  if(p.lastResultAt&&Date.parse(p.lastResultAt)>Date.parse(p.recordCheckedAt)+60000)throw Error('결과·확인 시각이 맞지 않습니다.');
  const old=previous?.projects.find(q=>q.id===p.id);
  if(old&&Date.parse(p.recordCheckedAt)<Date.parse(old.recordCheckedAt))throw Error('이전 확인기록은 현재 자료를 덮어쓸 수 없습니다.');
 });
 if(!keys(data.sourceHealth,['state','failedAt'])||!['ok','unconfirmed'].includes(data.sourceHealth.state))throw Error('자료 확인 상태가 올바르지 않습니다.');
 stamp(data.sourceHealth.failedAt,now,true);
 if(data.sourceHealth.state==='ok'&&data.sourceHealth.failedAt!==null)throw Error('자료 상태·실패 시각 불일치');
 if(data.sourceHealth.state==='unconfirmed'&&data.sourceHealth.failedAt===null)throw Error('실패 확인 시각 누락');
 if(data.publication!==null){
  const p=data.publication;
  if(!keys(p,['feedRevision','commit','deployedAt','verifiedAt'])||!/^[a-f0-9]{64}$/.test(p.feedRevision)||!/^[a-f0-9]{40}$/.test(p.commit))throw Error('게시 확인기록 형식이 올바르지 않습니다.');
  stamp(p.deployedAt,now);stamp(p.verifiedAt,now);
  if(Date.parse(p.deployedAt)>Date.parse(p.verifiedAt))throw Error('게시·확인 시각 불일치');
 }
 if(previous&&Date.parse(data.generatedAt)<Date.parse(previous.generatedAt))throw Error('이전 생성자료는 현재 자료를 덮어쓸 수 없습니다.');
 return data;
}
async function verify(data,options){validate(data,options);const {revision,...body}=data;if(await sha(body)!==revision)throw Error('공개 자료 해시가 일치하지 않습니다.');const facts=data.projects.map(({sourceQueriedAt,recordCheckedAt,sourceUpdatedAt,...p})=>p);if(await sha(facts)!==data.factsHash||await sha({schemaVersion:data.schemaVersion,policyRevision:data.policyRevision,projects:data.projects,sourceHealth:data.sourceHealth,factsHash:data.factsHash})!==data.dataRevision)throw Error('공개 내용·확인기록 해시가 일치하지 않습니다.');return data;}
function assess(data,{now=Date.now(),fetchError=false}={}){
 if(!data)return{state:'unavailable',cards:[],publishedAt:null};
 const cards=data.projects.map(p=>({id:p.id,stale:now-Date.parse(p.recordCheckedAt)>1200000}));
 const currentPublication=data.publication?.feedRevision===data.dataRevision?data.publication:null;
 return{state:fetchError?'fetch-failed':data.sourceHealth.state==='unconfirmed'?'source-unconfirmed':cards.some(p=>p.stale)?'overdue':'recently-checked',cards,publishedAt:currentPublication?.deployedAt||null,lastConfirmedPublication:data.publication};
}
function create({fetchData,render,storage=null,now=Date.now,setTimer=setInterval,clearTimer=clearInterval}){
 let current=null,pending=null,error=null,lastFetchedAt=null,timer=null,ageTimer=null,checking=false,lastFetchOutcome=null,lastAttemptFinishedAt=null;
 let scopeFloorSeen=false;
 async function newCache(){let raw;try{raw=storage?.getItem(CACHE_KEY);if(raw===null||raw===undefined)return{exists:false,data:null};scopeFloorSeen=true;if(typeof raw!=='string'||raw.length>=200000)return{exists:true,data:null};const data=await verify(JSON.parse(raw),{now:now()});return{exists:true,data:data.policyRevision===CURRENT_POLICY?data:null};}catch{return{exists:raw!==null&&raw!==undefined,data:null};}}
 function view(){render({data:current,...assess(current,{now:now(),fetchError:!!error}),error,lastFetchedAt,checking,lastFetchOutcome,lastAttemptFinishedAt});}
 async function seed(){if(current){view();return;}const cached=await newCache();if(cached.exists)current=cached.data;else try{const raw=storage?.getItem(LEGACY_CACHE_KEY);if(raw&&raw.length<200000){const legacy=await verify(JSON.parse(raw),{now:now()}),appeared=await newCache();if(appeared.exists)current=appeared.data;else{current=legacy;if(current.policyRevision===CURRENT_POLICY){scopeFloorSeen=true;try{storage?.setItem(CACHE_KEY,JSON.stringify(current));}catch{}}}}}catch{}view();}
 function refresh(){if(pending)return pending;checking=true;pending=Promise.resolve().then(async()=>{try{
  const incoming=await fetchData();if(current?.policyRevision!==CURRENT_POLICY){const shared=await newCache();if(shared.data)current=shared.data;}
  if(scopeFloorSeen&&incoming?.policyRevision!==CURRENT_POLICY)throw Error('이전 캐시 세대의 자료로 현재 공개 범위를 되돌릴 수 없습니다.');
  const next=await verify(incoming,{now:now(),previous:current});
  lastFetchOutcome=current?.revision===next.revision?'unchanged':'updated';current=next;lastFetchedAt=new Date(now()).toISOString();error=null;
  if(next.policyRevision===CURRENT_POLICY){scopeFloorSeen=true;try{storage?.setItem(CACHE_KEY,JSON.stringify(next));}catch{}}
 }catch{lastFetchOutcome='failed';error='공개 자료를 다시 읽지 못했습니다. 이전 자료를 유지합니다.';}finally{lastAttemptFinishedAt=new Date(now()).toISOString();checking=false;pending=null;view();}});view();return pending;}
 let starting=null;
 function start(){if(starting)return starting;if(timer!==null)return Promise.resolve();starting=(async()=>{await seed();await refresh();timer=setTimer(refresh,600000);ageTimer=setTimer(view,30000);})().finally(()=>{starting=null;});return starting;}
 function stop(){if(timer!==null)clearTimer(timer);if(ageTimer!==null)clearTimer(ageTimer);timer=ageTimer=null;}
 return{start,refresh,stop,inspect:()=>({current,pending:!!pending,error,lastFetchedAt,lastFetchOutcome,lastAttemptFinishedAt})};
}
const api={IDS,LABELS,canonical,sha,safeText,validate,verify,assess,create,CACHE_KEY,LEGACY_CACHE_KEY};
if(typeof module!=='undefined')module.exports=api;else root.MoaPublicFeed=api;
})(typeof globalThis!=='undefined'?globalThis:this);
