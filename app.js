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
function filterAccounts(f,el){acctFilter=f;document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));if(el)el.classList.add('active');renderAccounts()}















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

function showModal(){modalBackdrop.classList.add('show');document.body.classList.add('modal-open')}function hideModalIfNone(){setTimeout(()=>{if(!document.querySelector('.sheet.show')){modalBackdrop.classList.remove('show');document.body.classList.remove('modal-open')}},0)}function closeTopModal(){let sheets=[...document.querySelectorAll('.sheet.show')];if(!sheets.length)return;let top=sheets[sheets.length-1];top.classList.remove('show');hideModalIfNone()}function closeSheets(){document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('show'));modalBackdrop.classList.remove('show');document.body.classList.remove('modal-open')}function openAddAccount(){editingAccount=null;acctTitle.textContent='Add Account';atype.value='Savings';inst.value='';aname.value='';let lf=document.getElementById('instLogo');if(lf){lf.value='otherbank';lf.dataset.manual=''}renderAccountFields();renderLogoPicker('otherbank');showModal();accountSheet.classList.add('show')}function editAccount(id){let a=data.accounts.find(x=>x.id===id); if(!a)return; editingAccount=id; acctTitle.textContent='Edit Account';atype.value=a.type;inst.value=a.institution||'';aname.value=a.name;let key=a.logoKey||banks[a.institution]||'otherbank';let lf=document.getElementById('instLogo');if(lf){lf.value=key;lf.dataset.manual='1'}renderAccountFields(a);renderLogoPicker(key);showModal();accountSheet.classList.add('show')}function renderAccountFields(a={}){let t=atype.value;if(document.getElementById('inst')){inst.style.display=t==='Cash'?'none':''; if(t==='Cash') inst.value='';} if(t==='Cash' && document.getElementById('aname') && !aname.value) aname.value='Cash on Hand';dynamicFields.innerHTML=t==='Credit Card'?`<input class="field" id="limit" type="number" placeholder="Credit limit" value="${a.limit||''}"><input class="field" id="statementDay" type="number" placeholder="Statement day, e.g. 15" value="${a.statementDay||''}"><input class="field" id="dueDay" type="number" placeholder="Due day, e.g. 5" value="${a.dueDay||''}"><button class="ghost" onclick="deleteAccount()">Delete</button>`:`<input class="field" id="balance" type="number" placeholder="${t==='Investment'?'Current value':'Opening balance'}" value="${a.balance||''}"><button class="ghost" onclick="deleteAccount()">Delete</button>`}function saveAccount(){
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










function txnMatches(t,q){if(!q)return true;let hay=[t.type,t.category,t.note,accountLabel(t.from),accountLabel(t.to),String(t.amount),txnDate(t)].join(' ').toLowerCase();return hay.includes(q.toLowerCase())}



























function averageCardUtilization(){let cards=data.accounts.filter(a=>a.type==='Credit Card'&&Number(a.limit||0)>0);if(!cards.length)return 0;return Math.round(cards.reduce((s,a)=>s+(Number(a.outstanding||0)/Number(a.limit||1))*100,0)/cards.length)}
function budgetComplianceScore(){if(!data.budgets||!data.budgets.length)return 85;let spend=monthlyCategorySpend(),scores=data.budgets.map(b=>{let used=Number(spend[b.category]||0),limit=Number(b.amount||0)||1,pct=used/limit;if(pct<=.8)return 100;if(pct<=1)return 75;return Math.max(20,100-Math.round((pct-1)*120))});return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)}
function unpaidBillScore(){let unpaid=(data.bills||[]).filter(b=>b.status!=='Paid');if(!unpaid.length)return 100;let overdue=unpaid.filter(b=>daysUntil(b.dueDate)<0).length,soon=unpaid.filter(b=>daysUntil(b.dueDate)>=0&&daysUntil(b.dueDate)<=3).length;return Math.max(20,100-overdue*35-soon*12)}
function calculateHealth(){let cur=summarizeTxns(txnsInRange(monthRange(0).start,monthRange(0).end));let savingsScore=cur.income>0?Math.max(0,Math.min(100,50+cur.savingsRate)):70;let util=averageCardUtilization();let utilScore=Math.max(0,100-util*2);let budgetScore=budgetComplianceScore();let billScore=unpaidBillScore();let score=Math.round(savingsScore*.35+utilScore*.25+budgetScore*.25+billScore*.15);let label=score>=90?'Excellent':score>=75?'Good':score>=60?'Needs attention':'At risk';return {score,label,cur,util,budgetScore,billScore}}
function setHealthRing(id,score){let el=document.getElementById(id);if(!el)return;let deg=Math.max(0,Math.min(100,score))*3.6;el.style.background=`conic-gradient(var(--accent) ${deg}deg,#eef1f7 ${deg}deg)`}



function ordinal(n){n=Number(n||0);if([11,12,13].includes(n%100))return 'th';return {1:'st',2:'nd',3:'rd'}[n%10]||'th'}

function exportBackup(){let payload={app:'PesoTrack',version:'4.10',exportedAt:new Date().toISOString(),data};let blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pesotrack-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href)}function importBackup(){restoreFile.click()}function handleRestore(input){let file=input.files&&input.files[0];if(!file)return;let reader=new FileReader();reader.onload=()=>{try{let payload=JSON.parse(reader.result);let incoming=payload.data||payload;if(!incoming||!Array.isArray(incoming.accounts)||!Array.isArray(incoming.txns)||!Array.isArray(incoming.bills))throw new Error('Invalid backup');if(!confirm('Restore this backup? Current local data will be replaced.'))return;data=normalizeData(incoming);persist();alert('Backup restored.')}catch(e){alert('Could not restore backup: '+e.message)}finally{input.value=''}};reader.readAsText(file)}
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
function jsString(v){return String(v==null?'':v).split('\\').join('\\\\').split("'").join("\\'").split('\r').join(' ').split('\n').join(' ')}
function renderSettings(){if(document.getElementById('weekStart'))weekStart.value=String(data.settings.weekStart??'1');if(document.getElementById('currencySetting'))currencySetting.value=data.settings.currency||'PHP';renderCategoryManager()}

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
