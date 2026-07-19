let data=safeLoadData(),screen='dashboard',acctFilter='All',txnType='Expense',amount='0',txn={from:null,to:null,category:'Food',fee:0},editingAccount=null,settling=null,pickerMode=null,pickerField=null,reportPeriod='Month',editingTxn=null,editingRecurring=null,editingBudget=null,recurringDraftCategory='',settingsCategoryIcon='car';function uid(){try{if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID()}catch(e){}return 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}function normalizeData(d){if(!d||typeof d!=='object')d={};if(!Array.isArray(d.recurring))d.recurring=[];if(!Array.isArray(d.accounts))d.accounts=[];if(!Array.isArray(d.txns))d.txns=[];if(!Array.isArray(d.bills))d.bills=[];if(!Array.isArray(d.budgets))d.budgets=[];if(!Array.isArray(d.categories))d.categories=defaultCategories();if(!d.categoryIcons||typeof d.categoryIcons!=='object')d.categoryIcons={};d.categories=[...new Set(defaultCategories().concat(d.categories).map(c=>String(c||'').trim()).filter(Boolean))];if(!d.settings||typeof d.settings!=='object')d.settings={accent:'#6c63ff',privacy:false,weekStart:'1',currency:'PHP',dark:true,pinEnabled:false,pinHash:''};if(!d.settings.accent)d.settings.accent='#6c63ff';if(!d.settings.weekStart)d.settings.weekStart='1';if(!d.settings.currency)d.settings.currency='PHP';d.settings.dark=true;d.settings.privacy=!!d.settings.privacy;d.settings.pinEnabled=!!d.settings.pinEnabled;d.settings.pinHash=d.settings.pinHash||'';return d}data=normalizeData(data);function accountTxnEffect(id,txns=data.txns){let a=(data.accounts||[]).find(x=>x.id===id),out={balance:0,outstanding:0};if(!a)return out;(txns||[]).forEach(t=>{let amt=Number(t.amount||0),fee=Number(t.fee||0);if(!amt)return;if(t.type==='Income'){if(t.from===id)out.balance+=amt}else if(t.type==='Expense'){if(t.from===id){if(a.type==='Credit Card')out.outstanding+=amt;else out.balance-=amt}}else if(t.type==='Transfer'){if(t.from===id){if(a.type==='Credit Card')out.outstanding-=amt;else out.balance-=amt+fee}if(t.to===id){if(a.type==='Credit Card')out.outstanding-=amt;else out.balance+=amt}}else if(t.type==='Card Payment'){if(t.from===id)out.balance-=amt;if(t.to===id)out.outstanding-=amt}});return out}
function ensureLedgerBaselines(){(data.accounts||[]).forEach(a=>{let fx=accountTxnEffect(a.id);if(a.type==='Credit Card'){if(!Number.isFinite(Number(a.ledgerBaseOutstanding)))a.ledgerBaseOutstanding=Number(a.outstanding||0)-fx.outstanding;if(!Number.isFinite(Number(a.ledgerBaseBalance)))a.ledgerBaseBalance=0}else{if(!Number.isFinite(Number(a.ledgerBaseBalance)))a.ledgerBaseBalance=Number(a.balance||0)-fx.balance;if(!Number.isFinite(Number(a.ledgerBaseOutstanding)))a.ledgerBaseOutstanding=0}})}
function recalculateBalancesFromLedger(){ensureLedgerBaselines();(data.accounts||[]).forEach(a=>{let fx=accountTxnEffect(a.id);if(a.type==='Credit Card'){a.balance=0;a.outstanding=Math.max(0,roundMoney(Number(a.ledgerBaseOutstanding||0)+fx.outstanding))}else{a.balance=roundMoney(Number(a.ledgerBaseBalance||0)+fx.balance);a.outstanding=0}})}
function roundMoney(n){return Math.round((Number(n)||0)*100)/100}
ensureLedgerBaselines();recalculateBalancesFromLedger();function peso(n){if(data.settings&&data.settings.privacy)return '\u2022\u2022\u2022\u2022';return '\u20b1'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2})}function persist(){try{ensureLedgerBaselines();recalculateBalancesFromLedger();localStorage.setItem(KEY,JSON.stringify(data))}catch(e){console.warn('PesoTrack could not persist to localStorage. Changes will remain for this session only.',e);if(typeof showToast==='function')showToast('Saved for this session. Use installed PWA for permanent storage.')}render()}function go(id,btn){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));if(btn&&!btn.classList.contains('fab'))btn.classList.add('active');screen=id;render()}function render(){
  const steps=[
    ['Accounts',renderAccounts],['Dashboard',renderDash],['Bills',renderBills],['Recurring',renderRecurring],
    ['Reports',renderReports],['Transactions',renderTransactionsList],
    ['GlobalSearch',renderGlobalSearch],['Insights',renderInsights],['Settings',renderSettings]
  ];
  for(const [name,fn] of steps){
    try{ if(typeof fn==='function') fn(); }
    catch(err){ console.error('Render step failed:',name,err); }
  }
}function daysUntil(dateStr){let today=new Date();today=new Date(today.getFullYear(),today.getMonth(),today.getDate());let d=new Date(dateStr);d=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.ceil((d-today)/86400000)}
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



