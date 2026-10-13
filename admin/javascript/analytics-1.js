/* Admin Analytics */
(function(){
  var C = window.BOG.config, BOG = window.BOG;
  var el = {
    alert: document.getElementById('alert'),
    active: document.getElementById('aActive'),
    uploads: document.getElementById('aUploads'),
    resp: document.getElementById('aResp'),
    unwired: document.getElementById('unwiredNotice'),
  };
  function start(){ BOG.mountApp({search:false}); if(!BOG.isAdmin()) return; load(); }
  async function load(){
    try{
      var data = await C.adminFetch('analytics');
      if(el.active) el.active.textContent = C.pick(data, ['activeUsers','active','users']) ?? '—';
      if(el.uploads) el.uploads.textContent = C.pick(data, ['uploads','uploadsToday','today']) ?? '—';
      var resp = C.pick(data, ['avgResponse','response','latency']);
      if(el.resp) el.resp.textContent = resp != null ? String(resp) + ' ms' : '—';
    }catch(err){
      if(err && err.isUnwired && err.isUnwired()){ if(el.unwired) el.unwired.classList.remove('is-hidden'); return;}
      if(el.alert) BOG.alert(el.alert, err.message, 'error');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
