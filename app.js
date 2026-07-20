let data=safeLoadData(),screen='dashboard',acctFilter='All',txnType='Expense',amount='0',txn={from:null,to:null,category:'Food',fee:0},editingAccount=null,settling=null,pickerMode=null,pickerField=null,reportPeriod='Month',editingTxn=null,editingRecurring=null,editingBudget=null,recurringDraftCategory='',settingsCategoryIcon='car';function uid(){try{if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID()}catch(e){}return 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}function normalizeData(d){if(!d||typeof d!=='object')d={};if(!Array.isArray(d.recurring))d.recurring=[];if(!Array.isArray(d.accounts))d.accounts=[];if(!Array.isArray(d.txns))d.txns=[];if(!Array.isArray(d.bills))d.bills=[];if(!Array.isArray(d.budgets))d.budgets=[];if(!Array.isArray(d.categories))d.categories=defaultCategories();if(!d.categoryIcons||typeof d.categoryIcons!=='object')d.categoryIcons={};d.categories=[...new Set(defaultCategories().concat(d.categories).map(c=>String(c||'').trim()).filter(Boolean))];if(!d.settings||typeof d.settings!=='object')d.settings={accent:'#6c63ff',privacy:false,weekStart:'1',currency:'PHP',dark:true,pinEnabled:false,pinHash:'',theme:'ocean'};if(!d.settings.accent)d.settings.accent='#6c63ff';if(!d.settings.weekStart)d.settings.weekStart='1';if(!d.settings.currency)d.settings.currency='PHP';if(!d.settings.theme)d.settings.theme='ocean';d.settings.dark=true;d.settings.privacy=!!d.settings.privacy;d.settings.pinEnabled=!!d.settings.pinEnabled;d.settings.pinHash=d.settings.pinHash||'';return d}data=normalizeData(data);function repairLoadedData(){['accounts','txns','bills','recurring','budgets'].forEach(k=>{data[k]=(Array.isArray(data[k])?data[k]:[]).filter(x=>x&&typeof x==='object')});data.accounts.forEach(a=>{if(!a.id)a.id=uid();if(!a.type)a.type='Savings';if(!a.name)a.name=a.institution||a.type||'Account'});data.txns.forEach(t=>{if(!t.id)t.id=uid();if(!t.type)t.type='Expense';if(!t.date)t.date=new Date().toISOString()});data.bills.forEach(b=>{if(!b.id)b.id=uid();b.amount=Number(b.amount||b.remaining||0);b.remaining=Number(b.remaining??b.amount??0)});data.recurring.forEach(r=>{if(!r.id)r.id=uid();if(!r.type)r.type='Expense';if(!r.name)r.name=r.category||r.type});}repairLoadedData();function accountTxnEffect(id,txns=data.txns){let a=(data.accounts||[]).find(x=>x.id===id),out={balance:0,outstanding:0};if(!a)return out;(txns||[]).filter(t=>t&&typeof t==='object').forEach(t=>{let amt=Number(t.amount||0),fee=Number(t.fee||0);if(!amt)return;if(t.type==='Income'){if(t.from===id)out.balance+=amt}else if(t.type==='Expense'){if(t.from===id){if(a.type==='Credit Card')out.outstanding+=amt;else out.balance-=amt}}else if(t.type==='Transfer'){if(t.from===id){if(a.type==='Credit Card')out.outstanding-=amt;else out.balance-=amt+fee}if(t.to===id){if(a.type==='Credit Card')out.outstanding-=amt;else out.balance+=amt}}else if(t.type==='Card Payment'){if(t.from===id)out.balance-=amt;if(t.to===id)out.outstanding-=amt}});return out}
function ensureLedgerBaselines(){(data.accounts||[]).forEach(a=>{let fx=accountTxnEffect(a.id);if(a.type==='Credit Card'){if(!Number.isFinite(Number(a.ledgerBaseOutstanding)))a.ledgerBaseOutstanding=Number(a.outstanding||0)-fx.outstanding;if(!Number.isFinite(Number(a.ledgerBaseBalance)))a.ledgerBaseBalance=0}else{if(!Number.isFinite(Number(a.ledgerBaseBalance)))a.ledgerBaseBalance=Number(a.balance||0)-fx.balance;if(!Number.isFinite(Number(a.ledgerBaseOutstanding)))a.ledgerBaseOutstanding=0}})}
function recalculateBalancesFromLedger(){ensureLedgerBaselines();(data.accounts||[]).forEach(a=>{let fx=accountTxnEffect(a.id);if(a.type==='Credit Card'){a.balance=0;a.outstanding=Math.max(0,roundMoney(Number(a.ledgerBaseOutstanding||0)+fx.outstanding))}else{a.balance=roundMoney(Number(a.ledgerBaseBalance||0)+fx.balance);a.outstanding=0}})}
function roundMoney(n){return Math.round((Number(n)||0)*100)/100}
ensureLedgerBaselines();recalculateBalancesFromLedger();function peso(n){if(data.settings&&data.settings.privacy)return '\u2022\u2022\u2022\u2022';return '\u20b1'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2})}function persist(){try{ensureLedgerBaselines();recalculateBalancesFromLedger();localStorage.setItem(KEY,JSON.stringify(data))}catch(e){console.warn('PesoTrack could not persist to localStorage. Changes will remain for this session only.',e);if(typeof showToast==='function')showToast('Saved for this session. Use installed PWA for permanent storage.')}render()}function go(id,btn){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));if(btn&&!btn.classList.contains('fab'))btn.classList.add('active');screen=id;render()}function render(){
  const steps=[
    ['Accounts','renderAccounts'],['Dashboard','renderDash'],['Bills','renderBills'],['Recurring','renderRecurring'],
    ['Reports','renderReports'],['Transactions','renderTransactionsList'],
    ['GlobalSearch','renderGlobalSearch'],['Insights','renderInsights'],['Settings','renderSettings']
  ];
  for(const [name,fnName] of steps){
    const fn=window[fnName];
    try{ if(typeof fn==='function') fn(); }
    catch(err){ console.error('Render step failed:',name,err); }
  }
}function txInPeriod(t,start,end){let d=new Date(t.date||Date.now());return d>=start&&d<end}
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
function txnInputDateValue(v){let d=v?new Date(v):new Date();if(isNaN(d.getTime()))d=new Date();let offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,10)}function txnIsoFromInput(v,fallback){let day=v||txnInputDateValue(fallback);let d=new Date(day+'T12:00:00');if(isNaN(d.getTime()))d=new Date();return d.toISOString()}function accountById(id){return data.accounts.find(a=>a.id===id)}






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