function accountSubtitleLine(a){
  if(!a)return '';
  if(a.type==='Credit Card'){
    const limit=Number(a.limit||0), out=Number(a.outstanding||0), avail=Math.max(0,limit-out);
    const pct=limit?Math.min(100,Math.round(out/limit*100)):0;
    return `Outstanding - ${pct}% used - Available ${peso(avail)}`;
  }
  if(a.type==='Cash')return 'Cash on Hand';
  if(a.type==='Wallet')return 'E-Wallet';
  if(a.type==='Investment')return 'Investment';
  return a.institution||a.type||'Account';
}
function accountGroupLabel(type){return type==='Savings'?'Banks':type==='Credit Card'?'Cards':type==='Wallet'?'E-Wallets':type==='Cash'?'Cash':type==='Investment'?'Investments':'Other'}
function accountGlimpseAmount(a){return a.type==='Credit Card'?Number(a.outstanding||0):Number(a.balance||0)}
function accountGlimpseHint(a){if(a.type==='Credit Card'){let limit=Number(a.limit||0),out=Number(a.outstanding||0);return limit?`${Math.round(out/limit*100)}% used`:'Outstanding'}return ''}
function accountRow(a){let amount=accountGlimpseAmount(a);let limit=Number(a.limit||0),out=Number(a.outstanding||0);let util=a.type==='Credit Card'&&limit?Math.min(100,Math.round(out/limit*100)):0;let utilClass=util>=80?'danger':util>=50?'warn':'';let utilBar=a.type==='Credit Card'&&limit?`<div class="acctUtil ${utilClass}"><i style="width:${util}%"></i></div>`:'';let hint=accountGlimpseHint(a);return `<button type="button" class="acctRow" onclick="openAccountDetail('${jsString(a.id)}')">${logo(a)}<span class="acctMain"><b class="acctName">${htmlText(a.name,'Unnamed Account')}</b><span class="acctMeta"><span class="acctInst">${htmlText(a.institution||a.type||'Account')}</span></span></span><span class="acctRight"><b class="acctAmount">${peso(amount)}</b>${hint?`<span class="acctHint">${htmlText(hint)}</span>`:''}${utilBar}</span></button>`}
function renderAccounts(){let grid=document.getElementById('accountGrid');if(!grid)return;let arr=data.accounts.filter(a=>acctFilter==='All'||a.type===acctFilter);let order=['Savings','Cash','Wallet','Credit Card','Investment'];let groups={};arr.forEach(a=>{let key=order.includes(a.type)?a.type:'Other';(groups[key]||(groups[key]=[])).push(a)});let sections=order.concat('Other').filter(k=>groups[k]?.length).map(k=>{let total=groups[k].reduce((sum,a)=>sum+accountGlimpseAmount(a),0);return `<section class="acctGroup" data-acct-group="${htmlText(k)}"><button type="button" class="acctGroupHead" onclick="toggleAcctGroup('${jsString(k)}')"><span class="acctGroupTitle"><span class="acctGroupName">${accountGroupLabel(k)}</span></span><span class="acctGroupMeta">${groups[k].length} account${groups[k].length===1?'':'s'} &middot; ${peso(total)}</span></button><div class="acctList">${groups[k].map(accountRow).join('')}</div></section>`}).join('');grid.innerHTML=(sections||'<div class="gm4-empty"><b>No accounts yet.</b>Tap + to add banks, cash on hand, wallets, cards, or investments.</div>')+`<button type="button" class="acctRow acctAddRow" onclick="openAddAccount()"><span class="acctAddIcon">+</span><span class="acctMain"><b class="acctName">Add Account</b><span class="acctInst">Bank, cash, wallet, card, or investment</span></span></button>`;(data.settings.collapsedAccountGroups||[]).forEach(k=>{let sec=[...grid.querySelectorAll('[data-acct-group]')].find(x=>x.dataset.acctGroup===k);if(sec)sec.classList.add('collapsed')})}
function toggleAcctGroup(k){data.settings.collapsedAccountGroups=Array.isArray(data.settings.collapsedAccountGroups)?data.settings.collapsedAccountGroups:[];let set=new Set(data.settings.collapsedAccountGroups);if(set.has(k))set.delete(k);else set.add(k);data.settings.collapsedAccountGroups=[...set];try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}renderAccounts()}
function filterAccounts(f,el){acctFilter=f;document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));if(el)el.classList.add('active');renderAccounts()}function billStatus(b){let remaining=Number(b.remaining??b.amount??0),amount=Number(b.amount??remaining);return remaining<=0?'Paid':(remaining<amount?'Partial':'Unpaid')}
function billPeriod(b){if(b.periodStart&&b.periodEnd)return `${b.periodStart} - ${b.periodEnd}`;let end=b.statementDate||'';let card=data.accounts.find(a=>a.id===b.cardId)||{};let sd=card.statementDay||new Date(end||Date.now()).getDate();let e=new Date(end||Date.now());let start=new Date(e.getFullYear(),e.getMonth()-1,sd+1);return `${start.toISOString().slice(0,10)} - ${end}`}
function shortStatementDate(d){let x=new Date(d);return isNaN(x)?String(d||''):x.toLocaleDateString('en-PH',{month:'short',day:'numeric'})}
function compactBillPeriod(b){let start=b.periodStart,end=b.periodEnd||b.statementDate;if(!start||!end){let card=data.accounts.find(a=>a.id===b.cardId)||{};let e=new Date(end||b.dueDate||Date.now());let sd=card.statementDay||e.getDate();start=new Date(e.getFullYear(),e.getMonth()-1,sd+1);end=end||e}return shortStatementDate(start)+' - '+shortStatementDate(end)}
function billPayments(b){return data.txns.filter(t=>t.type==='Card Payment'&&t.billId===b.id).sort((a,b)=>new Date(b.date)-new Date(a.date))}
function isoDate(d){return new Date(d).toISOString().slice(0,10)}
function displayDate(d){return new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
function nextStatementDate(card){let now=new Date();now.setHours(0,0,0,0);let day=Math.min(28,Math.max(1,Number(card.statementDay||1)));let st=new Date(now.getFullYear(),now.getMonth(),day);if(st<now)st=new Date(now.getFullYear(),now.getMonth()+1,day);return st}
function dueFromStatement(card,st){let dd=Math.min(28,Math.max(1,Number(card.dueDay||1)));return new Date(st.getFullYear(),st.getMonth()+(dd<=Number(card.statementDay||1)?1:0),dd)}
function daysUntilDate(d){let today=new Date();today.setHours(0,0,0,0);let x=new Date(d);x.setHours(0,0,0,0);return Math.ceil((x-today)/86400000)}
function statusClass(status){status=String(status||'Unpaid');return status==='Paid'?'paid':(status==='Partial'?'partial':'unpaid')}
function cardOpenBills(cardId){return data.bills.filter(b=>b.cardId===cardId&&billStatus(b)!=='Paid').sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))}
function cardAllBills(cardId){return data.bills.filter(b=>b.cardId===cardId).sort((a,b)=>new Date(b.statementDate||b.dueDate)-new Date(a.statementDate||a.dueDate))}
function normCardKey(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'')}
function isCreditCardAccount(a){let hay=[a.type,a.name,a.institution].join(' ');return a.type==='Credit Card'||/credit|card|visa|mastercard|amex/i.test(hay)||Number(a.limit||0)>0||Number(a.statementDay||0)>0||Number(a.dueDay||0)>0}
function accountForCardBill(b,cards){
  let key=normCardKey(b.cardName);
  return cards.find(a=>b.cardId&&a.id===b.cardId)||
    cards.find(a=>key&&(normCardKey(a.name)===key||normCardKey(a.institution)===key))||
    cards.find(a=>{let name=normCardKey(a.name),inst=normCardKey(a.institution);return key&&((name&&name.includes(key))||(name&&key.includes(name))||(inst&&inst.includes(key))||(inst&&key.includes(inst)))})
}
function renderCreditCenter(){
  let el=document.getElementById('creditCenter');
  if(!el)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const billRows=(rows)=>rows&&rows.length?`<div class="ccStatementList">${rows.slice(0,4).map(b=>`<div class="ccStatementMini compactStatement"><div><b class="statementPeriod">${esc(compactBillPeriod(b))}</b><span class="sub">Due ${esc(displayDate(b.dueDate))}</span></div><div class="statementAmt"><b>${peso(b.remaining||0)}</b><span class="statusPill ${statusClass(billStatus(b))}">${billStatus(b)}</span></div></div>`).join('')}</div>`:'';
  let cards=(data.accounts||[]).filter(isCreditCardAccount);
  const groupedBills={};
  (data.bills||[]).filter(b=>billStatus(b)!=='Paid'&&Number(b.remaining||b.amount||0)>0).forEach(b=>{let acct=accountForCardBill(b,cards);let key=acct?acct.id:(b.cardId||b.cardName||'Card Statement');if(!groupedBills[key])groupedBills[key]=[];groupedBills[key].push(b)});
  Object.values(groupedBills).forEach(rows=>rows.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)));
  let cardsWithBills=cards.filter(a=>groupedBills[a.id]&&groupedBills[a.id].length);
  let virtualCards=Object.entries(groupedBills).filter(([key])=>!cardsWithBills.some(a=>a.id===key)).map(([key,rows])=>{
    let open=rows.find(b=>billStatus(b)!=='Paid')||rows[0]||{};
    return {id:key,name:open.cardName||key||'Credit Card',institution:'Statement record',type:'Credit Card',limit:0,outstanding:rows.filter(b=>billStatus(b)!=='Paid').reduce((s,b)=>s+Number(b.remaining||0),0),_virtual:true,_bills:rows};
  });
  let allCards=cardsWithBills.concat(virtualCards).sort((a,b)=>{
    let ar=a._bills||groupedBills[a.id]||[],br=b._bills||groupedBills[b.id]||[];
    let ad=ar.find(x=>billStatus(x)!=='Paid')||ar[0]||{},bd=br.find(x=>billStatus(x)!=='Paid')||br[0]||{};
    let at=new Date(ad.dueDate||8640000000000000).getTime(),bt=new Date(bd.dueDate||8640000000000000).getTime();
    let ao=Number(a.outstanding||0)||ar.reduce((s,x)=>s+Number(x.remaining||0),0),bo=Number(b.outstanding||0)||br.reduce((s,x)=>s+Number(x.remaining||0),0);
    return (at-bt)||(bo-ao)||String(a.name||'').localeCompare(String(b.name||''));
  });
  if(!allCards.length){
    el.innerHTML='<div class="billSetupCard"><b>No card bills to settle</b><p>Credit card accounts will appear here only when there is an unpaid statement or settlement due.</p></div>';
    return;
  }
  el.innerHTML=allCards.map(card=>{
    let rows=card._bills||groupedBills[card.id]||[];
    let nearest=rows.find(b=>billStatus(b)!=='Paid')||null;
    let statementDay=Number(card.statementDay||0), dueDay=Number(card.dueDay||0);
    let hasSchedule=statementDay&&dueDay&&!card._virtual;
    let st=hasSchedule?nextStatementDate(card):null;
    let due=hasSchedule?dueFromStatement(card,st):null;
    let out=Number(card.outstanding||0)||rows.filter(b=>billStatus(b)!=='Paid').reduce((s,b)=>s+Number(b.remaining||0),0);
    let limit=Number(card.limit||0), util=limit?Math.min(100,(out/limit)*100):0, avail=Math.max(0,limit-out);
    let dd=nearest?daysUntilDate(nearest.dueDate):(due?daysUntilDate(due):null);
    let dueText=nearest?`Due ${displayDate(nearest.dueDate)}`:(due?`Next due ${displayDate(due)}`:(card._virtual?'From statement records':'Add statement and due days'));
    let progClass=util>=80?'danger':util>=50?'warn':'';
    let pill=nearest?(dd<0?'Overdue':dd===0?'Due today':`${dd}d left`):(due?'No bill':(card._virtual?'Statement':'Setup needed'));
    let dueTone=dd===null?'':(dd<0||dd<=2?'danger':dd<=7?'warn':'');
    let icon=card._virtual?'<div class="bank otherbank">CC</div>':logo(card);
    let primary=nearest?`<button class="primary" onclick="openSettle('${String(nearest.id).replace(/'/g,"\\'")}')">Settle</button>`:`<button class="primary" onclick="closeSheets();openTxn()">Add Purchase</button>`;
    let secondary=card._virtual?'<button onclick="openAddCreditCard()">Create Account</button>':`<button onclick="openAccountDetail('${String(card.id).replace(/'/g,"\\'")}')">${(!statementDay||!dueDay||!limit)?'Finish Setup':'Details'}</button>`;
    let activeStatement=nearest?(nearest.statementDate||nearest.periodEnd||st):st;
    let activeDue=nearest?nearest.dueDate:due;
    return `<div class="premiumCreditCard"><div class="premiumCreditHeader"><div class="premiumCreditLeft">${icon}<div style="min-width:0"><div class="premiumCreditTitle">${esc(card.name||'Credit Card')}</div><div class="premiumCreditSub ${(!statementDay||!dueDay||!limit)&&!card._virtual?'missing':''}">${esc(card.institution||'Credit Card')} - ${esc(dueText)}</div></div></div><span class="premiumDuePill ${dueTone}">${pill}</span></div><div class="premiumCreditBody"><div class="premiumCreditMain"><span>Outstanding</span><b>${peso(out)}</b><div class="premiumProgress ${progClass}" style="margin-top:12px"><i style="width:${util}%"></i></div><div class="premiumMetaRow" style="margin-top:9px"><span>${limit?util.toFixed(0)+'% used':'Limit missing'}</span><span>${limit?peso(avail)+' available':'Add limit'}</span></div></div><div class="premiumCreditSide"><div><span>Limit</span><b>${limit?peso(limit):'Add'}</b></div><div><span>Available</span><b>${limit?peso(avail):'Add'}</b></div><div><span>Statement</span><b>${activeStatement?displayDate(activeStatement):'Add'}</b></div><div><span>Due date</span><b>${activeDue?displayDate(activeDue):'Add'}</b></div></div></div>${billRows(rows)}<div class="premiumCreditActions">${secondary}${primary}</div></div>`;
  }).join('');
}
function renderBills(){
  renderCreditCenter();
}
function txInPeriod(t,start,end){let d=new Date(t.date||Date.now());return d>=start&&d<end}
function groupAdd(obj,key,amt){obj[key]=(obj[key]||0)+Number(amt||0)}
function renderBars(income,expense,net){
  let el=document.getElementById('cashFlowBars');if(!el)return;
  let range=periodStartEnd(),anchor=new Date(range.start),buckets=[],period=reportPeriod;
  function addBucket(start,end,label){buckets.push({start,end,label,income:0,expense:0})}
  if(period==='Today'){
    for(let i=6;i>=0;i--){let s=new Date(anchor);s.setDate(s.getDate()-i);let e=new Date(s);e.setDate(e.getDate()+1);addBucket(s,e,s.toLocaleDateString('en-PH',{month:'short',day:'numeric'}))}
  }else if(period==='Week'){
    for(let i=6;i>=0;i--){let s=new Date(anchor);s.setDate(s.getDate()-(i*7));let e=new Date(s);e.setDate(e.getDate()+7);addBucket(s,e,s.toLocaleDateString('en-PH',{month:'short',day:'numeric'}))}
  }else if(period==='Year'){
    for(let i=4;i>=0;i--){let y=anchor.getFullYear()-i;addBucket(new Date(y,0,1),new Date(y+1,0,1),String(y))}
  }else{
    for(let i=5;i>=0;i--){let s=new Date(anchor.getFullYear(),anchor.getMonth()-i,1);let e=new Date(s.getFullYear(),s.getMonth()+1,1);addBucket(s,e,s.toLocaleDateString('en-PH',{month:'short'}))}
  }
  (data.txns||[]).forEach(t=>{
    let b=buckets.find(x=>txInPeriod(t,x.start,x.end));if(!b)return;
    let amt=Number(t.amount||0);
    if(t.type==='Income')b.income+=amt;
    else if(t.type==='Expense')b.expense+=amt;
    else if(t.type==='Transfer'&&Number(t.fee||0))b.expense+=Number(t.fee||0);
  });
  let max=Math.max(1,...buckets.flatMap(b=>[b.income,b.expense]));let barH=v=>v>0?Math.max(6,v/max*100):0;
  let best=buckets.reduce((a,b)=>((b.income-b.expense)>(a.income-a.expense)?b:a),buckets[0]||{income:0,expense:0,label:'-'});
  let worst=buckets.reduce((a,b)=>((b.expense-b.income)>(a.expense-a.income)?b:a),buckets[0]||{income:0,expense:0,label:'-'});
  el.innerHTML=`<div class="trendSummary"><div><span>Income</span><b class="green">${peso(income)}</b></div><div><span>Expense</span><b class="red">${peso(expense)}</b></div><div><span>Net</span><b class="${net>=0?'green':'red'}">${net>=0?'+':''}${peso(net)}</b></div></div><div class="trendLegend"><span><i class="income"></i>Income</span><span><i class="expense"></i>Expense</span></div><div class="periodTrendBars" style="grid-template-columns:repeat(${buckets.length},minmax(0,1fr))">${buckets.map(b=>`<div class="periodTrendBucket" title="${htmlText(b.label)} income ${peso(b.income)}, expense ${peso(b.expense)}"><div class="periodTrendPair"><i class="income" style="height:${barH(b.income)}%"></i><i class="expense" style="height:${barH(b.expense)}%"></i></div><span>${htmlText(b.label)}</span></div>`).join('')}</div><div class="trendNotes"><div><b>Best</b><span>${htmlText(best.label)} - ${peso(best.income-best.expense)}</span></div><div><b>Heaviest spend</b><span>${htmlText(worst.label)} - ${peso(worst.expense)}</span></div></div>`;
}
function txnTimestamp(t){let d=new Date(t&&t.date);return isNaN(d.getTime())?0:d.getTime()}
function recentTxns(list){return (list||[]).map((t,i)=>({t,i})).sort((a,b)=>(txnTimestamp(b.t)-txnTimestamp(a.t))||(b.i-a.i)).map(x=>x.t)}
function accountTxns(accountId){return recentTxns(data.txns.filter(t=>t.from===accountId||t.to===accountId))}
function accountStats(accountId){let income=0,expense=0,transferIn=0,transferOut=0,fees=0,payments=0;accountTxns(accountId).forEach(t=>{let amt=Number(t.amount||0),fee=Number(t.fee||0);if(t.type==='Income'&&t.from===accountId)income+=amt;else if(t.type==='Expense'&&t.from===accountId)expense+=amt;else if(t.type==='Transfer'){if(t.from===accountId){transferOut+=amt;fees+=fee}else if(t.to===accountId)transferIn+=amt}else if(t.type==='Card Payment'){if(t.from===accountId)payments+=amt; if(t.to===accountId)payments+=amt}});return {income,expense,transferIn,transferOut,fees,payments}}
function openAccountDetail(id){let a=data.accounts.find(x=>x.id===id);if(!a)return;let st=accountStats(id);let tx=accountTxns(id).slice(0,12);let main=a.type==='Credit Card'?Number(a.outstanding||0):Number(a.balance||0);let label=a.type==='Credit Card'?'Outstanding':'Current Balance';let statements=a.type==='Credit Card'?cardAllBills(a.id):[];let openBill=statements.find(b=>billStatus(b)!=='Paid');let nextSt=a.type==='Credit Card'?nextStatementDate(a):null;let nextDue=a.type==='Credit Card'?dueFromStatement(a,nextSt):null;let baseNote=a.type==='Credit Card'?'':`<div class="sub accountBaseNote">Starting ${peso(a.ledgerBaseBalance||0)}</div>`;let extra=a.type==='Credit Card'?`<div class="statBox"><span class="small">Credit Limit</span><b>${peso(a.limit||0)}</b></div><div class="statBox"><span class="small">Available</span><b>${peso((a.limit||0)-(a.outstanding||0))}</b></div><div class="statBox"><span class="small">Next Statement</span><b>${displayDate(nextSt)}</b></div><div class="statBox"><span class="small">Next Due</span><b>${openBill?displayDate(openBill.dueDate):displayDate(nextDue)}</b></div>`:`<div class="statBox"><span class="small">Income</span><b>${peso(st.income)}</b></div><div class="statBox"><span class="small">Expense</span><b>${peso(st.expense)}</b></div><div class="statBox"><span class="small">Transfers In</span><b>${peso(st.transferIn)}</b></div><div class="statBox"><span class="small">Transfers Out</span><b>${peso(st.transferOut+st.fees)}</b></div>`;let statementHtml=a.type==='Credit Card'?`<div class="section"><h2>Statement History</h2>${openBill?`<button class="ghost" onclick="openSettle('${openBill.id}')">Settle Current</button>`:''}</div><div class="statementList">${statements.length?statements.map(b=>`<div class="statementMini compactStatement"><div><b class="statementPeriod">${compactBillPeriod(b)}</b><div class="sub">Due ${displayDate(b.dueDate)}</div></div><div class="statementAmt"><b>${peso(b.remaining||0)}</b><span class="statusPill ${statusClass(billStatus(b))}">${billStatus(b)}</span></div></div>`).join(''):'<div class="emptyState">No statement history yet. Credit card purchases will create statement records automatically.</div>'}</div>`:'';accountDetailBody.innerHTML=`<section class="detailHero"><div class="detailTop">${logo(a)}<div><div class="name">${a.name}</div><div class="inst">${a.institution||a.type} - ${a.type}</div></div></div><div class="small" style="margin-top:14px">${label}</div><div class="detailAmount">${peso(main)}</div>${baseNote}${a.type==='Credit Card'?`<div class="bar"><i style="width:${Math.min(100,((a.outstanding||0)/(a.limit||1))*100)}%"></i></div>`:''}</section><div class="statGrid">${extra}</div><div class="sheetActions"><button class="primary" onclick="editAccountFromDetail('${a.id}')">Edit Account</button><button onclick="openTxnFromDetail()">Add Transaction</button></div><button class="dangerBtn" onclick="deleteAccountById('${a.id}')">Delete Account</button>${statementHtml}<div class="section"><h2>Recent Activity</h2></div><div class="detailList">${tx.length?tx.map(t=>txnRow(t,true)).join(''):'<div class="emptyState">No activity yet for this account.</div>'}</div>`;showModal();accountDetailSheet.classList.add('show')}
function editAccountFromDetail(id){accountDetailSheet.classList.remove('show');editAccount(id)}
function openTxnFromDetail(){accountDetailSheet.classList.remove('show');openTxn()}


