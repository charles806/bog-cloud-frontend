/* Admin Storage Analysis */
(function(){
  var C = window.BOG.config, BOG = window.BOG;
  var el = {
    alert: document.getElementById('alert'),
    total: document.getElementById('sTotal'),
    avg: document.getElementById('sAvg'),
    largest: document.getElementById('sLargest'),
    meterVal: document.getElementById('sMeterVal'),
    meterFill: document.getElementById('sMeterFill'),
    unwired: document.getElementById('unwiredNotice'),
  };
  function start(){ BOG.mountApp({search:false}); if(!BOG.isAdmin()) return; load(); }
  async function load(){
    try{
      var data = await C.adminFetch('storage');
      var total = C.pick(data, ['total','totalBytes','storageUsed','bytes']);
      var avg = C.pick(data, ['average','avgFileSize','averageFileSize']);
      var largest = C.pick(data, ['largestBucket','largest','bucket']);
      if(el.total) el.total.textContent = total != null ? C.bytes(total) : '—';
      if(el.avg) el.avg.textContent = avg != null ? C.bytes(avg) : '—';
      if(el.largest) el.largest.textContent = largest != null ? String(largest) : '—';
      var pct = C.num(C.pick(data, ['usagePercent','percent','usage']), null);
      if(el.meterVal) el.meterVal.textContent = pct != null ? C.percent(pct) : '—';
      if(el.meterFill && pct != null) el.meterFill.style.width = Math.min(100, pct) + '%';
    }catch(err){
      if(err && err.isUnwired && err.isUnwired()){ if(el.unwired) el.unwired.classList.remove('is-hidden'); return;}
      if(el.alert) BOG.alert(el.alert, err.message, 'error');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
