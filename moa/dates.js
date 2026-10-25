(function(root){
'use strict';
  function validISO(s){
    if(typeof s!=='string')return false;
    const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(s);
    if(!m)return false;
    const [year,month,day,hour,minute,second]=m.slice(1,7).map(Number),leap=year%4===0&&(year%100!==0||year%400===0);
    const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    return year>0&&month>=1&&month<=12&&day>=1&&day<=days[month-1]&&hour<24&&minute<60&&second<60&&(m[8]==='Z'||(Number(m[8].slice(1,3))<24&&Number(m[8].slice(4,6))<60))&&Number.isFinite(Date.parse(s));
  }
const api={validISO};if(typeof module!=='undefined')module.exports=api;else root.MoaDates=api;
})(typeof globalThis!=='undefined'?globalThis:this);
