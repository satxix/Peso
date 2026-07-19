/* PesoTrack dashboard totals, home hero, pulse, upcoming, and recent activity. Loaded before app.js. */
function daysUntil(dateStr){let today=new Date();today=new Date(today.getFullYear(),today.getMonth(),today.getDate());let d=new Date(dateStr);d=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.ceil((d-today)/86400000)}
function todaysRange(){let start=new Date();start.setHours(0,0,0,0);let end=new Date(start);end.setDate(end.getDate()+1);return {start,end}}
function setQuickTransfer(){openTxn();setTxnType('Transfer',document.querySelector('#txnSheet .seg button:nth-child(3)'))}
function accountTotals(){
  const bank=data.accounts.filter(a=>a.type==='Savings').reduce((s,a)=>s+Number(a.balance||0),0);
  const cashHand=data.accounts.filter(a=>a.type==='Cash').reduce((s,a)=>s+Number(a.balance||0),0);
  const wallets=data.accounts.filter(a=>a.type==='Wallet').reduce((s,a)=>s+Number(a.balance||0),0);
  const investments=data.accounts.filter(a=>a.type==='Investment').reduce((s,a)=>s+Number(a.balance||0),0);
  const cards=data.accounts.filter(a=>a.type==='Credit Card').reduce((s,a)=>s+Number(a.outstanding||0),0);
  const liquid=bank+cashHand+wallets;
  const gross=liquid+investments;
  const netWorth=gross-cards;
  return {bank,cashHand,wallets,investments,cards,liquid,gross,netWorth};
}
function cashCategoryIcon(type){return {Savings:'BA',Cash:'CA',Wallet:'EW',Investment:'IN','Credit Card':'CC'}[type]||'AC'}
function renderDash(){let totals=accountTotals();let cash=totals.liquid;let cards=totals.cards;let unpaid=data.bills.filter(b=>b.status!=='Paid').slice().sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));let due=unpaid.reduce((s,b)=>s+Number(b.remaining||b.amount||0),0);let safe=Math.max(0,cash-due);let nw=totals.netWorth;let netWorthEl=document.getElementById('netWorth');if(netWorthEl)netWorthEl.textContent=peso(nw);let bankEl=document.getElementById('bankTotal');if(bankEl)bankEl.textContent=peso(totals.bank);let cashHandEl=document.getElementById('cashHandTotal');if(cashHandEl)cashHandEl.textContent=peso(totals.cashHand);let walletEl=document.getElementById('walletTotal');if(walletEl)walletEl.textContent=peso(totals.wallets);if(typeof cashTotal!=='undefined')cashTotal.textContent=peso(cash);cardTotal.textContent=peso(cards);billsDue.textContent=peso(due);safeSpend.textContent=peso(safe);safeSpendHero.textContent=peso(safe);dashDate.textContent='Today, '+new Date().toLocaleDateString('en-PH',{month:'short',day:'numeric'});let tr=todaysRange(),todaySummary=summarizeTxns(txnsInRange(tr.start,tr.end));let todayTransfers=data.txns.filter(t=>{let d=new Date(t.date);return d>=tr.start&&d<tr.end&&t.type==='Transfer'}).reduce((s,t)=>s+Number(t.amount||0),0);let ti=document.getElementById('todayIncome'),te=document.getElementById('todayExpense'),tt=document.getElementById('todayTransfer'),tn=document.getElementById('todayNet');if(ti)ti.textContent=peso(todaySummary.income);if(te)te.textContent=peso(todaySummary.expense);if(tt)tt.textContent=peso(todayTransfers);if(tn)tn.textContent=peso(todaySummary.net);let focus=currentHeroAccount(),han=document.getElementById('heroAccountName'),haa=document.getElementById('heroAccountAmount');if(han&&haa){if(focus){han.textContent=focus.name||focus.institution||focus.type;haa.textContent=peso(accountAmount(focus))}else{han.textContent='Account';haa.textContent='Add one'}}let dueToday=unpaid.filter(b=>daysUntil(b.dueDate)<=0).length;let tb=document.getElementById('todayBills');if(tb)tb.textContent=dueToday?`${dueToday} due today`:`${unpaid.length} due`;let h=typeof calculateHealth==='function'?calculateHealth():{score:0,label:'Ready',cur:{savingsRate:0},util:0};let hsd=document.getElementById('healthScoreDash');if(hsd)hsd.textContent=h.score||'--';let hld=document.getElementById('healthLabelDash');if(hld)hld.textContent=h.label||'Ready';let hsum=document.getElementById('healthSummaryDash');if(hsum)hsum.textContent=h.cur&&h.cur.income?`${h.cur.savingsRate}% savings rate this month.`:'Add income and expenses to unlock a better score.';let hs=document.getElementById('healthSavingsDash');if(hs)hs.textContent=h.cur&&h.cur.income?`${h.cur.savingsRate}%`:'--';let hu=document.getElementById('healthUtilDash');if(hu)hu.textContent=data.accounts.some(a=>a.type==='Credit Card')?`${h.util}%`:'--';if(typeof setHealthRing==='function')setHealthRing('healthRing',h.score||0);upcoming.innerHTML=unpaid.length?unpaid.slice(0,4).map(b=>{let dd=daysUntil(b.dueDate);let badge=dd<0?'Overdue':dd===0?'Today':`${dd} day${dd===1?'':'s'}`;return `<div class="premiumTimelineItem"><div class="premiumTimelineMain"><b>${b.cardName}</b><span>Due ${b.dueDate} - ${badge}</span></div><div class="premiumTimelineAmt">${peso(b.remaining)}</div></div>`}).join(''):'<div class="softEmpty">No unpaid bills. Credit card bills appear after card purchases.</div>';recent.innerHTML=recentTxns(data.txns).slice(0,5).map(t=>txnRow(t,true)).join('')||'<div class="row"><span class="sub">No transactions yet.</span></div>'}
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
    if(typeof previousRenderDash==='function')previousRenderDash();
    renderHomeUpcomingFocus();
  };
  try{renderDash=window.renderDash}catch(e){}
  window.addEventListener('load',function(){setTimeout(function(){try{renderHomeUpcomingFocus()}catch(e){}},260)});
})();