let searchFilter='All';
function setSearchFilter(f,el){searchFilter=f;document.querySelectorAll('.searchTabs button').forEach(b=>b.classList.remove('active'));if(el)el.classList.add('active');renderGlobalSearch()}
function resultIcon(kind,type){if(kind==='acct')return 'AC';if(kind==='bill')return 'DU';if(type==='Income')return 'IN';if(type==='Expense')return 'EX';if(type==='Transfer')return 'TR';return 'TX'}
function renderGlobalSearch(){let out=document.getElementById('globalSearchResults');if(!out)return;let input=document.getElementById('globalSearchInput'),q=(input?.value||'').toLowerCase().trim();let results=[];if(searchFilter==='All'||searchFilter==='Transactions'){data.txns.slice().reverse().forEach(t=>{let from=accountLabel(t.from),to=t.to?accountLabel(t.to):'',date=new Date(t.date).toLocaleDateString('en-PH'),hay=[t.type,t.category,t.note,from,to,peso(t.amount),date].join(' ').toLowerCase();if(!q||hay.includes(q))results.push({kind:'txn',type:t.type,title:`${t.type}${t.category?' - '+t.category:''}`,sub:`${from}${to?' to '+to:''} - ${date}${t.note?' - '+t.note:''}`,amount:Number(t.amount||0),id:t.id})})}if(searchFilter==='All'||searchFilter==='Accounts'){data.accounts.forEach(a=>{let hay=[a.name,a.institution,a.type,peso(a.balance),peso(a.outstanding)].join(' ').toLowerCase();if(!q||hay.includes(q))results.push({kind:'acct',title:a.name,sub:`${a.institution||a.type} - ${a.type}`,amount:a.type==='Credit Card'?Number(a.outstanding||0):Number(a.balance||0),id:a.id})})}if(searchFilter==='All'||searchFilter==='Bills'){data.bills.slice().sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).forEach(b=>{let hay=[b.cardName,b.status,b.dueDate,peso(b.remaining)].join(' ').toLowerCase();if(!q||hay.includes(q))results.push({kind:'bill',title:b.cardName,sub:`Due ${b.dueDate} - ${billStatus(b)}`,amount:Number(b.remaining||0),id:b.id})})}results=results.slice(0,!q&&searchFilter==='All'?15:40);out.innerHTML=results.length?results.map(r=>`<div class="resultCard"><div class="resultLeft"><div class="dot">${resultIcon(r.kind,r.type)}</div><div class="resultText"><b>${htmlText(r.title)}</b><div class="sub">${htmlText(r.sub)}</div></div></div><b class="${r.kind==='txn'&&r.type==='Income'?'green':r.kind==='txn'&&r.type==='Expense'?'red':''}">${peso(r.amount)}</b></div>`).join(''):`<div class="emptyCenter">${q?'No results found.':'Start typing to search your PesoTrack data.'}</div>`}

