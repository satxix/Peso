/* PesoTrack reports, budgets, insights, period controls, and expense breakdown views. Loaded before app.js. */
let reportView='hub';

function reportHubViewDefinitions(){
  return {
    cashflow:{title:'Cash Flow',sub:'Income, expenses, and net performance',panels:['cashFlowBars']},
    balance:{title:'Balance',sub:'Ending balances and liquid-account trend',panels:['balanceTrendReport']},
    spending:{title:'Spending',sub:'Categories and monthly budget performance',panels:['categoryReport','budgetReport']},
    commitments:{title:'Commitments',sub:'Recurring expenses, card dues, and alerts',panels:['commitmentReport','insightReport']},
    transactions:{title:'Transactions',sub:'Search and review activity for this period',panels:['transactionReport']}
  };
}

function reportHubIcon(kind){
  const icons={cashflow:'trend',balance:'bank',spending:'receipt',commitments:'repeat',transactions:'swap'};
  return `<span class="reportHubIcon">${catIcon('__icon:'+(icons[kind]||'tag'))}</span>`;
}

function ensureReportsHub(){
  const reports=document.getElementById('reports');
  if(!reports||document.getElementById('reportsHub'))return;
  const top=reports.querySelector('.top');
  const tabs=reports.querySelector('.reportTabs');
  const periodNav=document.getElementById('reportPeriodNav');
  const panels=[...reports.querySelectorAll(':scope > .reportPanel')];

  const detailHeader=document.createElement('div');
  detailHeader.id='reportDetailHeader';
  detailHeader.className='reportDetailHeader hide';
  detailHeader.innerHTML='<button type="button" class="reportBackBtn" onclick="backFromReportView()" aria-label="Back to Reports">&lt;</button><div><div class="title" id="reportDetailTitle">Report</div><div class="sub" id="reportDetailSub"></div></div>';

  const controls=document.createElement('div');
  controls.id='reportsHubControls';
  controls.className='reportsHubControls';

  const hub=document.createElement('div');
  hub.id='reportsHub';
  hub.innerHTML=`<div class="reportsHubSummary"><div><span>Income</span><b id="hubIncome">${peso(0)}</b></div><div><span>Expense</span><b id="hubExpense">${peso(0)}</b></div><div><span>Net</span><b id="hubNet">${peso(0)}</b></div></div><div class="reportsHubSectionLabel">Explore</div><div class="reportsHubList">${Object.entries(reportHubViewDefinitions()).map(([key,item])=>`<button type="button" onclick="openReportView('${key}')">${reportHubIcon(key)}<span class="reportHubCopy"><b>${item.title}</b><small>${item.sub}</small></span><span class="reportHubValue" id="hubValue-${key}"></span><span class="reportHubArrow">&gt;</span></button>`).join('')}</div><div class="reportsHubInsight" id="reportsHubInsight"></div>`;

  const detailBody=document.createElement('div');
  detailBody.id='reportDetailBody';
  detailBody.className='reportDetailBody hide';

  const store=document.createElement('div');
  store.id='reportPanelStore';
  store.className='reportPanelStore hide';

  const commitment=document.createElement('section');
  commitment.className='reportPanel commitmentReportPanel';
  commitment.innerHTML='<h3>Monthly Commitments</h3><div id="commitmentReport"></div>';
  panels.push(commitment);
  panels.forEach(panel=>store.appendChild(panel));

  if(top)top.insertAdjacentElement('afterend',detailHeader);
  else reports.prepend(detailHeader);
  detailHeader.insertAdjacentElement('afterend',controls);
  if(tabs)controls.appendChild(tabs);
  if(periodNav)controls.appendChild(periodNav);
  controls.insertAdjacentElement('afterend',hub);
  hub.insertAdjacentElement('afterend',detailBody);
  reports.appendChild(store);
}

function reportPanelForContent(id){
  const content=document.getElementById(id);
  return content?.closest('.reportPanel')||null;
}

function restoreReportPanels(){
  const store=document.getElementById('reportPanelStore');
  const body=document.getElementById('reportDetailBody');
  if(!store||!body)return;
  [...body.querySelectorAll(':scope > .reportPanel')].forEach(panel=>store.appendChild(panel));
}

