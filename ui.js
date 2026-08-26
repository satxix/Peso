/* PesoTrack UI helpers: modals, motion, save-button wiring, mobile back handling, and boot cleanup. Loaded after app.js. */
function showModal(){
  modalBackdrop.classList.add('show');
  document.body.classList.add('modal-open');
}

function hideModalIfNone(){
  setTimeout(()=>{
    if(!document.querySelector('.sheet.show')){
      modalBackdrop.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  },0);
}

function closeTopModal(){
  let sheets=[...document.querySelectorAll('.sheet.show')];
  if(!sheets.length)return;
  let top=sheets[sheets.length-1];
  top.classList.remove('show');
  if(top.id==='pickerSheet')document.body.classList.remove('picker-layer-open');
  hideModalIfNone();
}

function closeSheets(){
  document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('show'));
  document.body.classList.remove('picker-layer-open');
  modalBackdrop.classList.remove('show');
  document.body.classList.remove('modal-open');
}

/* Premium Edition Phase 2: Motion & Interaction */
(function(){
  const motionValueIds=['safeSpendHero','netWorth','cashTotal','cardTotal','billsDue','todayNet'];
  function addPressTargets(){
    document.querySelectorAll('button,.option').forEach(el=>el.classList.add('pressLift'));
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
  function afterRenderMotion(){
    addPressTargets(); pulseChangedValues();
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

/* Android/PWA back behavior: sheets first, app screens second, double-back on Home exits. */
(function mobileBackNavigation(){
  var BACK_EXIT_WINDOW_MS=1800;
  var internalNav=false;
  var initialized=false;
  var lastHomeBack=0;
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
  function canExitFromHome(target){
    return target==='dashboard'&&target===activeScreen();
  }
  function promptOrExitHome(){
    var now=Date.now();
    if(now-lastHomeBack<BACK_EXIT_WINDOW_MS){
      setTimeout(function(){try{history.back()}catch(e){}},0);
      return;
    }
    lastHomeBack=now;
    pushScreen('dashboard',false);
    if(typeof toastMsg==='function')toastMsg('Swipe back again to exit');
  }
  function restoreCurrentState(){
    pushScreen(activeScreen(),false);
  }
  function returnHomeAfterTransaction(){
    lastHomeBack=0;
    internalNav=true;
    try{window.go('dashboard',navButtonFor('dashboard'),true)}finally{internalNav=false}
    pushScreen('dashboard',true);
    pushScreen('dashboard',false);
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
    if(!skipHistory&&!internalNav)pushScreen(id,true);
  };
  try{go=window.go}catch(e){}

  window.addEventListener('popstate',function(e){
    if(hasOpenSheet()){
      var openSheets=[...document.querySelectorAll('.sheet.show')];
      var topSheet=openSheets[openSheets.length-1];
      var closingTransaction=topSheet&&topSheet.id==='txnSheet';
      closeTopModal();
      if(closingTransaction&&!hasOpenSheet()){
        returnHomeAfterTransaction();
        return;
      }
      restoreCurrentState();
      return;
    }
    if(activeScreen()==='reports'&&typeof reportSubviewActive==='function'&&reportSubviewActive()){
      closeReportView(true);
      return;
    }
    var target=e.state&&e.state.pesoTrack?e.state.screen:'dashboard';
    if(!screenIds.includes(target))target='dashboard';
    if(canExitFromHome(target)){
      promptOrExitHome();
      return;
    }
    if(target===activeScreen()){
      restoreCurrentState();
      return;
    }
    internalNav=true;
    try{window.go(target,navButtonFor(target),true)}finally{internalNav=false}
    if(target==='dashboard')pushScreen('dashboard',false);
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
  var release=function(){try{document.body.classList.remove('booting')}catch(e){}};
  var ready=window.pesoStorageReady&&typeof window.pesoStorageReady.then==='function'
    ? window.pesoStorageReady
    : Promise.resolve();
  ready.then(function(){
    try{if(typeof render==='function')render()}catch(e){console.warn('Final boot render skipped',e)}
    if(window.requestAnimationFrame)requestAnimationFrame(release);else setTimeout(release,0);
  }).catch(function(error){
    console.warn('Boot storage wait failed',error);
    release();
  });
  setTimeout(release,1800);
})();

(function notifyAppUpdated(){
  if(!('serviceWorker' in navigator))return;
  var key='pesotrack-sw-controller';
  var versionText=function(){
    return document.getElementById('homeVersionPill')?.textContent||
      document.getElementById('appVersionPill')?.textContent||
      'new version';
  };
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(!navigator.serviceWorker.controller)return;
    if(sessionStorage.getItem(key)==='1')return;
    sessionStorage.setItem(key,'1');
    setTimeout(function(){
      if(typeof toastMsg==='function')toastMsg('App updated to '+versionText());
    },700);
  });
  window.addEventListener('load',function(){
    navigator.serviceWorker.ready
      .then(function(reg){return reg.update()})
      .catch(function(){});
  });
})();