function renderReports(){
  ensureReportPeriodNav();
  updateReportPeriodLabel();
  const {start,end}=periodStartEnd();
  const txns=(data.txns||[]).filter(t=>txInPeriod(t,start,end));
  let income=0,expense=0;
  txns.forEach(t=>{
    const amt=Number(t.amount||0);
    if(t.type==='Income')income+=amt;
    else if(t.type==='Expense')expense+=amt;
    else if(t.type==='Transfer'&&Number(t.fee||0))expense+=Number(t.fee||0);
  });
  renderBars(income,expense,income-expense);
  try{if(typeof updateReportsScope==='function')updateReportsScope()}catch(e){console.warn('Report scope skipped',e)}
  try{if(typeof renderExpenseBreakdown==='function')renderExpenseBreakdown()}catch(e){console.warn('Expense breakdown skipped',e)}
  try{if(typeof renderInsights==='function')renderInsights()}catch(e){console.warn('Report insights skipped',e)}
  try{if(typeof renderTransactionsList==='function')renderTransactionsList()}catch(e){console.warn('Report transactions skipped',e)}
}function showModal(){modalBackdrop.classList.add('show');document.body.classList.add('modal-open')}function hideModalIfNone(){setTimeout(()=>{if(!document.querySelector('.sheet.show')){modalBackdrop.classList.remove('show');document.body.classList.remove('modal-open')}},0)}function closeTopModal(){let sheets=[...document.querySelectorAll('.sheet.show')];if(!sheets.length)return;let top=sheets[sheets.length-1];top.classList.remove('show');hideModalIfNone()}function closeSheets(){document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('show'));modalBackdrop.classList.remove('show');document.body.classList.remove('modal-open')}function openAddAccount(){editingAccount=null;acctTitle.textContent='Add Account';atype.value='Savings';inst.value='';aname.value='';let lf=document.getElementById('instLogo');if(lf){lf.value='otherbank';lf.dataset.manual=''}renderAccountFields();renderLogoPicker('otherbank');showModal();accountSheet.classList.add('show')}function editAccount(id){let a=data.accounts.find(x=>x.id===id); if(!a)return; editingAccount=id; acctTitle.textContent='Edit Account';atype.value=a.type;inst.value=a.institution||'';aname.value=a.name;let key=a.logoKey||banks[a.institution]||'otherbank';let lf=document.getElementById('instLogo');if(lf){lf.value=key;lf.dataset.manual='1'}renderAccountFields(a);renderLogoPicker(key);showModal();accountSheet.classList.add('show')}function renderAccountFields(a={}){let t=atype.value;if(document.getElementById('inst')){inst.style.display=t==='Cash'?'none':''; if(t==='Cash') inst.value='';} if(t==='Cash' && document.getElementById('aname') && !aname.value) aname.value='Cash on Hand';dynamicFields.innerHTML=t==='Credit Card'?`<input class="field" id="limit" type="number" placeholder="Credit limit" value="${a.limit||''}"><input class="field" id="statementDay" type="number" placeholder="Statement day, e.g. 15" value="${a.statementDay||''}"><input class="field" id="dueDay" type="number" placeholder="Due day, e.g. 5" value="${a.dueDay||''}"><button class="ghost" onclick="deleteAccount()">Delete</button>`:`<input class="field" id="balance" type="number" placeholder="${t==='Investment'?'Current value':'Opening balance'}" value="${a.balance||''}"><button class="ghost" onclick="deleteAccount()">Delete</button>`}function saveAccount(){
  try{
    const typeEl=document.getElementById('atype'), instEl=document.getElementById('inst'), nameEl=document.getElementById('aname');
    if(!typeEl) throw new Error('Account type field is missing');
    if(!nameEl) throw new Error('Account name field is missing');
    let t=typeEl.value||'Savings';
    let existing=data.accounts.find(x=>x.id===editingAccount);
    let a=existing||{id:uid(),outstanding:0,balance:0};
    a.type=t;
    a.institution=t==='Cash'?'Cash':(instEl&&instEl.value&&instEl.value.trim()?instEl.value.trim():'Other');
    a.name=(nameEl.value||'').trim() || (t==='Cash'?'Cash on Hand':(a.institution||t));
    a.logoKey=(document.getElementById('instLogo')||{}).value||undefined;

    if(t==='Credit Card'){
      const limitEl=document.getElementById('limit'), sdEl=document.getElementById('statementDay'), ddEl=document.getElementById('dueDay');
      const lim=Number(limitEl&&limitEl.value!==''?limitEl.value:0);
      const sd=Number(sdEl&&sdEl.value!==''?sdEl.value:1);
      const dd=Number(ddEl&&ddEl.value!==''?ddEl.value:1);
      if(!Number.isFinite(lim) || lim < 0) throw new Error('Credit limit must be a valid number');
      if(!Number.isFinite(sd) || sd < 1 || sd > 31) throw new Error('Statement day must be 1 to 31');
      if(!Number.isFinite(dd) || dd < 1 || dd > 31) throw new Error('Due day must be 1 to 31');
      a.limit=lim;
      a.statementDay=Math.min(28,Math.max(1,sd));
      a.dueDay=Math.min(28,Math.max(1,dd));
      a.balance=0;
      a.outstanding=Number(a.outstanding||0);
      if(!Number.isFinite(Number(a.ledgerBaseOutstanding))){const fx=accountTxnEffect(a.id);a.ledgerBaseOutstanding=Number(a.outstanding||0)-fx.outstanding}
      a.ledgerBaseBalance=0;
    }else{
      const balEl=document.getElementById('balance');
      const bal=Number(balEl&&balEl.value!==''?balEl.value:0);
      if(!Number.isFinite(bal)) throw new Error('Opening balance must be a valid number');
      const fx=accountTxnEffect(a.id);
      a.ledgerBaseBalance=bal-fx.balance;
      a.balance=bal;
      delete a.limit; delete a.statementDay; delete a.dueDay;
      a.outstanding=0;
      a.ledgerBaseOutstanding=0;
    }

    if(!existing)data.accounts.push(a);
    try{ localStorage.setItem(KEY,JSON.stringify(data)); }
    catch(storageErr){ console.warn('LocalStorage save failed; keeping session data only.',storageErr); }

    acctFilter='All';
    document.querySelectorAll('.chip').forEach((c,i)=>c.classList.toggle('active',i===0));
    closeSheets();
    go('accounts',document.querySelectorAll('.nav button')[1]);
    if(typeof showToast==='function')showToast(existing?'Account updated':'Account saved');
  }catch(err){
    console.error('Save account failed:',err);
    alert('Unable to save account. Details: '+(err&&err.message?err.message:String(err)));
  }
}
function deleteAccountById(id){
  const a=data.accounts.find(x=>x.id===id); if(!a)return;
  const related=data.txns.filter(t=>t.from===id||t.to===id).length;
  let msg=`Delete ${a.name||'this account'}?`+(related?`\n\nThis account has ${related} related transaction${related===1?'':'s'}. The transactions will stay in history but will show as Deleted Account.`:'');
  if(confirm(msg)){
    data.accounts=data.accounts.filter(x=>x.id!==id);
    if(editingAccount===id)editingAccount=null;
    persist();
    closeSheets();
    acctFilter='All';
    document.querySelectorAll('.chip').forEach((c,i)=>c.classList.toggle('active',i===0));
    go('accounts',document.querySelectorAll('.nav button')[1]);
    if(typeof showToast==='function')showToast('Account deleted');
  }
}
function deleteAccount(){if(!editingAccount)return closeSheets(); deleteAccountById(editingAccount)}function txnInputDateValue(v){let d=v?new Date(v):new Date();if(isNaN(d.getTime()))d=new Date();let offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,10)}function txnIsoFromInput(v,fallback){let day=v||txnInputDateValue(fallback);let d=new Date(day+'T12:00:00');if(isNaN(d.getTime()))d=new Date();return d.toISOString()}function accountById(id){return data.accounts.find(a=>a.id===id)}






function chooseRecurringCat(){
  let type=document.getElementById('recType')?.value||'Expense';
  pickerSheet.classList.add('compactCategoryPicker');
  pickerMode='recurringCategory';
  pickerField='recCategory';
  pickerTitle.textContent=type==='Income'?'Choose Income Source':'Choose Category';
  pickerSub.textContent=type==='Income'?'Tap the source of income':'Tap a category';
  pickerSearch.value='';
  renderPicker();
  showModal();
  pickerSheet.classList.add('show')
}

function categoryListForTxn(){let mode=pickerMode==='recurringCategory'?(document.getElementById('recType')?.value||'Expense'):txnType;let preferred=mode==='Income'?['Salary','Bonus','Freelance','Interest','Refund','Investment','Other']:['Food','Groceries','Coffee','Dining','Transport','Gas','Parking','Shopping','Bills','Utilities','Rent','Internet','Phone','Health','Medicine','Insurance','Travel','Entertainment','Subscriptions','Education','Family','Pets','Gifts','Debt Payment','Credit Card','Transfer Fees','MP2','Other'];let saved=(data.categories||[]);return [...new Set(preferred.concat(saved).map(c=>String(c||'').trim()).filter(Boolean))]}
function categoryCode(c){const map={Food:'FD',Groceries:'GR',Coffee:'CF',Dining:'DN',Transport:'TR',Gas:'GS',Parking:'PK',Shopping:'SH',Bills:'BL',Utilities:'UT',Rent:'RN',Internet:'IN',Phone:'PH',Health:'HL',Medicine:'MD',Insurance:'IS',Travel:'TV',Entertainment:'EN',Subscriptions:'SB',Education:'ED',Family:'FM',Pets:'PT',Gifts:'GF',Salary:'PY',Bonus:'BN',Freelance:'FL',Interest:'IT',Refund:'RF',Investment:'IV',Savings:'SV','Debt Payment':'DT','Credit Card':'CC','Transfer Fees':'TF',Transfer:'TR',MP2:'MP',Other:'OT'};let key=String(c||'Other').trim();if(map[key])return map[key];let words=key.split(/\s+/).filter(Boolean);return (words.length>1?words.map(w=>w[0]).join(''):key.slice(0,2)).slice(0,2).toUpperCase()||'OT'}
function selectAccount(id){
  if(txnType==='Transfer'){
    if(pickerField==='from' && id===txn.to) return alert('From and To cannot be the same account.');
    if(pickerField==='to' && id===txn.from) return alert('From and To cannot be the same account.');
  }
  txn[pickerField]=id;
  closePicker();
  renderTxn();
}
function selectCategory(c){c=String(c||'').trim();if(!c)return;if(!data.categories.some(x=>x.toLowerCase()===c.toLowerCase())){data.categories.push(c);try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}if(pickerMode==='recurringCategory'){recurringDraftCategory=c;let input=document.getElementById('recCategory');if(input)input.value=c;let btn=document.getElementById('recCategoryPick');if(btn)btn.innerHTML=`<div class="catCircle">${catIcon(c)}</div><div class="txnPickText"><b>${document.getElementById('recType')?.value==='Income'?'Source':'Category'}</b><span>${htmlText(c)}</span><em>Recurring ${document.getElementById('recType')?.value==='Income'?'income source':'expense category'}</em></div>`;closePicker();return}txn.category=c;closePicker();renderTxn()}


function adjustBill(id,delta){if(!id)return;let b=data.bills.find(x=>x.id===id);if(!b)return;b.amount=Math.max(0,(b.amount||0)+delta);b.remaining=Math.max(0,(b.remaining||0)+delta);b.status=b.remaining<=0?'Paid':(b.remaining<b.amount?'Partial':'Unpaid')}

