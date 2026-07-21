/* PesoTrack UI helpers: modals, motion, save-button wiring, mobile back handling, and boot cleanup. Loaded after app.js. */
function showModal(){modalBackdrop.classList.add('show');document.body.classList.add('modal-open')}function hideModalIfNone(){setTimeout(()=>{if(!document.querySelector('.sheet.show')){modalBackdrop.classList.remove('show');document.body.classList.remove('modal-open')}},0)}function closeTopModal(){let sheets=[...document.querySelectorAll('.sheet.show')];if(!sheets.length)return;let top=sheets[sheets.length-1];top.classList.remove('show');hideModalIfNone()}function closeSheets(){document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('show'));modalBackdrop.classList.remove('show');document.body.classList.remove('modal-open')}

/* Premium Edition Phase 2: Motion & Interaction */
(function(){
  const motionValueIds=['safeSpendHero','netWorth','cashTotal','cardTotal','billsDue','todayIncome','todayExpense','todayTransfer','todayNet'];
  function addPressTargets(){
    document.querySelectorAll('button,.card,.row,.option,.ccCard,.budgetCard').forEach(el=>el.classList.add('pressLift'));
  }
  function pulseChangedValues(){
    motionValueIds.forEach(id=>{
      const el=document.getElementById(id); if(!el) return;
      const txt=el.textContent;
      if(el.dataset.motionLast && el.dataset.motionLast!==txt){
        el.classList.remove('valuePulse'); void el.offsetWidth; el.classList.add('valuePulse');
      }
      el.dataset.motionLast=txt;
    });
  }
  function tagStagger(){
    document.querySelectorAll('.premiumDashboard .premiumTimelineItem,.premiumDashboard .row').forEach((el,i)=>{
      el.style.animationDelay=Math.min(i*35,220)+'ms';
    });
  }
  function afterRenderMotion(){
    addPressTargets(); pulseChangedValues(); tagStagger();
  }
  document.addEventListener('pointerdown',e=>{
    const target=e.target.closest('button'); if(!target || target.disabled) return;
    const rect=target.getBoundingClientRect();
    const ripple=document.createElement('span');
    ripple.className='premiumRipple';
    ripple.style.left=(e.clientX-rect.left)+'px';
    ripple.style.top=(e.clientY-rect.top)+'px';
    ripple.style.width=ripple.style.height=Math.max(rect.width,rect.height)/5+'px';
    target.appendChild(ripple);
    setTimeout(()=>ripple.remove(),650);
  },{passive:true});
  window.addEventListener('load',()=>{
    document.body.classList.add('motion-ready');
    afterRenderMotion();
  });
  const prevRender=window.render;
  if(typeof prevRender==='function'){
    window.render=function(){
      prevRender.apply(this,arguments);
      requestAnimationFrame(afterRenderMotion);
    }
  }
  const prevOpenTxn=window.openTxn;
  if(typeof prevOpenTxn==='function'){
    window.openTxn=function(){
      prevOpenTxn.apply(this,arguments);
      setTimeout(()=>document.getElementById('txnSheet')?.scrollTo({top:0,behavior:'smooth'}),30);
    }
  }
})();

(function wireTransactionSaveButton(){
  try{
    const btn=document.getElementById('txnSaveBtn');
    if(btn && !btn.dataset.wired){
      btn.dataset.wired='1';
      btn.addEventListener('click',function(ev){
        ev.preventDefault();
        if(typeof saveTxn==='function') saveTxn();
      });
    }
  }catch(e){console.warn('Unable to wire Save Transaction button',e)}
})();

/* Reports transaction list follows the selected period. */
(function mobileBackNavigation(){
  var internalNav=false;
  var initialized=false;
  var screenIds=['dashboard','bills','accounts','reports','settings','search'];
  function activeScreen(){
    var active=document.querySelector('.screen.active');
    return active&&active.id?active.id:(screen||'dashboard');
  }
  function navButtonFor(id){
    var map={dashboard:0,bills:1,accounts:3,reports:4};
    if(map[id]===undefined)return null;
    return document.querySelectorAll('.nav button')[map[id]]||null;
  }
  function hasOpenSheet(){
    return !!document.querySelector('.sheet.show');
  }
  function stateFor(id){
    return {pesoTrack:true,screen:screenIds.includes(id)?id:'dashboard'};
  }
  function urlFor(id){
    return '#'+(screenIds.includes(id)?id:'dashboard');
  }
  function pushScreen(id,replace){
    if(!window.history||!history.pushState)return;
    var next=screenIds.includes(id)?id:'dashboard';
    try{
      if(replace)history.replaceState(stateFor(next),'',urlFor(next));
      else history.pushState(stateFor(next),'',urlFor(next));
    }catch(e){}
  }
  var previousGo=window.go;
  window.go=function(id,btn,skipHistory){
    if(typeof previousGo==='function')previousGo(id,btn);
    if(!skipHistory&&!internalNav)pushScreen(id,false);
  };
  try{go=window.go}catch(e){}

  window.addEventListener('popstate',function(e){
    if(hasOpenSheet()){
      closeTopModal();
      pushScreen(activeScreen(),false);
      return;
    }
    var target=e.state&&e.state.pesoTrack?e.state.screen:'dashboard';
    if(!screenIds.includes(target))target='dashboard';
    if(target===activeScreen()){
      pushScreen(target,false);
      if(typeof toastMsg==='function')toastMsg('You are already on Home');
      return;
    }
    internalNav=true;
    try{window.go(target,navButtonFor(target),true)}finally{internalNav=false}
  });

  window.addEventListener('load',function(){
    if(initialized)return;
    initialized=true;
    var start=activeScreen();
    pushScreen(start,true);
    pushScreen(start,false);
  });
})();

(function finishBootWithoutOldHomeFlash(){
  try{if(typeof render==='function')render();}catch(e){console.warn('Final boot render skipped',e)}
  var release=function(){try{document.body.classList.remove('booting')}catch(e){}};
  if(window.requestAnimationFrame)requestAnimationFrame(release);else setTimeout(release,0);
  setTimeout(release,600);
})();
