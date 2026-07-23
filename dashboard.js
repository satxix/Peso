/* PesoTrack dashboard totals, home hero, pulse, upcoming, and recent activity. Loaded before app.js. */
function daysUntil(dateStr){let today=new Date();today=new Date(today.getFullYear(),today.getMonth(),today.getDate());let d=new Date(dateStr);d=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.ceil((d-today)/86400000)}
function todaysRange(){let start=new Date();start.setHours(0,0,0,0);let end=new Date(start);end.setDate(end.getDate()+1);return {start,end}}
function monthRange(){let now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1),end=new Date(now.getFullYear(),now.getMonth()+1,1);return {start,end}}
function wholePeso(n){let sign=Number(n)<0?'-':'';let v=Math.round(Math.abs(Number(n)||0));return sign+'₱'+v.toLocaleString('en-PH')}
function setQuickTransfer(){openTxn();setTxnType('Transfer',document.querySelector('#txnSheet .seg button:nth-child(3)'))}
function accountTotals(){
  const accounts=(data.accounts||[]).filter(a=>a&&typeof a==='object');
  const bank=accounts.filter(a=>a.type==='Savings').reduce((s,a)=>s+Number(a.balance||0),0);
  const cashHand=accounts.filter(a=>a.type==='Cash').reduce((s,a)=>s+Number(a.balance||0),0);
  const wallets=accounts.filter(a=>a.type==='Wallet').reduce((s,a)=>s+Number(a.balance||0),0);
  const investments=accounts.filter(a=>a.type==='Investment').reduce((s,a)=>s+Number(a.balance||0),0);
  const cards=accounts.filter(a=>a.type==='Credit Card').reduce((s,a)=>s+Number(a.outstanding||0),0);
  const liquid=bank+cashHand+wallets;
  const gross=liquid+investments;
  const netWorth=gross-cards;
  return {bank,cashHand,wallets,investments,cards,liquid,gross,netWorth};
}
function cashCategoryIcon(type){return {Savings:'BA',Cash:'CA',Wallet:'EW',Investment:'IN','Credit Card':'CC'}[type]||'AC'}
function renderDash(){
  let totals=accountTotals(),cash=totals.liquid,cards=totals.cards;
  let unpaid=(data.bills||[]).filter(b=>b&&typeof b==='object'&&billStatus(b)!=='Paid').slice().sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));
  let due=unpaid.reduce((s,b)=>s+Number(b.remaining||b.amount||0),0),safe=Math.max(0,cash-due),nw=totals.netWorth;
  let set=(id,value)=>{let el=document.getElementById(id);if(el)el.textContent=value};
  set('netWorth',peso(nw));set('bankTotal',peso(totals.bank));set('cashHandTotal',peso(totals.cashHand));set('walletTotal',peso(totals.wallets));set('cashTotal',peso(cash));set('cardTotal',peso(cards));set('billsDue',peso(due));set('safeSpend',peso(safe));set('safeSpendHero',peso(safe));
  set('dashDate','Today, '+new Date().toLocaleDateString('en-PH',{month:'short',day:'numeric'}));
  let mr=monthRange(),monthSummary=summarizeTxns(txnsInRange(mr.start,mr.end));
  let monthTransfers=(data.txns||[]).filter(t=>{let d=new Date(t&&t.date);return d>=mr.start&&d<mr.end&&t.type==='Transfer'}).reduce((s,t)=>s+Number(t.amount||0),0);
  set('todayIncome',wholePeso(monthSummary.income));set('todayExpense',wholePeso(monthSummary.expense));set('todayTransfer',wholePeso(monthTransfers));set('todayNet',peso(due));
  let focus=currentHeroAccount(),han=document.getElementById('heroAccountName'),haa=document.getElementById('heroAccountAmount');
  if(han&&haa){if(focus){han.textContent=focus.name||focus.institution||focus.type;haa.textContent=peso(accountAmount(focus))}else{han.textContent='Account';haa.textContent='Add one'}}
  let dueToday=unpaid.filter(b=>daysUntil(b.dueDate)<=0).length;set('todayBills',dueToday?`${dueToday} due today`:`${unpaid.length} due`);
  let upcomingEl=document.getElementById('upcoming');
  if(upcomingEl)upcomingEl.innerHTML=unpaid.length?unpaid.slice(0,4).map(b=>{let dd=daysUntil(b.dueDate);let badge=dd<0?'Overdue':dd===0?'Today':`${dd} day${dd===1?'':'s'}`;return `<div class="premiumTimelineItem"><div class="premiumTimelineMain"><b>${htmlText(b.cardName||'Card bill')}</b><span>Due ${htmlText(b.dueDate)} - ${badge}</span></div><div class="premiumTimelineAmt">${peso(b.remaining)}</div></div>`}).join(''):'<div class="softEmpty">No unpaid bills. Credit card bills appear after card purchases.</div>';
  let recentEl=document.getElementById('recent');
  if(recentEl)recentEl.innerHTML=recentTxns(data.txns||[]).slice(0,5).map(t=>txnRow(t,true)).join('')||'<div class="row"><span class="sub">No transactions yet.</span></div>';
}
function accountAmount(a){return Number(a&&a.type==='Credit Card'?a.outstanding:a.balance)||0}
function heroAccountList(){let accounts=(data.accounts||[]).filter(a=>a.type!=='Credit Card');return accounts.length?accounts:(data.accounts||[])}
function currentHeroAccount(){let list=heroAccountList();if(!list.length)return null;let saved=localStorage.getItem(HERO_ACCOUNT_KEY);return list.find(a=>a.id===saved)||list[0]}
function cycleHeroAccount(){let list=heroAccountList();if(!list.length){go('accounts',document.querySelectorAll('.nav button')[3]);return}let cur=currentHeroAccount(),i=Math.max(0,list.findIndex(a=>a.id===cur.id)),next=list[(i+1)%list.length];localStorage.setItem(HERO_ACCOUNT_KEY,next.id);renderDash();toastMsg(next.name||next.institution||'Account selected')}