function showReportView(view){
  const definitions=reportHubViewDefinitions();
  const item=definitions[view];
  const reports=document.getElementById('reports');
  if(!item||!reports)return;
  ensureReportsHub();
  restoreReportPanels();
  const body=document.getElementById('reportDetailBody');
  item.panels.forEach(id=>{
    const panel=reportPanelForContent(id);
    if(panel)body.appendChild(panel);
  });
  reportView=view;
  reports.classList.add('reports-detail-open');
  document.getElementById('reportsHub')?.classList.add('hide');
  document.getElementById('reportDetailHeader')?.classList.remove('hide');
  body?.classList.remove('hide');
  const title=document.getElementById('reportDetailTitle');
  const sub=document.getElementById('reportDetailSub');
  if(title)title.textContent=item.title;
  if(sub)sub.textContent=item.sub;
  if(view==='spending'){
    document.getElementById('categoryReport')?.classList.remove('reportContentHidden');
  }
  if(view==='commitments'){
    document.getElementById('insightReport')?.classList.remove('reportContentHidden');
  }
  window.scrollTo?.({top:0,behavior:'auto'});
}

function openReportView(view){
  if(!reportHubViewDefinitions()[view])return;
  showReportView(view);
  try{history.pushState({pesoTrack:true,screen:'reports',reportView:view},'','#reports-'+view)}catch(e){}
}

function closeReportView(skipHistory=false){
  const reports=document.getElementById('reports');
  if(!reports||reportView==='hub')return;
  restoreReportPanels();
  reportView='hub';
  reports.classList.remove('reports-detail-open');
  document.getElementById('reportsHub')?.classList.remove('hide');
  document.getElementById('reportDetailHeader')?.classList.add('hide');
  document.getElementById('reportDetailBody')?.classList.add('hide');
  if(!skipHistory){
    try{history.replaceState({pesoTrack:true,screen:'reports'},'','#reports')}catch(e){}
  }
  window.scrollTo?.({top:0,behavior:'auto'});
}

function backFromReportView(){
  if(reportView==='hub')return;
  try{history.back()}catch(e){closeReportView(true)}
}

function reportSubviewActive(){return reportView!=='hub'}

function renderCommitmentReport(income=0){
  const el=document.getElementById('commitmentReport');
  if(!el)return;
  const recurring=(data.recurring||[]).filter(r=>r.enabled!==false&&r.type==='Expense');
  const recurringTotal=recurring.reduce((sum,r)=>sum+Math.abs(Number(r.amount||0)),0);
  const openBills=(data.bills||[]).filter(b=>billStatus(b)!=='Paid'&&Number(b.remaining||0)>0);
  const unpaidTotal=openBills.reduce((sum,b)=>sum+Number(b.remaining||0),0);
  const fixedRate=income>0?Math.round((recurringTotal/income)*100):0;
  const upcoming=recurring.slice().sort((a,b)=>Number(a.day||0)-Number(b.day||0)).slice(0,4);
  el.innerHTML=`<div class="commitmentSummary"><div><span>Recurring</span><b>${peso(recurringTotal)}</b></div><div><span>Card dues</span><b>${peso(unpaidTotal)}</b></div><div><span>Fixed / income</span><b>${income>0?fixedRate+'%':'-'}</b></div></div><div class="commitmentList">${upcoming.length?upcoming.map(r=>`<div><span><b>${htmlText(r.name||r.category||'Recurring')}</b><small>Day ${Number(r.day||1)} - ${htmlText(accountLabel(r.accountId))}</small></span><strong>${peso(r.amount||0)}</strong></div>`).join(''):'<div class="reportEmpty">No enabled recurring expenses.</div>'}</div>`;
}

function updateReportsHub(income,expense,txns){
  const net=income-expense;
  const set=(id,value,tone)=>{const el=document.getElementById(id);if(el){el.textContent=value;el.className=tone||''}};
  set('hubIncome',peso(income),'green');
  set('hubExpense',peso(expense),'red');
  set('hubNet',peso(Math.abs(net)),net>=0?'green':'red');
  const liquid=(data.accounts||[]).filter(a=>['Savings','Cash','Wallet'].includes(a.type)).reduce((sum,a)=>sum+Number(a.balance||0),0);
  const recurring=(data.recurring||[]).filter(r=>r.enabled!==false&&r.type==='Expense').reduce((sum,r)=>sum+Math.abs(Number(r.amount||0)),0);
  set('hubValue-cashflow',peso(Math.abs(net)),net>=0?'green':'red');
  set('hubValue-balance',peso(liquid));
  set('hubValue-spending',peso(expense),'red');
  set('hubValue-commitments',peso(recurring));
  set('hubValue-transactions',`${txns.length} ${txns.length===1?'entry':'entries'}`);
  const insight=document.getElementById('reportsHubInsight');
  if(insight){
    insight.textContent=income>0
      ? `You kept ${Math.round((net/income)*100)}% of income for ${reportPeriodTitle()}.`
      : `No income recorded for ${reportPeriodTitle()}.`;
    insight.classList.toggle('negative',net<0);
  }
  renderCommitmentReport(income);
}

