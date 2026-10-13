/* Devices page backed by the Express backend: GET /users/devices and
   DELETE /users/devices/:deviceId. Row shape: { deviceId, deviceName, lastActive }. */

var C = window.BOG.config;
var BOG = window.BOG;

function esc(s){ return C.esc(String(s==null?'':s)); }

function wire() {
  var list = document.getElementById('devicesList');
  if (list) {
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-revoke]');
      if (!btn) return;
      revokeDevice(btn.getAttribute('data-revoke'), btn.getAttribute('data-name'));
    });
  }
}

async function loadDevices(){
  var list = document.getElementById('devicesList');
  var empty = document.getElementById('devicesEmpty');
  var count = document.getElementById('devicesCount');
  if (!list) return;
  list.textContent = '';
  try{
    var data = await C.expressFetch('devices');
    var devices = (data && (data.devices)) || [];
    if (!Array.isArray(devices)) devices = [];
    if (!devices.length){
      if (empty) empty.classList.remove('is-hidden');
      if (count) count.textContent = '0 devices';
      return;
    }
    if (empty) empty.classList.add('is-hidden');
    if (count) count.textContent = devices.length + ' device' + (devices.length===1?'':'s');
    var frag = document.createDocumentFragment();
    devices.forEach(function(d){
      var name = d.deviceName || d.name || d.device || d.userAgent || 'Unknown device';
      var last = d.lastActive || d.lastSeen || d.updatedAt || d.createdAt;
      var row = document.createElement('div');
      row.className = 'entry';
      row.setAttribute('role','listitem');
      var icon = document.createElement('div'); icon.className='entry__icon'; icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v12H3V4zm2 2v8h14V6H5zm4 12h6v2H9v-2z"/></svg>';
      var body = document.createElement('div'); body.className='entry__body';
      var n = document.createElement('div'); n.className='entry__name'; n.textContent = name;
      var m = document.createElement('div'); m.className='entry__meta'; m.textContent = last ? C.relative(last) : '';
      body.appendChild(n); body.appendChild(m);
      row.appendChild(icon); row.appendChild(body);
      if (d.deviceId) {
        var actions = document.createElement('div'); actions.className='entry__actions';
        var revoke = document.createElement('button'); revoke.type='button';
        revoke.className='btn btn--sm btn--danger';
        revoke.textContent='Revoke';
        revoke.setAttribute('data-revoke', d.deviceId);
        revoke.setAttribute('data-name', name);
        revoke.setAttribute('aria-label', 'Revoke ' + name);
        actions.appendChild(revoke);
        row.appendChild(actions);
      }
      frag.appendChild(row);
    });
    list.appendChild(frag);
  }catch(e){
    if (e && e.status === 401) { BOG.auth.signOut(); window.location.href = '/auth/login.html'; return; }
    var alertEl = document.getElementById('alert'); if(alertEl) BOG.alert(alertEl, e.message, 'error');
  }
}

async function revokeDevice(id, name) {
  if (!id) return;
  var ok = await BOG.confirm({
    title: 'Revoke this device?',
    body: (name || 'This device') + ' will be signed out and removed. This cannot be undone.',
    confirmLabel: 'Revoke',
    danger: true,
  });
  if (!ok) return;
  try{
    await C.request(C.url('revokeDevice', { deviceId: id }), { method: 'DELETE' });
    var alertEl = document.getElementById('alert');
    if (alertEl) BOG.alert(alertEl, 'Device revoked.', 'success');
    loadDevices();
  }catch(e){
    if (e && e.status === 401) { BOG.auth.signOut(); window.location.href = '/auth/login.html'; return; }
    var alertEl2 = document.getElementById('alert'); if(alertEl2) BOG.alert(alertEl2, e.message, 'error');
  }
}

function start() {
  if (!C.token()) {
    window.location.href = '/auth/login.html';
    return;
  }
  BOG.mountApp({ search: false });
  wire();
  loadDevices();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}