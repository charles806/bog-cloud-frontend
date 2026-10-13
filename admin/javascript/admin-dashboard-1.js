/* Admin Overview — fetches adminRoutes.overview, shows not-connected on 404 */
(function(){
  var C = window.BOG.config;
  var BOG = window.BOG;
  var el = {
    alert: document.getElementById('alert'),
    users: document.getElementById('statUsers'),
    storage: document.getElementById('statStorage'),
    revenue: document.getElementById('statRevenue'),
    api: document.getElementById('statApi'),
    unwired: document.getElementById('unwiredNotice'),
    grid: document.getElementById('statsGrid'),
  };
  function start(){
    BOG.mountApp({ search:false });
    if (!BOG.isAdmin()) return;
    load();
  }
  async function load(){
    try{
      var data = await C.adminFetch('overview');
      // tolerant pick
      var users = C.pick(data, ['totalUsers','users','userCount','count']);
      var storage = C.pick(data, ['storageUsed','totalStorage','bytes','storage']);
      var revenue = C.pick(data, ['revenue','totalRevenue','monthlyRevenue','income']);
      var api = C.pick(data, ['apiCalls','calls','totalCalls']);
      if (el.users) el.users.textContent = users != null ? String(users) : '—';
      if (el.storage) el.storage.textContent = storage != null ? C.bytes(storage) : '—';
      if (el.revenue) el.revenue.textContent = revenue != null ? C.naira(revenue) : '—';
      if (el.api) el.api.textContent = api != null ? String(api) : '—';
    }catch(err){
      if (err && err.isUnwired && err.isUnwired()){
        if (el.unwired) el.unwired.classList.remove('is-hidden');
        if (el.grid) el.grid.setAttribute('aria-hidden','true');
        return;
      }
      if (el.alert) BOG.alert(el.alert, err.message || 'Could not load overview.', 'error');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