function generateBill(card,amt,forDate){let now=forDate?new Date(forDate):new Date();if(isNaN(now.getTime()))now=new Date();let y=now.getFullYear(),m=now.getMonth(),sd=card.statementDay||1,dd=card.dueDay||1;let st=new Date(y,m,sd);if(now>st)st=new Date(y,m+1,sd);let due=new Date(st.getFullYear(),st.getMonth()+(dd<=sd?1:0),dd);let prev=new Date(st.getFullYear(),st.getMonth()-1,sd+1);let id=card.id+'-'+st.toISOString().slice(0,10);let b=data.bills.find(x=>x.id===id);if(!b){b={id,cardId:card.id,cardName:card.name,periodStart:prev.toISOString().slice(0,10),periodEnd:st.toISOString().slice(0,10),statementDate:st.toISOString().slice(0,10),dueDate:due.toISOString().slice(0,10),amount:0,remaining:0,status:'Unpaid'};data.bills.push(b)}b.cardName=card.name;b.amount+=amt;b.remaining+=amt;b.status=billStatus(b);return id}
function setPayAmount(mode){if(!settling)return;document.querySelectorAll('.payMode').forEach(b=>b.classList.remove('active'));let btn=document.querySelector(`[data-paymode="${mode}"]`);if(btn)btn.classList.add('active');if(mode==='full')payAmount.value=Number(settling.remaining||0);if(mode==='half')payAmount.value=Math.ceil(Number(settling.remaining||0)/2);if(mode==='custom'){payAmount.focus();payAmount.select()}}
function openSettle(id){settling=data.bills.find(b=>b.id===id);if(!settling){alert('This bill is no longer available to settle.');return}let detail=document.getElementById('accountDetailSheet');if(detail)detail.classList.remove('show');let banks=data.accounts.filter(a=>a.type!=='Credit Card');let card=data.accounts.find(a=>a.id===settling.cardId)||{};settleBody.innerHTML=`<div class="paySummary"><div class="small">${settling.cardName}</div><h3 style="margin:6px 0 2px">${peso(settling.remaining)}</h3><div class="sub">Due ${settling.dueDate} - ${billPeriod(settling)}</div></div>${banks.length?`<label class="small">Pay from</label><select class="field" id="payFrom">${banks.map(a=>`<option value="${a.id}">${a.name} (${a.institution}) - ${peso(a.balance||0)}</option>`).join('')}</select><div class="paymentModes"><button class="payMode active" data-paymode="full" onclick="setPayAmount('full')">Full remaining</button><button class="payMode" data-paymode="half" onclick="setPayAmount('half')">Half</button></div><label class="small">Payment amount</label><input class="field" id="payAmount" type="number" value="${settling.remaining}"><button class="save" onclick="settleBill()">Record Payment</button>`:'<div class="empty">Add a Savings, Wallet, Cash, or Investment account first so you can choose where the payment comes from.</div>'}<div class="payHistory"><div class="small">Previous payments</div>${billPayments(settling).length?billPayments(settling).map(p=>`<div class="historyRow"><span>${txnDate(p)} - ${accountLabel(p.from)}</span><b>${peso(p.amount)}</b></div>`).join(''):'<div class="sub">No payments recorded yet.</div>'}</div>`;showModal();settleSheet.classList.add('show')}
function settleBill(){let a=data.accounts.find(x=>x.id===payFrom.value),card=data.accounts.find(x=>x.id===settling.cardId),amt=Number(payAmount.value||0);if(!a||!card||!amt)return alert('Choose account and amount');if(amt>Number(settling.remaining||0)&&!confirm('Payment is higher than the remaining bill. Continue?'))return;let t={id:uid(),type:'Card Payment',amount:amt,date:new Date().toISOString(),from:a.id,to:card.id,billId:settling.id};applyTxn(t);data.txns.push(t);persist();closeSheets()}