(function homeUpcomingFocus(){
  function localDateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function monthKeyForDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
  function recurringPaidForOccurrence(r,d){
    var key=monthKeyForDate(d);
    return (data.txns||[]).some(function(t){
      return t.recurringId===r.id&&(t.occurrenceMonth===key||String(t.occurrenceKey||'').slice(0,7)===key);
    });
  }
  function homeUpcomingItems(){
    var today=new Date();today.setHours(0,0,0,0);
    var max=new Date(today);max.setDate(max.getDate()+45);
    var items=[];
    (data.bills||[]).filter(function(b){return b.status!=='Paid'}).forEach(function(b){
      var d=new Date(b.dueDate);d.setHours(0,0,0,0);
      if(d<=max)items.push({date:d,title:b.cardName||'Card bill',sub:'Credit card due',amount:Number(b.remaining||b.amount||0),type:'Bill',kind:'bill'});
    });
    (data.recurring||[]).filter(function(r){return r.enabled!==false}).forEach(function(r){
      var d=nextRecurringDate(r);d.setHours(0,0,0,0);
      if(d<=max&&!recurringPaidForOccurrence(r,d)){
        items.push({date:d,title:r.name||r.category||r.type,sub:'Recurring '+(r.type||'item'),amount:Number(r.amount||0),type:r.type==='Income'?'Income':'Recurring',kind:r.type==='Income'?'income':'recurring'});
      }
    });
    return items.sort(function(a,b){return a.date-b.date}).slice(0,5);
  }
  function renderHomeUpcomingFocus(){
    var el=document.getElementById('upcoming');
    if(!el)return;
    var items=homeUpcomingItems();
    if(!items.length){
      el.innerHTML='<div class="softEmpty">No upcoming unpaid bills or recurring items.</div>';
      return;
    }
    el.innerHTML=items.map(function(item){
      var dd=daysUntil(localDateKey(item.date));
      var dueText=dd<0?'Overdue':dd===0?'Due today':dd===1?'Due tomorrow':'Due in '+dd+' days';
      var badgeClass=dd<0?'overdue':dd<=3?'dueSoon':item.kind==='income'?'income':'';
      var amt=(item.kind==='income'?'+':'')+peso(item.amount);
      var month=item.date.toLocaleDateString('en-PH',{month:'short'});var day=String(item.date.getDate());return '<div class="premiumTimelineItem"><div class="upcomingDateBadge"><b>'+htmlText(day)+'</b><span>'+htmlText(month)+'</span></div><div class="premiumTimelineMain"><b>'+htmlText(item.title)+'</b><span>'+htmlText(item.sub)+' - '+htmlText(dueText)+'</span></div><div class="premiumTimelineAmt"><b>'+amt+'</b><span class="upcomingKind '+badgeClass+'">'+htmlText(item.type)+'</span></div></div>';
    }).join('');
  }
  var previousRenderDash=window.renderDash||renderDash;
  window.renderDash=function(){
    try{if(typeof previousRenderDash==='function')previousRenderDash()}catch(e){console.error('Dashboard totals failed',e)}
    renderHomeUpcomingFocus();
  };
  try{renderDash=window.renderDash}catch(e){}
  window.addEventListener('load',function(){setTimeout(function(){try{renderHomeUpcomingFocus()}catch(e){}},260)});
})();