function renderReports(){
  ensureReportPeriodNav();
  ensureReportsHub();
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
  try{if(typeof renderBalanceTrend==='function')renderBalanceTrend()}catch(e){console.warn('Balance trend skipped',e)}
  try{if(typeof updateReportsScope==='function')updateReportsScope()}catch(e){console.warn('Report scope skipped',e)}
  try{if(typeof renderExpenseBreakdown==='function')renderExpenseBreakdown()}catch(e){console.warn('Expense breakdown skipped',e)}
  try{if(typeof renderInsights==='function')renderInsights()}catch(e){console.warn('Report insights skipped',e)}
  try{if(typeof renderTransactionsList==='function')renderTransactionsList()}catch(e){console.warn('Report transactions skipped',e)}
  try{updateReportsHub(income,expense,txns)}catch(e){console.warn('Reports hub skipped',e)}
}

function toggleReportContent(id,button){
  const content=document.getElementById(id);
  if(!content)return;
  const hidden=content.classList.toggle('reportContentHidden');
  button.textContent=hidden?'Show':'Hide';
  button.setAttribute('aria-expanded',String(!hidden));
}

function currentMonthRange(){let now=new Date();return {start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth()+1,1)}}

function monthlyCategorySpend(){let {start,end}=currentMonthRange(),spend={};data.txns.filter(t=>txInPeriod(t,start,end)).forEach(t=>{if(t.type==='Expense')groupAdd(spend,t.category||'Other',Number(t.amount||0));if(t.type==='Transfer'&&Number(t.fee||0))groupAdd(spend,'Transfer Fees',Number(t.fee||0))});return spend}

function openBudget(id){editingBudget=id||null;let b=editingBudget?data.budgets.find(x=>x.id===editingBudget):null;let cats=[...new Set((data.categories||defaultCategories()).concat(b&&b.category?[b.category]:[]))];budgetCategory.innerHTML=cats.map(c=>`<option value="${htmlText(c)}">${categoryCode(c)} - ${htmlText(c)}</option>`).join('');budgetTitle.textContent=b?'Edit Budget':'Add Budget';budgetCategory.value=b?.category||'Food';budgetAmount.value=b?.amount||'';budgetDeleteBtn.classList.toggle('hide',!b);showModal();budgetSheet.classList.add('show')}

function saveBudget(){let cat=budgetCategory.value,amt=Number(budgetAmount.value||0);if(!cat)return alert('Choose category');if(!amt)return alert('Enter monthly limit');let b=data.budgets.find(x=>x.id===editingBudget)||{id:uid()};b.category=cat;b.amount=amt;if(!editingBudget)data.budgets.push(b);persist();closeSheets()}

function deleteBudget(id){let bid=id||editingBudget;if(!bid)return closeSheets();if(!confirm('Delete this budget?'))return;data.budgets=data.budgets.filter(b=>b.id!==bid);if(editingBudget===bid)editingBudget=null;persist();closeSheets()}

function monthRange(offset=0){let now=new Date();let start=new Date(now.getFullYear(),now.getMonth()+offset,1);let end=new Date(now.getFullYear(),now.getMonth()+offset+1,1);return {start,end}}

function txnsInRange(start,end){return data.txns.filter(t=>{let d=new Date(t.date);return d>=start&&d<end})}

function summarizeTxns(txns){let income=0,expense=0,cats={},sources={};txns.forEach(t=>{let amt=Number(t.amount||0);if(t.type==='Income'){income+=amt;groupAdd(sources,t.category||accountLabel(t.from)||'Income',amt)}else if(t.type==='Expense'){expense+=amt;groupAdd(cats,t.category||'Other',amt)}else if(t.type==='Transfer'&&Number(t.fee||0)>0){expense+=Number(t.fee||0);groupAdd(cats,'Transfer Fees',Number(t.fee||0))}});return {income,expense,net:income-expense,cats,sources,savingsRate:income>0?Math.round(((income-expense)/income)*100):0}}

