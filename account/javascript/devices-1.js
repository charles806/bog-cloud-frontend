// Apply theme ASAP to prevent white flash
(function(){
  const saved = localStorage.getItem('bog-theme');
  if(saved === 'dark') document.documentElement.classList.add('dark');
})();