function averageCardUtilization(){let cards=data.accounts.filter(a=>a.type==='Credit Card'&&Number(a.limit||0)>0);if(!cards.length)return 0;return Math.round(cards.reduce((s,a)=>s+(Number(a.outstanding||0)/Number(a.limit||1))*100,0)/cards.length)}
function budgetComplianceScore(){if(!data.budgets||!data.budgets.length)return 85;let spend=monthlyCategorySpend(),scores=data.budgets.map(b=>{let used=Number(spend[b.category]||0),limit=Number(b.amount||0)||1,pct=used/limit;if(pct<=.8)return 100;if(pct<=1)return 75;return Math.max(20,100-Math.round((pct-1)*120))});return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)}
function unpaidBillScore(){let unpaid=(data.bills||[]).filter(b=>b.status!=='Paid');if(!unpaid.length)return 100;let overdue=unpaid.filter(b=>daysUntil(b.dueDate)<0).length,soon=unpaid.filter(b=>daysUntil(b.dueDate)>=0&&daysUntil(b.dueDate)<=3).length;return Math.max(20,100-overdue*35-soon*12)}
function calculateHealth(){let cur=summarizeTxns(txnsInRange(monthRange(0).start,monthRange(0).end));let savingsScore=cur.income>0?Math.max(0,Math.min(100,50+cur.savingsRate)):70;let util=averageCardUtilization();let utilScore=Math.max(0,100-util*2);let budgetScore=budgetComplianceScore();let billScore=unpaidBillScore();let score=Math.round(savingsScore*.35+utilScore*.25+budgetScore*.25+billScore*.15);let label=score>=90?'Excellent':score>=75?'Good':score>=60?'Needs attention':'At risk';return {score,label,cur,util,budgetScore,billScore}}
function setHealthRing(id,score){let el=document.getElementById(id);if(!el)return;let deg=Math.max(0,Math.min(100,score))*3.6;el.style.background=`conic-gradient(var(--accent) ${deg}deg,#eef1f7 ${deg}deg)`}



function ordinal(n){n=Number(n||0);if([11,12,13].includes(n%100))return 'th';return {1:'st',2:'nd',3:'rd'}[n%10]||'th'}

applySettings();
render();

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}


/* Professional hardening pass: keep restored/user-entered data as text. */
function cls(a){if(a&&typeof a==='object')return safeClass(a.logoKey||banks[a.institution]||'otherbank');return safeClass(banks[a]||'otherbank')}
function logo(a){let key=cls(a),label=(a?.institution||a?.name||'?');return `<div class="bank ${key}">${bankLogoMarkup(key,label)}</div>`}
function accountLabel(id){let a=data.accounts.find(x=>x.id===id);return a?`${a.name||'Account'} (${a.institution||a.type||'Account'})`:'Unknown account'}
function safeAccountLabel(id){return htmlText(accountLabel(id),'Unknown account')}
function safeDateText(v){return htmlText(v||'')}
function jsString(v){return String(v==null?'':v).split('\\').join('\\\\').split("'").join("\\'").split('\r').join(' ').split('\n').join(' ')}