function renderInsights(){let el=document.getElementById('insightReport');if(!el)return;let spend=monthlyCategorySpend(),items=[];(data.budgets||[]).forEach(b=>{let used=Number(spend[b.category]||0),limit=Number(b.amount||0),pct=limit?used/limit:0;if(pct>=1)items.push({kind:'danger',text:`${b.category} is over budget by ${peso(used-limit)}.`});else if(pct>=.8)items.push({kind:'warn',text:`${b.category} is at ${Math.round(pct*100)}% of its monthly budget.`});else if(used>0)items.push({kind:'good',text:`${b.category} still has ${peso(limit-used)} left this month.`})});let cards=data.accounts.filter(a=>a.type==='Credit Card'&&Number(a.limit||0)>0);cards.forEach(c=>{let pct=Number(c.outstanding||0)/Number(c.limit||1);if(pct>=.5)items.push({kind:'warn',text:`${c.name} utilization is ${Math.round(pct*100)}%.`});else if(Number(c.outstanding||0)>0)items.push({kind:'good',text:`${c.name} utilization is low at ${Math.round(pct*100)}%.`})});let dueSoon=(data.bills||[]).filter(b=>b.status!=='Paid').map(b=>({...b,days:daysUntil(b.dueDate)})).filter(b=>b.days>=0&&b.days<=7).sort((a,b)=>a.days-b.days);dueSoon.forEach(b=>items.unshift({kind:b.days<=2?'danger':'warn',text:`${b.cardName} is due in ${b.days} day${b.days===1?'':'s'} for ${peso(b.remaining)}.`}));if(!items.length)items.push({kind:'good',text:'No urgent budget or bill alerts right now.'});el.innerHTML=items.slice(0,5).map(i=>`<div class="insightItem ${i.kind}">${i.text}</div>`).join('')}

function renderTransactionsList(){
  let el=document.getElementById('transactionReport');
  if(!el)return;
  let q=(document.getElementById('txnSearch')?.value||'').trim();
  let {start,end}=periodStartEnd();
  let arr=data.txns
    .filter(t=>txInPeriod(t,start,end))
    .slice()
    .reverse()
    .filter(t=>typeof txnMatches==='function'?txnMatches(t,q):!q||[t.type,t.category,t.note,accountLabel(t.from),accountLabel(t.to),String(t.amount),txnDate(t)].join(' ').toLowerCase().includes(q.toLowerCase()))
    .slice(0,80);
  let periodLabel=reportPeriod==='Today'?'today':`this ${reportPeriod.toLowerCase()}`;
  el.innerHTML=arr.length?arr.map(t=>txnRow(t)).join(''):`<div class="reportEmpty">No transactions ${q?`match "${htmlText(q)}" `:''}for ${periodLabel}.</div>`;
}

function liquidAccountBalanceAt(account,cutoff){
  if(!account||!['Savings','Cash','Wallet'].includes(account.type))return 0;
  const txns=(data.txns||[]).filter(t=>t&&new Date(t.date||Date.now())<cutoff);
  const fx=typeof accountTxnEffect==='function'?accountTxnEffect(account.id,txns):{balance:0};
  return Number(account.ledgerBaseBalance||0)+Number(fx.balance||0);
}

function liquidTotalAt(cutoff){
  return (data.accounts||[]).reduce((sum,a)=>sum+liquidAccountBalanceAt(a,cutoff),0);
}

function firstLiquidActivityDate(){
  const ids=new Set((data.accounts||[]).filter(a=>['Savings','Cash','Wallet'].includes(a.type)).map(a=>a.id));
  let first=null;
  (data.txns||[]).forEach(t=>{
    if(!t||!ids.size)return;
    const touches=ids.has(t.from)||ids.has(t.to);
    if(!touches)return;
    const d=new Date(t.date||Date.now());
    if(isNaN(d.getTime()))return;
    if(!first||d<first)first=d;
  });
  return first;
}

