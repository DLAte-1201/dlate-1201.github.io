(function (root) {
  'use strict';
  const PREFIX = 'moa-public.v1.event.';
  const STATUSES = Object.freeze({active:'진행', paused:'보류', completed:'완료', maintenance:'유지관리'});
  const validStatus = s => s === null || (typeof s === 'string' && Object.hasOwn(STATUSES,s));
  const validDate = d => typeof d === 'string' && Number.isFinite(Date.parse(d));
  const validInputDate = typeof module!=='undefined' ? require('./dates.js').validISO : d=>root.MoaDates.validISO(d);
  class HubStore {
    constructor(storage, ids, options={}) {
      this.storage=storage; this.ids=new Set(ids);
      this.uuid=options.uuid || (()=>root.crypto.randomUUID());
      this.now=options.now || (()=>new Date().toISOString());
    }
    validateEvent(e,{historical=false}={}) {
      return e && e.v===1 && typeof e.id==='string' && /^[a-zA-Z0-9-]{1,80}$/.test(e.id) && Number.isSafeInteger(e.clock) && e.clock>0 && (historical?validDate:validInputDate)(e.at) && ['change','reset','restore','import'].includes(e.source) && Array.isArray(e.changes) && e.changes.length>0 && e.changes.length<=this.ids.size && new Set(e.changes.map(c=>c?.projectId)).size===e.changes.length && e.changes.every(c=>c && this.ids.has(c.projectId) && validStatus(c.status));
    }
    read() {
      const events=[], damaged=[], raw={};
      try {
        // An immutable key per event keeps independent tab writes from replacing one another.
        for (let i=0;i<this.storage.length;i++) {
          const key=this.storage.key(i); if (!key?.startsWith(PREFIX)) continue;
          const value=this.storage.getItem(key); raw[key]=value;
          try { const e=JSON.parse(value); if (!this.validateEvent(e,{historical:true}) || key!==PREFIX+e.id) throw Error(); events.push(e); }
          catch { damaged.push(key); }
        }
      } catch { throw Error('브라우저 저장소를 읽을 수 없습니다. 저장 권한과 공간을 확인하세요.'); }
      events.sort((a,b)=>a.clock-b.clock || a.id.localeCompare(b.id));
      const latest={}, history={};
      for (const e of events) for (const c of e.changes) {
        // Manual changes, resets and explicit restores always outrank imports,
        // including an import racing between another tab's read and atomic write.
        const previous=latest[c.projectId];
        const suppressed=e.source==='import' && previous && previous.source!=='import';
        const item={...c,at:e.at,eventId:e.id,source:e.source,suppressed:!!suppressed};
        (history[c.projectId] ||= []).push(item);
        if (!suppressed) latest[c.projectId]=item;
      }
      return {events,latest,history,damaged,raw};
    }
    append(changes,source='change') {
      const current=this.read();
      const event={v:1,id:this.uuid(),clock:Math.max(0,...current.events.map(e=>e.clock))+1,at:this.now(),source,changes};
      if (!this.validateEvent(event)) throw Error('개인 분류 기록의 형식이 올바르지 않습니다.');
      const key=PREFIX+event.id, value=JSON.stringify(event);
      let wrote=false;
      try {
        if (this.storage.getItem(key)!==null) throw Error('duplicate');
        this.storage.setItem(key,value);
        wrote=true;
        if (this.storage.getItem(key)!==value) throw Error('verify');
      } catch { throw Error(wrote?'기록을 저장했지만 저장 결과를 확인하지 못했습니다. 기존 기록은 유지됩니다. 분류를 다시 불러오거나 화면을 다시 열어 적용 여부를 확인하세요.':'저장하지 못했습니다. 이전 기록은 보존됩니다. 저장 공간·권한을 확인한 뒤 다시 시도하세요.'); }
      return {...this.read(),writtenEventId:event.id};
    }
    set(projectId,status) {
      if (!this.ids.has(projectId) || !validStatus(status)) throw Error('프로젝트나 개인 분류 값이 올바르지 않습니다.');
      const state=this.read();
      if ((state.latest[projectId]?.status ?? null)===status) return state;
      return this.append([{projectId,status}],status===null?'reset':'change');
    }
    restore(projectId,eventId) {
      if (!this.ids.has(projectId)) throw Error('잘못된 프로젝트입니다.');
      const state=this.read(),history=state.history[projectId] || [];
      if (!history.length) throw Error('복원할 이전 분류 기록이 없습니다.');
      let target;
      if (eventId!==undefined) {
        target=history.find(item=>item.eventId===eventId);
        if (!target) throw Error('해당 프로젝트에서 복원할 기록을 찾을 수 없습니다.');
      } else target=history.filter(item=>!item.suppressed).at(-2);
      const status=target?.status ?? null;
      if ((state.latest[projectId]?.status ?? null)===status) return state;
      return this.append([{projectId,status}],'restore');
    }
    backup() {
      const s=this.read();
      return {schemaVersion:1,app:'moa-public',exportedAt:this.now(),overrides:Object.values(s.latest).map(({projectId,status})=>({projectId,status}))};
    }
    parseBackup(text) {
      if (typeof text!=='string' || text.length>500000) throw Error('500KB 이하의 MOA 백업 파일을 선택하세요.');
      let b; try { b=JSON.parse(text); } catch { throw Error('JSON 형식이 올바르지 않습니다. 아무것도 변경하지 않았습니다.'); }
      if (!b || b.schemaVersion!==1 || b.app!=='moa-public' || !validInputDate(b.exportedAt) || !Array.isArray(b.overrides) || b.overrides.length>this.ids.size || new Set(b.overrides.map(c=>c?.projectId)).size!==b.overrides.length || !b.overrides.every(c=>c && this.ids.has(c.projectId) && validStatus(c.status))) throw Error('지원하지 않는 백업이거나 프로젝트·상태 값이 잘못되었습니다. 아무것도 변경하지 않았습니다.');
      return b;
    }
    preview(b) {
      // Revalidate on apply, including programmatic callers.
      const validated=this.parseBackup(JSON.stringify(b)), s=this.read();
      const incoming=validated.overrides.filter(c=>!Object.hasOwn(s.latest,c.projectId));
      return {incoming,kept:validated.overrides.length-incoming.length};
    }
    importBackup(b) {
      const {incoming}=this.preview(b);
      const state=incoming.length ? this.append(incoming,'import') : this.read();
      const added=state.writtenEventId ? incoming.filter(c=>state.latest[c.projectId]?.eventId===state.writtenEventId).length : 0;
      return {state,added,kept:b.overrides.length-added,conflicts:incoming.length-added};
    }
  }
  const api={HubStore,STATUSES,PREFIX};
  if (typeof module!=='undefined') module.exports=api; else root.HubStorage=api;
})(typeof globalThis!=='undefined'?globalThis:this);