function txnMatches(t,q){if(!q)return true;let hay=[t.type,t.category,t.note,accountLabel(t.from),accountLabel(t.to),String(t.amount),txnDate(t)].join(' ').toLowerCase();return hay.includes(q.toLowerCase())}
function accountOptionsForRecurring(type,selected=''){let arr=data.accounts.filter(a=>type==='Income'?a.type!=='Credit Card':true);return arr.map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${a.name} (${a.institution||a.type}) - ${a.type==='Credit Card'?'Outstanding '+peso(a.outstanding||0):'Balance '+peso(a.balance||0)}</option>`).join('')}
function renderRecurringFields(r={}){let type=recType.value;let selected=recurringDraftCategory||r.category||(type==='Income'?'Salary':'Food');recurringDraftCategory=selected;recDynamic.innerHTML=`<label class="small">${type==='Income'?'Deposit to':'Pay from'}</label><select class="field" id="recAccount">${accountOptionsForRecurring(type,r.accountId||'')}</select><input type="hidden" id="recCategory" value="${htmlText(selected)}"><button type="button" id="recCategoryPick" class="txnPickBtn wide" onclick="chooseRecurringCat()"><div class="catCircle">${catIcon(selected)}</div><div class="txnPickText"><b>${type==='Income'?'Source':'Category'}</b><span>${htmlText(selected)}</span><em>Recurring ${type==='Income'?'income source':'expense category'}</em></div></button>`}
function openRecurring(id){editingRecurring=id||null;let r=editingRecurring?data.recurring.find(x=>x.id===editingRecurring):null;recTitle.textContent=r?'Edit Recurring':'Add Recurring';recType.value=r?.type||'Income';recName.value=r?.name||'';recAmount.value=r?.amount||'';recDay.value=r?.day||'';recEnabled.checked=r? r.enabled!==false:true;recurringDraftCategory=r?.category||(recType.value==='Income'?'Salary':'Food');renderRecurringFields(r||{});recDeleteBtn.classList.toggle('hide',!r);showModal();recurringSheet.classList.add('show')}
function saveRecurring(){let type=recType.value,accountId=recAccount.value,amount=Number(recAmount.value||0),day=Math.max(1,Math.min(31,Number(recDay.value||0))),category=(document.getElementById('recCategory')?.value||recurringDraftCategory||'Other').trim();if(!accountId)return alert('Choose an account');if(!category)return alert('Choose a category');if(!amount)return alert('Enter amount');if(!day)return alert('Enter day of month');let r=data.recurring.find(x=>x.id===editingRecurring)||{id:uid(),createdAt:new Date().toISOString()};r.type=type;r.name=recName.value||category||type;r.accountId=accountId;r.category=category;r.amount=amount;r.day=day;r.enabled=recEnabled.checked;if(!editingRecurring)data.recurring.push(r);persist();closeSheets();toastMsg('Recurring item saved')}
function deleteRecurring(){if(!editingRecurring)return closeSheets();if(!confirm('Delete this recurring rule? Already generated transactions will remain.'))return;data.recurring=data.recurring.filter(r=>r.id!==editingRecurring);editingRecurring=null;persist();closeSheets()}
function nextRecurringDate(r){let now=new Date(),d=new Date(now.getFullYear(),now.getMonth(),Math.min(Number(r.day||1),daysInMonth(now.getFullYear(),now.getMonth())));d.setHours(0,0,0,0);if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate()))d=new Date(now.getFullYear(),now.getMonth()+1,Math.min(Number(r.day||1),daysInMonth(now.getFullYear(),now.getMonth()+1)));return d}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate()}
function occurrenceDateFor(r,y,m){return new Date(y,m,Math.min(Number(r.day||1),daysInMonth(y,m)))}
function runRecurring(showMsg=true){return 0}
function recurringDaySuffix(n){n=Number(n||0);let v=n%100;if(v>=11&&v<=13)return 'th';return ({1:'st',2:'nd',3:'rd'}[n%10]||'th')}
function recurringMonthKey(d=new Date()){let date=d instanceof Date?d:new Date(d||Date.now());return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')}
function currentRecurringOccurrence(r){let now=new Date();return occurrenceDateFor(r,now.getFullYear(),now.getMonth())}
function recurringOccurrenceKey(r,d){let date=d||currentRecurringOccurrence(r);return date.toISOString().slice(0,10)}
function recurringIsPaidThisMonth(r){let key=recurringMonthKey(new Date());return (data.txns||[]).some(t=>t.recurringId===r.id&&(t.occurrenceMonth===key||String(t.occurrenceKey||'').slice(0,7)===key))}
function payRecurring(id){let r=data.recurring.find(x=>x.id===id);if(!r)return;let a=data.accounts.find(x=>x.id===r.accountId);if(!a)return alert('Choose an account for this recurring item first.');if(r.enabled===false)return alert('Enable this recurring item first.');if(recurringIsPaidThisMonth(r))return toastMsg((r.type==='Income'?'Received':'Paid')+' for this month already');let occ=currentRecurringOccurrence(r),key=recurringOccurrenceKey(r,occ);let t={id:uid(),type:r.type,amount:Number(r.amount||0),fee:0,category:r.category||r.name||r.type,date:new Date().toISOString(),from:r.accountId,to:null,recurringId:r.id,occurrenceKey:key,occurrenceMonth:recurringMonthKey(occ),note:'Recurring: '+(r.name||r.type)};if(!applyTxn(t))return alert('Could not record this recurring transaction.');data.txns.push(t);persist();toastMsg(r.type==='Income'?'Marked received':'Marked paid')}
function recurringSortValue(r){let disabled=r.enabled===false,paid=recurringIsPaidThisMonth(r),next=nextRecurringDate(r);return {status:disabled?2:paid?1:0,next:next.getTime()||0,name:String(r.name||r.category||'')}}
function sortRecurringItems(items){return (items||[]).slice().sort((a,b)=>{let aa=recurringSortValue(a),bb=recurringSortValue(b);return (aa.status-bb.status)||(aa.next-bb.next)||aa.name.localeCompare(bb.name)})}
function renderRecurring(){let el=document.getElementById('recurringList');if(!el)return;let arr=sortRecurringItems(data.recurring||[]);el.innerHTML=arr.length?arr.map(r=>{let a=data.accounts.find(x=>x.id===r.accountId);let next=nextRecurringDate(r);let paid=recurringIsPaidThisMonth(r);let action=r.type==='Income'?'Received':'Pay';let doneLabel=r.type==='Income'?'Received':'Paid';let disabled=r.enabled===false;return `<div class="recurringCard ${paid?'isPaid':''}"><div class="recTop"><div class="recIdentity"><b>${htmlText(r.name)}</b><div class="recMeta">${htmlText(r.type)} - ${htmlText(r.category||'Other')} - ${a?htmlText(a.name)+' ('+htmlText(a.institution||a.type)+')':'Missing account'}</div></div><span class="recPill ${paid?'paid':'due'}">${paid?doneLabel:'Every '+htmlText(r.day)+recurringDaySuffix(r.day)}</span></div><div class="minirow" style="margin-top:10px"><span>Amount</span><b>${peso(r.amount)}</b></div><div class="minirow"><span>Next</span><b>${next.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</b></div><div class="recActions"><button class="tiny" onclick="openRecurring('${jsString(r.id)}')">Edit</button><button class="tiny ${disabled?'':'danger'}" onclick="toggleRecurring('${jsString(r.id)}')">${disabled?'Enable':'Disable'}</button>${paid?'':`<button class="tiny primary" ${disabled?'disabled':''} onclick="payRecurring('${jsString(r.id)}')">${action}</button>`}</div></div>`}).join(''):'<div class="row"><span class="sub">No recurring items yet. Add salary, subscriptions, MP2, utilities, or monthly bills.</span></div>'}

function currentMonthRange(){let now=new Date();return {start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth()+1,1)}}
function monthlyCategorySpend(){let {start,end}=currentMonthRange(),spend={};data.txns.filter(t=>txInPeriod(t,start,end)).forEach(t=>{if(t.type==='Expense')groupAdd(spend,t.category||'Other',Number(t.amount||0));if(t.type==='Transfer'&&Number(t.fee||0))groupAdd(spend,'Transfer Fees',Number(t.fee||0))});return spend}
function openBudget(id){editingBudget=id||null;let b=editingBudget?data.budgets.find(x=>x.id===editingBudget):null;let cats=[...new Set((data.categories||defaultCategories()).concat(b&&b.category?[b.category]:[]))];budgetCategory.innerHTML=cats.map(c=>`<option value="${htmlText(c)}">${categoryCode(c)} - ${htmlText(c)}</option>`).join('');budgetTitle.textContent=b?'Edit Budget':'Add Budget';budgetCategory.value=b?.category||'Food';budgetAmount.value=b?.amount||'';budgetDeleteBtn.classList.toggle('hide',!b);showModal();budgetSheet.classList.add('show')}
function saveBudget(){let cat=budgetCategory.value,amt=Number(budgetAmount.value||0);if(!cat)return alert('Choose category');if(!amt)return alert('Enter monthly limit');let b=data.budgets.find(x=>x.id===editingBudget)||{id:uid()};b.category=cat;b.amount=amt;if(!editingBudget)data.budgets.push(b);persist();closeSheets()}
function deleteBudget(id){let bid=id||editingBudget;if(!bid)return closeSheets();if(!confirm('Delete this budget?'))return;data.budgets=data.budgets.filter(b=>b.id!==bid);if(editingBudget===bid)editingBudget=null;persist();closeSheets()}

function monthRange(offset=0){let now=new Date();let start=new Date(now.getFullYear(),now.getMonth()+offset,1);let end=new Date(now.getFullYear(),now.getMonth()+offset+1,1);return {start,end}}
function txnsInRange(start,end){return data.txns.filter(t=>{let d=new Date(t.date);return d>=start&&d<end})}
function summarizeTxns(txns){let income=0,expense=0,cats={},sources={};txns.forEach(t=>{let amt=Number(t.amount||0);if(t.type==='Income'){income+=amt;groupAdd(sources,t.category||accountLabel(t.from)||'Income',amt)}else if(t.type==='Expense'){expense+=amt;groupAdd(cats,t.category||'Other',amt)}else if(t.type==='Transfer'&&Number(t.fee||0)>0){expense+=Number(t.fee||0);groupAdd(cats,'Transfer Fees',Number(t.fee||0))}});return {income,expense,net:income-expense,cats,sources,savingsRate:income>0?Math.round(((income-expense)/income)*100):0}}
function averageCardUtilization(){let cards=data.accounts.filter(a=>a.type==='Credit Card'&&Number(a.limit||0)>0);if(!cards.length)return 0;return Math.round(cards.reduce((s,a)=>s+(Number(a.outstanding||0)/Number(a.limit||1))*100,0)/cards.length)}
function budgetComplianceScore(){if(!data.budgets||!data.budgets.length)return 85;let spend=monthlyCategorySpend(),scores=data.budgets.map(b=>{let used=Number(spend[b.category]||0),limit=Number(b.amount||0)||1,pct=used/limit;if(pct<=.8)return 100;if(pct<=1)return 75;return Math.max(20,100-Math.round((pct-1)*120))});return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)}
function unpaidBillScore(){let unpaid=(data.bills||[]).filter(b=>b.status!=='Paid');if(!unpaid.length)return 100;let overdue=unpaid.filter(b=>daysUntil(b.dueDate)<0).length,soon=unpaid.filter(b=>daysUntil(b.dueDate)>=0&&daysUntil(b.dueDate)<=3).length;return Math.max(20,100-overdue*35-soon*12)}
function calculateHealth(){let cur=summarizeTxns(txnsInRange(monthRange(0).start,monthRange(0).end));let savingsScore=cur.income>0?Math.max(0,Math.min(100,50+cur.savingsRate)):70;let util=averageCardUtilization();let utilScore=Math.max(0,100-util*2);let budgetScore=budgetComplianceScore();let billScore=unpaidBillScore();let score=Math.round(savingsScore*.35+utilScore*.25+budgetScore*.25+billScore*.15);let label=score>=90?'Excellent':score>=75?'Good':score>=60?'Needs attention':'At risk';return {score,label,cur,util,budgetScore,billScore}}
function setHealthRing(id,score){let el=document.getElementById(id);if(!el)return;let deg=Math.max(0,Math.min(100,score))*3.6;el.style.background=`conic-gradient(var(--accent) ${deg}deg,#eef1f7 ${deg}deg)`}

function renderInsights(){let el=document.getElementById('insightReport');if(!el)return;let spend=monthlyCategorySpend(),items=[];(data.budgets||[]).forEach(b=>{let used=Number(spend[b.category]||0),limit=Number(b.amount||0),pct=limit?used/limit:0;if(pct>=1)items.push({kind:'danger',text:`${b.category} is over budget by ${peso(used-limit)}.`});else if(pct>=.8)items.push({kind:'warn',text:`${b.category} is at ${Math.round(pct*100)}% of its monthly budget.`});else if(used>0)items.push({kind:'good',text:`${b.category} still has ${peso(limit-used)} left this month.`})});let cards=data.accounts.filter(a=>a.type==='Credit Card'&&Number(a.limit||0)>0);cards.forEach(c=>{let pct=Number(c.outstanding||0)/Number(c.limit||1);if(pct>=.5)items.push({kind:'warn',text:`${c.name} utilization is ${Math.round(pct*100)}%.`});else if(Number(c.outstanding||0)>0)items.push({kind:'good',text:`${c.name} utilization is low at ${Math.round(pct*100)}%.`})});let dueSoon=(data.bills||[]).filter(b=>b.status!=='Paid').map(b=>({...b,days:daysUntil(b.dueDate)})).filter(b=>b.days>=0&&b.days<=7).sort((a,b)=>a.days-b.days);dueSoon.forEach(b=>items.unshift({kind:b.days<=2?'danger':'warn',text:`${b.cardName} is due in ${b.days} day${b.days===1?'':'s'} for ${peso(b.remaining)}.`}));if(!items.length)items.push({kind:'good',text:'No urgent budget or bill alerts right now.'});el.innerHTML=items.slice(0,5).map(i=>`<div class="insightItem ${i.kind}">${i.text}</div>`).join('')}

function ordinal(n){n=Number(n||0);if([11,12,13].includes(n%100))return 'th';return {1:'st',2:'nd',3:'rd'}[n%10]||'th'}
function toggleRecurring(id){let r=data.recurring.find(x=>x.id===id);if(!r)return;r.enabled=!(r.enabled!==false);persist()}
function exportBackup(){let payload={app:'PesoTrack',version:'4.08',exportedAt:new Date().toISOString(),data};let blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pesotrack-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href)}function importBackup(){restoreFile.click()}function handleRestore(input){let file=input.files&&input.files[0];if(!file)return;let reader=new FileReader();reader.onload=()=>{try{let payload=JSON.parse(reader.result);let incoming=payload.data||payload;if(!incoming||!Array.isArray(incoming.accounts)||!Array.isArray(incoming.txns)||!Array.isArray(incoming.bills))throw new Error('Invalid backup');if(!confirm('Restore this backup? Current local data will be replaced.'))return;data=normalizeData(incoming);persist();alert('Backup restored.')}catch(e){alert('Could not restore backup: '+e.message)}finally{input.value=''}};reader.readAsText(file)}
function applySettings(){if(data.settings){data.settings.dark=true;data.settings.privacy=false;data.settings.pinEnabled=false;data.settings.pinHash=''}document.body.classList.remove('privacy');document.body.classList.add('dark')}
function toastMsg(msg){if(!window.toast)return;toast.textContent=msg;toast.classList.add('show');clearTimeout(window._toastTimer);window._toastTimer=setTimeout(()=>toast.classList.remove('show'),1800)}

function csvEscape(v){v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function downloadText(name,text,type='text/plain'){let blob=new Blob([text],{type});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function exportTransactionsCSV(){let rows=[['Date','Type','Account From','Account To','Category','Amount','Fee']];data.txns.forEach(t=>rows.push([new Date(t.date).toLocaleString('en-PH'),t.type,accountLabel(t.from),accountLabel(t.to),t.category||'',Number(t.amount||0),Number(t.fee||0)]));downloadText('pesotrack-transactions.csv',rows.map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv')}
function exportReportCSV(){let {start,end}=periodStartEnd();let rows=[['Report Period',reportPeriod],['From',start.toISOString().slice(0,10)],['To',end.toISOString().slice(0,10)],[],['Date','Type','Account From','Account To','Category','Amount','Fee']];data.txns.filter(t=>txInPeriod(t,start,end)).forEach(t=>rows.push([new Date(t.date).toLocaleDateString('en-PH'),t.type,accountLabel(t.from),accountLabel(t.to),t.category||'',Number(t.amount||0),Number(t.fee||0)]));downloadText('pesotrack-report-'+reportPeriod.toLowerCase()+'.csv',rows.map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv')}
function saveSettings(){data.settings.weekStart=weekStart.value;data.settings.currency=currencySetting.value;persist();toastMsg('Settings saved')}
function addCategoryFromSettings(){let input=document.getElementById('settingsCategoryInput');let c=input?input.value:prompt('Category name');if(!c)return;c=String(c).trim();if(!c)return;if(!data.categories.some(x=>x.toLowerCase()===c.toLowerCase()))data.categories.push(c);data.categoryIcons=data.categoryIcons||{};data.categoryIcons[c]=settingsCategoryIcon||suggestCategoryIcon(c);if(input)input.value='';persist();toastMsg('Category added')}
function deleteCategory(c){if(defaultCategories().includes(c)){alert('Default categories cannot be deleted.');return}if(confirm('Delete category '+c+'? Existing transactions will keep their category text.')){data.categories=data.categories.filter(x=>x!==c);if(data.categoryIcons)delete data.categoryIcons[c];persist();toastMsg('Category removed')}}

function categoryIconChoices(){return ['car','fuel','park','broom','helper','laundry','wrench','baby','shirt','scissors','beauty','food','cart','cup','bag','receipt','bolt','home','wifi','phone','heart','pill','shield','plane','play','repeat','book','users','paw','gift','wallet','briefcase','bank','return','trend','card','swap','tag']}function suggestCategoryIcon(c){let key=String(c||'').toLowerCase();if(/helper|housemaid|maid|cleaner|cleaning/.test(key))return 'helper';if(/laundry|wash|clothes/.test(key))return 'laundry';if(/repair|maintenance|tool|fix/.test(key))return 'wrench';if(/baby|child|kid|daycare/.test(key))return 'baby';if(/beauty|salon|hair|personal care/.test(key))return 'beauty';if(/car|auto|vehicle/.test(key))return 'car';if(/gas|fuel/.test(key))return 'fuel';if(/grocery|market/.test(key))return 'cart';if(/coffee|cafe/.test(key))return 'cup';if(/shop|mall/.test(key))return 'bag';if(/bill|receipt/.test(key))return 'receipt';if(/rent|home|house/.test(key))return 'home';if(/health|doctor|medicine/.test(key))return 'heart';if(/travel|flight|trip/.test(key))return 'plane';if(/school|book|education/.test(key))return 'book';if(/salary|income|pay/.test(key))return 'wallet';return 'tag'}function selectCategoryIcon(icon){settingsCategoryIcon=icon;renderCategoryManager()}function categoryIconPreview(icon){return catIcon('__icon:'+icon)}function renderCategoryManager(){let cats=document.getElementById('settingsCategories');if(!cats)return;let input=document.getElementById('settingsCategoryInput');let draft=input?input.value:'';let items=(data.categories||[]).slice().sort((a,b)=>a.localeCompare(b));cats.innerHTML=`<div class="categoryManager"><div class="categoryAddRow compactCategoryAdd"><input class="field" id="settingsCategoryInput" placeholder="Category name, e.g. Car" value="${htmlText(draft)}" oninput="settingsCategoryIcon=suggestCategoryIcon(this.value)" onkeydown="if(event.key==='Enter')addCategoryFromSettings()"><button class="backupBtn primary" type="button" onclick="addCategoryFromSettings()">Add</button></div><div class="categoryIconPicker">${categoryIconChoices().map(icon=>`<button type="button" class="categoryIconChoice ${settingsCategoryIcon===icon?'active':''}" onclick="selectCategoryIcon('${icon}')" aria-label="Use ${icon} icon"><span>${categoryIconPreview(icon)}</span></button>`).join('')}</div><div class="categoryHint">Choose an icon, type a label, then add it. The icon appears in transactions, reports, and budgets.</div><div class="categoryChipGrid">${items.map(c=>`<span class="categoryPill improvedCategory"><span class="categoryIcon">${catIcon(c)}</span><span>${htmlText(c)}</span>${defaultCategories().includes(c)?'':`<button type="button" aria-label="Delete ${htmlText(c)}" onclick="deleteCategory('${jsString(c)}')">x</button>`}</span>`).join('')||'<div class="empty">No categories yet.</div>'}</div></div>`}function resetAllData(){if(!confirm('Reset all PesoTrack data on this device?'))return;if(!confirm('This cannot be undone unless you exported a backup. Continue?'))return;data={accounts:[],txns:[],bills:[],recurring:[],budgets:[],categories:['Food','Groceries','Transport','Shopping','Bills','Utilities','Health','Salary','Investment','Debt Payment','Transfer Fees','Subscription','MP2','Other'],categoryIcons:{},settings:{accent:'#6c63ff',privacy:false,weekStart:'1',currency:'PHP',dark:true,pinEnabled:false,pinHash:''}};localStorage.setItem(KEY,JSON.stringify(data));applySettings();render();toastMsg('All data reset')}

/* Premium Edition Phase 2: Motion & Interaction */
(function(){
  const motionValueIds=['safeSpendHero','netWorth','cashTotal','cardTotal','billsDue','todayIncome','todayExpense','todayTransfer','todayNet','healthScoreDash'];
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
    document.querySelectorAll('.premiumDashboard .timelineItem,.premiumDashboard .row,.premiumDashboard .premiumActions button').forEach((el,i)=>{
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


applySettings();
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
render();

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}


/* Professional hardening pass: keep restored/user-entered data as text. */
function cls(a){if(a&&typeof a==='object')return safeClass(a.logoKey||banks[a.institution]||'otherbank');return safeClass(banks[a]||'otherbank')}
function logo(a){let key=cls(a),label=(a?.institution||a?.name||'?');return `<div class="bank ${key}">${bankLogoMarkup(key,label)}</div>`}
function accountLabel(id){let a=data.accounts.find(x=>x.id===id);return a?`${a.name||'Account'} (${a.institution||a.type||'Account'})`:'Unknown account'}
function safeAccountLabel(id){return htmlText(accountLabel(id),'Unknown account')}
function safeDateText(v){return htmlText(v||'')}

function renderReportList(target,obj,kind){let el=document.getElementById(target);if(!el)return;let entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]);el.innerHTML=entries.length?entries.map(([k,v])=>`<div class="reportLine"><div><b>${kind==='cat'?catIcon(k)+' ':''}${htmlText(k)}</b><div class="sub">${kind==='acct'?'Selected period activity':'Total for '+reportPeriod.toLowerCase()}</div></div><b>${peso(v)}</b></div>`).join(''):`<div class="reportEmpty">No ${kind==='income'?'income':kind==='cat'?'expenses':'activity'} for this period.</div>`}

function renderSettings(){if(document.getElementById('weekStart'))weekStart.value=String(data.settings.weekStart??'1');if(document.getElementById('currencySetting'))currencySetting.value=data.settings.currency||'PHP';renderCategoryManager()}

/* Reports transaction list follows the selected period. */
function renderTransactionsList(){
  let el=document.getElementById('transactionReport');
  if(!el)return;
  let q=(document.getElementById('txnSearch')?.value||'').trim();
  let {start,end}=periodStartEnd();
  let arr=data.txns
    .filter(t=>txInPeriod(t,start,end))
    .slice()
    .reverse()
    .filter(t=>txnMatches(t,q))
    .slice(0,80);
  let periodLabel=reportPeriod==='Today'?'today':`this ${reportPeriod.toLowerCase()}`;
  el.innerHTML=arr.length?arr.map(t=>txnRow(t)).join(''):`<div class="reportEmpty">No transactions ${q?`match "${htmlText(q)}" `:''}for ${periodLabel}.</div>`;
}

/* Reports period navigation: previous/next day, week, month, year. */
let reportOffset=0;
function periodStartEnd(){
  let now=new Date(),start,end;
  if(reportPeriod==='Today'){
    start=new Date(now.getFullYear(),now.getMonth(),now.getDate()+reportOffset);
    end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+1);
  }else if(reportPeriod==='Week'){
    let mondayOffset=(now.getDay()+6)%7;
    start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-mondayOffset+(reportOffset*7));
    end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+7);
  }else if(reportPeriod==='Year'){
    start=new Date(now.getFullYear()+reportOffset,0,1);
    end=new Date(start.getFullYear()+1,0,1);
  }else{
    start=new Date(now.getFullYear(),now.getMonth()+reportOffset,1);
    end=new Date(start.getFullYear(),start.getMonth()+1,1);
  }
  return {start,end};
}
function reportPeriodTitle(){
  const {start,end}=periodStartEnd();
  if(reportPeriod==='Today')return start.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
  if(reportPeriod==='Week'){
    const last=new Date(end);last.setDate(last.getDate()-1);
    return `${start.toLocaleDateString('en-PH',{month:'short',day:'numeric'})} - ${last.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}`;
  }
  if(reportPeriod==='Year')return String(start.getFullYear());
  return start.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
}
function ensureReportPeriodNav(){
  const reports=document.getElementById('reports'),tabs=document.querySelector('#reports .reportTabs');
  if(!reports||!tabs||document.getElementById('reportPeriodNav'))return;
  const nav=document.createElement('div');
  nav.id='reportPeriodNav';
  nav.className='reportPeriodNav';
  nav.innerHTML=`<button type="button" onclick="shiftReportPeriod(-1)" aria-label="Previous period">&lt;</button><b id="reportPeriodLabel"></b><button type="button" onclick="shiftReportPeriod(1)" aria-label="Next period">&gt;</button>`;
  tabs.parentNode.insertBefore(nav,tabs);
}
function updateReportPeriodLabel(){
  const label=document.getElementById('reportPeriodLabel');
  if(label)label.textContent=reportPeriodTitle();
}
function shiftReportPeriod(delta){reportOffset+=delta;renderReports();}
function setReportPeriod(p,el){
  reportPeriod=p;
  reportOffset=0;
  document.querySelectorAll('.reportTabs button').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  renderReports();
}


/* Reports hierarchy: keep transactions as the final report section. */
function moveTransactionsToReportEnd(){
  const report=document.getElementById('transactionReport');
  if(!report)return;
  const txnPanel=report.closest('.reportPanel');
  const reports=document.getElementById('reports');
  if(txnPanel&&reports&&txnPanel.parentNode===reports&&reports.lastElementChild!==txnPanel){
    reports.appendChild(txnPanel);
  }
}

/* Reports clarity pass: period controls drive every report view. */
(function(){
  function selectedReportTxns(){
    const {start,end}=periodStartEnd();
    return (data.txns||[]).filter(t=>txInPeriod(t,start,end));
  }
  function syncReportPeriodButtons(){
    document.querySelectorAll('#reports .reportTabs button').forEach(btn=>{
      const text=btn.textContent.trim();
      const period=text==='Day'?'Today':text;
      btn.classList.toggle('active',period===reportPeriod);
    });
  }
  function reorderReportControls(){
    const reports=document.getElementById('reports');
    const periodTabs=document.querySelector('#reports .reportTabs');
    const nav=document.getElementById('reportPeriodNav');
    if(!reports||!periodTabs)return;
    const anchor=reports.querySelector('.accountFilter')||reports.querySelector('.reportPanel');
    reports.insertBefore(periodTabs,anchor||reports.firstElementChild);
    if(nav)reports.insertBefore(nav,periodTabs.nextSibling);
  }
  function monthLabelForSelectedPeriod(){
    const {start}=periodStartEnd();
    return start.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
  }
  function renderBudgetReportForSelectedMonth(){
    const el=document.getElementById('budgetReport');
    if(!el)return;
    const panel=el.closest('.reportPanel');
    if(panel){
      panel.classList.add('budgetCollapsed');
      const h=panel.querySelector('h3');
      if(h)h.textContent='Monthly Budgets';
      let head=panel.querySelector('.panelHead');
      if(head&&!head.querySelector('.budgetToggleBtn')){
        const toggle=document.createElement('button');
        toggle.type='button';
        toggle.className='tiny budgetToggleBtn';
        toggle.textContent='Show';
        toggle.onclick=function(){
          panel.classList.toggle('budgetOpen');
          toggle.textContent=panel.classList.contains('budgetOpen')?'Hide':'Show';
        };
        head.insertBefore(toggle,head.querySelector('button'));
      }
    }
    const {start}=periodStartEnd();
    const mStart=new Date(start.getFullYear(),start.getMonth(),1);
    const mEnd=new Date(start.getFullYear(),start.getMonth()+1,1);
    const spend={};
    (data.txns||[]).filter(t=>txInPeriod(t,mStart,mEnd)).forEach(t=>{
      if(t.type==='Expense')groupAdd(spend,t.category||'Other',Number(t.amount||0));
      if(t.type==='Transfer'&&Number(t.fee||0))groupAdd(spend,'Transfer Fees',Number(t.fee||0));
    });
    const arr=data.budgets||[];
    const monthName=monthLabelForSelectedPeriod();
    el.innerHTML=arr.length?arr.map(b=>{
      const used=Number(spend[b.category]||0),limit=Number(b.amount||0),pct=limit?Math.round((used/limit)*100):0,barClass=pct>=100?'danger':pct>=80?'warn':'';
      return `<div class="budgetCard"><div class="budgetTop"><div><b>${catIcon(b.category)} ${htmlText(b.category)}</b><div class="sub">${htmlText(monthName)} monthly limit ${peso(limit)}</div></div><span class="budgetPct">${pct}%</span></div><div class="budgetBar ${barClass}"><i style="width:${Math.min(100,pct)}%"></i></div><div class="budgetMeta"><span>Used ${peso(used)}</span><span>Left ${peso(Math.max(0,limit-used))}</span></div><div class="budgetActions"><button class="tiny" onclick="openBudget('${jsString(b.id)}')">Edit</button><button class="tiny danger" onclick="deleteBudget('${jsString(b.id)}')">Delete</button></div></div>`;
    }).join(''):`<div class="reportEmpty">No budgets yet. Budgets are monthly, so they follow the month that contains the selected period.</div>`;
  }
  function updateReportsScope(){
    syncReportPeriodButtons();
    reorderReportControls();
    try{moveTransactionsToReportEnd();}catch(e){}
    const cashPanel=[...document.querySelectorAll('#reports .reportPanel')].find(p=>p.querySelector('h3')?.textContent.trim()==='Cash Flow');
    if(cashPanel){
      const h=cashPanel.querySelector('h3');
      if(h)h.textContent='Income vs Expense';
    }
    renderBudgetReportForSelectedMonth();
  }
  window.updateReportsScope=updateReportsScope;
  window.addEventListener('load',()=>setTimeout(()=>{try{updateReportsScope();}catch(e){}},360));
})();

/* Bills support: shared setup styling and card-account shortcut. */
(function(){
  window.openAddCreditCard=function(){
    openAddAccount();
    setTimeout(()=>{try{if(document.getElementById('atype')){atype.value='Credit Card';renderAccountFields();}}catch(e){}},0);
  };
})();

(function(){try{var p=new URLSearchParams(location.search);var action=p.get("action");if(!action)return;window.addEventListener("load",function(){setTimeout(function(){try{if(action==="add"&&typeof openTxn==="function")openTxn();else if(action==="accounts"&&typeof go==="function")go("accounts",document.querySelectorAll(".nav button")[1]);else if(action==="reports"&&typeof go==="function")go("reports",document.querySelectorAll(".nav button")[4]);}catch(e){}},280)});}catch(e){}})();

(function expenseBreakdownAtAGlance(){
  function esc(v){return typeof htmlText==='function'?htmlText(v):String(v==null?'':v).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]})}
  function expenseDataForRange(range,acct){
    var cats={},count=0,total=0;
    (data.txns||[]).forEach(function(t){
      if(typeof txInPeriod==='function'&&!txInPeriod(t,range.start,range.end))return;
      if(!(acct==='All'||t.from===acct||t.to===acct))return;
      if(t.type==='Expense'&&(acct==='All'||t.from===acct)){
        var amount=Number(t.amount||0); if(!amount)return;
        cats[t.category||'Other']=(cats[t.category||'Other']||0)+amount; total+=amount; count++;
      }
      if(t.type==='Transfer'&&Number(t.fee||0)&&(acct==='All'||t.from===acct)){
        var fee=Number(t.fee||0);
        cats['Transfer Fees']=(cats['Transfer Fees']||0)+fee; total+=fee; count++;
      }
    });
    var entries=Object.entries(cats).sort(function(a,b){return b[1]-a[1]});
    return {entries:entries,total:total,count:count,range:range};
  }
  function previousExpenseRange(range){
    var start=new Date(range.start),end=new Date(range.end);
    if(reportPeriod==='Year')return {start:new Date(start.getFullYear()-1,0,1),end:new Date(start.getFullYear(),0,1)};
    if(reportPeriod==='Month')return {start:new Date(start.getFullYear(),start.getMonth()-1,1),end:new Date(start.getFullYear(),start.getMonth(),1)};
    var days=Math.round((end-start)/86400000)||1;
    return {start:new Date(start.getTime()-days*86400000),end:new Date(end.getTime()-days*86400000)};
  }
  function compareLabel(current,previous){
    current=Number(current||0);previous=Number(previous||0);
    var diff=current-previous;
    if(!previous&&current)return {text:'New',tone:'up',icon:'+'};
    if(previous&&!current)return {text:peso(previous),tone:'down',icon:'↓'};
    if(Math.abs(diff)<0.01)return {text:'Same',tone:'same',icon:'='};
    return {text:peso(Math.abs(diff)),tone:diff>0?'up':'down',icon:diff>0?'↑':'↓'};
  }
  function selectedExpenseData(){
    var range=typeof periodStartEnd==='function'?periodStartEnd():(function(){var now=new Date();return {start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth()+1,1)}})();
    var current=expenseDataForRange(range,'All');
    var previous=expenseDataForRange(previousExpenseRange(range),'All');
    current.previousCats=Object.fromEntries(previous.entries);
    return current;
  }
  function expenseRowHtml(item,total,max,label){
    var cat=item.name,val=item.value,pct=Math.round((val/Math.max(1,total))*100),width=Math.max(5,Math.round((val/max)*100));
    var icon=typeof catIcon==='function'?catIcon(cat):'';
    var comparison=compareLabel(val,item.previous);
    var open=item.grouped?' role="button" tabindex="0" onclick="openExpenseOtherBreakdown()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openExpenseOtherBreakdown()}"':'';
    return '<div class="expenseBarRow '+(item.grouped?'otherBreakdownTrigger':'')+'"'+open+'><div class="expenseBarTop"><b>'+icon+' '+esc(cat)+'</b><strong>'+peso(val)+'</strong></div><div class="expenseTrack"><i style="width:'+width+'%"></i></div><div class="expenseBarMeta"><span>'+pct+'% of expenses</span><span class="expenseCompare '+comparison.tone+'"><i>'+esc(comparison.icon)+'</i>'+esc(comparison.text)+'</span><span>'+esc(label)+'</span></div>'+(item.grouped?'<div class="expenseDrillHint">Tap to see what makes up Other</div>':'')+'</div>';
  }
  window.openExpenseOtherBreakdown=function(){
    var detail=window.__expenseOtherBreakdown;
    if(!detail||!detail.entries||!detail.entries.length)return;
    var sheet=document.getElementById('expenseOtherSheet');
    if(!sheet){
      sheet=document.createElement('section');
      sheet.id='expenseOtherSheet';
      sheet.className='sheet';
      document.body.appendChild(sheet);
    }
    var max=Math.max(1,detail.entries[0].value);
    var rows=detail.entries.map(function(item){return expenseRowHtml(item,detail.total,max,detail.label)}).join('');
    sheet.innerHTML='<div class="top"><div><div class="title">Other</div><div class="sub">Smaller categories in '+esc(detail.label)+'</div></div><button class="ghost" onclick="closeTopModal()">Close</button></div><div class="expenseBreakdownSummary otherSummary"><div class="expenseStat"><span>Total</span><b>'+peso(detail.otherTotal)+'</b></div><div class="expenseStat"><span>Items</span><b>'+detail.entries.length+'</b></div><div class="expenseStat"><span>Share</span><b>'+Math.round((detail.otherTotal/Math.max(1,detail.total))*100)+'%</b></div></div><div class="expenseBreakdownRows">'+rows+'</div>';
    showModal();
    sheet.classList.add('show');
  };
  window.renderExpenseBreakdown=function(){
    var el=document.getElementById('categoryReport');
    if(!el)return;
    var d=selectedExpenseData();
    var label=typeof reportPeriodTitle==='function'?reportPeriodTitle():(reportPeriod||'This period');
    if(!d.entries.length){
      el.innerHTML='<div class="expenseEmpty"><b>No expenses for '+esc(label)+'.</b><br>Add expense transactions and this section will show where the money went.</div>';
      return;
    }
    var max=Math.max(1,d.entries[0][1]);
    var top=d.entries[0];
    var visibleEntries=d.entries.slice(0,5).map(function(pair){return {name:pair[0],value:pair[1],previous:(d.previousCats||{})[pair[0]]||0}});
    var hiddenEntries=d.entries.slice(5);
    var rest=hiddenEntries.reduce(function(sum,pair){return sum+pair[1]},0);
    var restPrevious=hiddenEntries.reduce(function(sum,pair){return sum+Number((d.previousCats||{})[pair[0]]||0)},0);
    window.__expenseOtherBreakdown={label:label,total:d.total,otherTotal:rest,entries:hiddenEntries.map(function(pair){return {name:pair[0],value:pair[1],previous:(d.previousCats||{})[pair[0]]||0}})};
    if(rest)visibleEntries.push({name:'Other',value:rest,previous:restPrevious,grouped:true});
    var rows=visibleEntries.map(function(item){return expenseRowHtml(item,d.total,max,label)}).join('');
    el.innerHTML='<div class="expenseBreakdownSummary"><div class="expenseStat"><span>Total spent</span><b>'+peso(d.total)+'</b></div><div class="expenseStat"><span>Categories</span><b>'+d.entries.length+'</b></div><div class="expenseStat"><span>Biggest</span><b>'+esc(top[0])+'</b></div></div><div class="expenseBreakdownRows">'+rows+'</div>';
  };
  window.addEventListener('load',function(){setTimeout(function(){try{renderExpenseBreakdown()}catch(e){}},420)});
})();
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

(function finishBootWithoutOldHomeFlash(){
  try{if(typeof render==='function')render();}catch(e){console.warn('Final boot render skipped',e)}
  var release=function(){try{document.body.classList.remove('booting')}catch(e){}};
  if(window.requestAnimationFrame)requestAnimationFrame(release);else setTimeout(release,0);
  setTimeout(release,600);
})();