function balanceTrendPoints(){
  const range=periodStartEnd();
  const points=[];
  const addPoint=(end,label)=>points.push({end,label,total:roundMoney(liquidTotalAt(end))});
  if(reportPeriod==='Year'){
    const y=range.start.getFullYear();
    for(let i=4;i>=0;i--){
      const yr=y-i;
      addPoint(new Date(yr+1,0,1),String(yr));
    }
  }else if(reportPeriod==='Month'){
    for(let i=4;i>=0;i--){
      const s=new Date(range.start.getFullYear(),range.start.getMonth()-i,1);
      addPoint(new Date(s.getFullYear(),s.getMonth()+1,1),s.toLocaleDateString('en-PH',{month:'short'}));
    }
  }else if(reportPeriod==='Week'){
    for(let i=4;i>=0;i--){
      const s=new Date(range.start);
      s.setDate(s.getDate()-(i*7));
      const e=new Date(s);
      e.setDate(e.getDate()+7);
      addPoint(e,s.toLocaleDateString('en-PH',{month:'short',day:'numeric'}));
    }
  }else{
    const days=5;
    const base=new Date(range.end.getFullYear(),range.end.getMonth(),range.end.getDate()-days);
    for(let i=0;i<days;i++){
      const d=new Date(base);d.setDate(d.getDate()+i);
      const end=new Date(d);end.setDate(end.getDate()+1);
      addPoint(end,d.toLocaleDateString('en-PH',{month:'short',day:'numeric'}));
    }
  }
  const first=firstLiquidActivityDate();
  const clean=points.filter((p,i,arr)=>i===0||p.end.getTime()!==arr[i-1].end.getTime());
  return first?clean.filter(p=>p.end>first):clean;
}

function shortPeso(n){
  n=Number(n||0);
  const sign=n<0?'-':'';
  n=Math.abs(n);
  if(n>=1000000)return sign+'\u20b1'+(n/1000000).toFixed(3).replace(/\.?0+$/,'')+'M';
  if(n>=1000)return sign+'\u20b1'+(n/1000).toFixed(n>=100000?0:1).replace(/\.0$/,'')+'K';
  return sign+peso(n);
}

function renderBalanceTrend(){
  const el=document.getElementById('balanceTrendReport');
  if(!el)return;
  const accounts=(data.accounts||[]).filter(a=>['Savings','Cash','Wallet'].includes(a.type));
  if(!accounts.length){
    el.innerHTML='<div class="reportEmpty">Add cash, wallet, or savings accounts to see your balance trend.</div>';
    return;
  }
  const points=balanceTrendPoints();
  if(!points.length){
    el.innerHTML='<div class="reportEmpty">No balance points available for this period.</div>';
    return;
  }
  const values=points.map(p=>p.total);
  const min=Math.min(...values),max=Math.max(...values),span=Math.max(1,max-min);
  const plotted=points.map((p,i)=>{
    const x=points.length===1?300:42+(i/(points.length-1))*516;
    const y=110-((p.total-min)/span)*68;
    return {point:p,x:Number(x.toFixed(2)),y:Number(y.toFixed(2))};
  });
  const coords=plotted.map(p=>`${p.x},${p.y}`).join(' ');
  const latest=points[points.length-1],previous=points[points.length-2]||points[0];
  const change=roundMoney(latest.total-previous.total);
  const tone=change>=0?'green':'red';
  const labels=plotted.map(p=>{
    const x=Math.min(552,Math.max(48,p.x));
    const valueY=Math.max(20,p.y-14);
    return `<g><text x="${x}" y="${valueY}" class="balanceValueLabel" text-anchor="middle">${htmlText(shortPeso(p.point.total))}</text><circle cx="${p.x}" cy="${p.y}" r="5" class="balancePoint"></circle><text x="${x}" y="158" class="balanceDateLabel" text-anchor="middle">${htmlText(p.point.label)}</text></g>`;
  }).join('');
  el.innerHTML=`<div class="balanceTrendTop"><div><span>Ending balance</span><b>${peso(latest.total)}</b></div><div><span>Change</span><b class="${tone}">${change>=0?'+':'-'}${peso(Math.abs(change))}</b></div></div><svg class="balanceLineChart" viewBox="0 0 600 180" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Balance trend"><path d="M30 132H570" class="axis"></path><polyline points="${coords}" class="line"></polyline>${labels}</svg>`;
}

