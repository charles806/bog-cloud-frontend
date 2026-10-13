/* Admin Manage Users — same as users but with joined date */
(function(){
  var C = window.BOG.config, BOG = window.BOG;
  var el = {
    alert: document.getElementById('alert'),
    body: document.getElementById('manageBody'),
    empty: document.getElementById('manageEmpty'),
    unwired: document.getElementById('unwiredNotice'),
    count: document.getElementById('manageCount'),
    search: document.getElementById('manageSearch'),
  };
  var users=[];
  function start(){ BOG.mountApp({search:false}); if(!BOG.isAdmin()) return; wire(); load(); }
  function wire(){
    if(el.search) el.search.addEventListener('input', function(){ applyFilter(el.search.value.trim().toLowerCase()); });
    if(el.body) el.body.addEventListener('click', function(e){
      var btn=e.target.closest('[data-role]'); if(!btn) return; changeRole(btn.getAttribute('data-id'), btn.getAttribute('data-role'), btn);
    });
  }
  async function load(){
    try{
      var data = await C.adminFetch('users');
      var list = C.pickList(data);
      users=list;
      render(list);
    }catch(err){
      if(err && err.isUnwired && err.isUnwired()){ if(el.unwired) el.unwired.classList.remove('is-hidden'); return;}
      if(el.alert) BOG.alert(el.alert, err.message,'error');
    }
  }
  function render(list){
    if(!el.body) return;
    el.body.textContent='';
    if(!list.length){ if(el.empty) el.empty.classList.remove('is-hidden'); if(el.count) el.count.textContent='0 users'; return;}
    if(el.empty) el.empty.classList.add('is-hidden');
    if(el.count) el.count.textContent = list.length + ' user' + (list.length===1?'':'s');
    var frag=document.createDocumentFragment();
    list.forEach(function(u){
      var name = C.pick(u, ['name','displayName']) || (u.email?u.email.split('@')[0]:'—');
      var role = C.pick(u, ['role','isAdmin']) || 'user'; if(role===true) role='admin';
      var id = C.pick(u, ['_id','id','uid']) || '';
      var joined = C.pick(u, ['createdAt','joinedAt','date']);
      var tr=document.createElement('tr');
      var tdUser=document.createElement('td'); var nm=document.createElement('div'); nm.className='cell-main'; nm.textContent=name; var sub=document.createElement('span'); sub.className='cell-sub'; sub.textContent=C.pick(u,['email'])||''; tdUser.appendChild(nm); tdUser.appendChild(sub);
      var tdRole=document.createElement('td'); tdRole.textContent=String(role);
      var tdJoined=document.createElement('td'); tdJoined.textContent = joined ? C.date(joined) : '—';
      var tdAct=document.createElement('td'); tdAct.className='row-actions';
      var btn=document.createElement('button'); btn.type='button'; btn.className='btn btn--ghost'; btn.setAttribute('data-id', id); btn.setAttribute('data-role', role==='admin'?'user':'admin'); btn.textContent = role==='admin'?'Make user':'Make admin';
      tdAct.appendChild(btn);
      tr.appendChild(tdUser); tr.appendChild(tdRole); tr.appendChild(tdJoined); tr.appendChild(tdAct);
      frag.appendChild(tr);
    });
    el.body.appendChild(frag);
  }
  function applyFilter(term){
    var rows=el.body.querySelectorAll('tr'); var shown=0;
    rows.forEach(function(tr){ var hit=!term||tr.textContent.toLowerCase().indexOf(term)!==-1; tr.hidden=!hit; if(hit) shown++; });
    if(el.count) el.count.textContent = term ? shown + ' of ' + users.length : users.length + ' user' + (users.length===1?'':'s');
  }
  async function changeRole(id, role, btn){
    var ok=await BOG.confirm({title:'Change role?', body:'Set this user to ' + role + '?', confirmLabel:'Confirm'});
    if(!ok) return;
    BOG.busy(btn,true);
    try{ await C.adminFetch('setRole', {method:'PATCH', body:{role:role}, params:{id:id}}); BOG.alert(el.alert,'Role updated.','success'); load(); }
    catch(err){ if(err.isUnwired && err.isUnwired()) BOG.alert(el.alert,'Role endpoint not wired (404).','warning'); else BOG.alert(el.alert, err.message,'error'); }
    finally{ BOG.busy(btn,false); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
