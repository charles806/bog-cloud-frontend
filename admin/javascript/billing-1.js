/* Admin Billing */
(function(){
  var C = window.BOG.config, BOG = window.BOG;
  var el = {
    alert: document.getElementById('alert'),
    rev: document.getElementById('bRevenue'),
    paying: document.getElementById('bPaying'),
    free: document.getElementById('bFree'),
    unwired: document.getElementById('unwiredNotice'),
  };
  function start(){ BOG.mountApp({search:false}); if(!BOG.isAdmin()) return; load(); }
  async function load(){
    try{
      var data = await C.adminFetch('billing');
      if(el.rev) el.rev.textContent = (C.pick(data, ['revenue','totalRevenue','monthlyRevenue']) != null) ? C.naira(C.pick(data, ['revenue','totalRevenue','monthlyRevenue'])) : '—';
      if(el.paying) el.paying.textContent = C.pick(data, ['payingUsers','paying','paid']) ?? '—';
      if(el.free) el.free.textContent = C.pick(data, ['freeUsers','free','freeCount']) ?? '—';
    }catch(err){
      if(err && err.isUnwired && err.isUnwired()){ if(el.unwired) el.unwired.classList.remove('is-hidden'); return;}
      if(el.alert) BOG.alert(el.alert, err.message, 'error');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