/* Reports period navigation: previous/next day, week, month, year. */
let reportOffset=0;
function periodStartEnd(){
  let now=new Date(),start,end;
  if(reportPeriod==='Today'){
    start=new Date(now.getFullYear(),now.getMonth(),now.getDate()+reportOffset);
    end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+1);
  }else if(reportPeriod==='Week'){
    let weekStart=Number(data?.settings?.weekStart??1);
    if(![0,1].includes(weekStart))weekStart=1;
    let weekOffset=(now.getDay()-weekStart+7)%7;
    start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-weekOffset+(reportOffset*7));
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
    const controls=document.getElementById('reportsHubControls')||reports;
    if(periodTabs.parentNode!==controls)controls.appendChild(periodTabs);
    if(nav&&nav.parentNode!==controls)controls.appendChild(nav);
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
      if(head&&!head.querySelector('#budgetTotalPill')){
        const pill=document.createElement('span');
        pill.id='budgetTotalPill';
        pill.className='budgetTotalPill';
        head.insertBefore(pill,head.querySelector('button'));
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
    const totalLimit=arr.reduce((sum,b)=>sum+Math.abs(Number(b.amount||0)),0);
    const totalPill=document.getElementById('budgetTotalPill');
    if(totalPill){
      totalPill.textContent=arr.length?'Monthly '+peso(totalLimit):'';
      totalPill.classList.toggle('hide',!arr.length);
    }
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

(function handleQueryAction(){
  try{
    var p=new URLSearchParams(location.search);
    var action=p.get('action');
    if(!action)return;
    window.addEventListener('load',function(){
      setTimeout(function(){
        try{
          if(action==='add'&&typeof openTxn==='function')openTxn();
          else if(action==='accounts'&&typeof go==='function')go('accounts',document.querySelectorAll('.nav button')[1]);
          else if(action==='reports'&&typeof go==='function')go('reports',document.querySelectorAll('.nav button')[4]);
        }catch(e){}
      },280);
    });
  }catch(e){}
})();

(function expenseBreakdownAtAGlance(){
  function esc(v){
    if(typeof htmlText==='function')return htmlText(v);
    return String(v==null?'':v).replace(/[&<>'"]/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];
    });
  }
  function expenseDataForRange(range,acct){
    var cats={};
    var count=0;
    var total=0;
    (data.txns||[]).forEach(function(t){
      if(typeof txInPeriod==='function'&&!txInPeriod(t,range.start,range.end))return;
      if(!(acct==='All'||t.from===acct||t.to===acct))return;
      if(t.type==='Expense'&&(acct==='All'||t.from===acct)){
        var amount=Number(t.amount||0);
        if(!amount)return;
        cats[t.category||'Other']=(cats[t.category||'Other']||0)+amount;
        total+=amount;
        count++;
      }
      if(t.type==='Transfer'&&Number(t.fee||0)&&(acct==='All'||t.from===acct)){
        var fee=Number(t.fee||0);
        cats['Transfer Fees']=(cats['Transfer Fees']||0)+fee;
        total+=fee;
        count++;
      }
    });
    var entries=Object.entries(cats).sort(function(a,b){return b[1]-a[1]});
    return {entries:entries,total:total,count:count,range:range};
  }

  function previousExpenseRange(range){
    var start=new Date(range.start);
    var end=new Date(range.end);
    if(reportPeriod==='Year'){
      return {start:new Date(start.getFullYear()-1,0,1),end:new Date(start.getFullYear(),0,1)};
    }
    if(reportPeriod==='Month'){
      return {start:new Date(start.getFullYear(),start.getMonth()-1,1),end:new Date(start.getFullYear(),start.getMonth(),1)};
    }
    var days=Math.round((end-start)/86400000)||1;
    return {start:new Date(start.getTime()-days*86400000),end:new Date(end.getTime()-days*86400000)};
  }

  function compareLabel(current,previous){
    current=Number(current||0);
    previous=Number(previous||0);
    var diff=current-previous;
    if(!previous&&current)return {text:'New',tone:'up',icon:'+'};
    if(previous&&!current)return {text:peso(previous),tone:'down',icon:'v'};
    if(Math.abs(diff)<0.01)return {text:'Same',tone:'same',icon:'='};
    return {text:peso(Math.abs(diff)),tone:diff>0?'up':'down',icon:diff>0?'^':'v'};
  }
  function selectedExpenseData(){
    var range=typeof periodStartEnd==='function'?periodStartEnd():currentReportMonthRange();
    var current=expenseDataForRange(range,'All');
    var previous=expenseDataForRange(previousExpenseRange(range),'All');
    current.previousCats=Object.fromEntries(previous.entries);
    return current;
  }

  function currentReportMonthRange(){
    var now=new Date();
    return {start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth()+1,1)};
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
