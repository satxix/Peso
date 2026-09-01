/* PesoTrack reports, budgets, insights, period controls, and expense breakdown views. Loaded before app.js. */
let reportView='hub';
let incomeDrillState={source:null,accountId:null};
let expenseDrillState={category:null,accountId:null,showOther:false};
let commitmentDrillState={kind:null};

function reportHubViewDefinitions(){
  return {
    cashflow:{title:'Cash Flow',sub:'Income, expenses, and net performance',panels:['cashFlowBars','incomeSourceReport']},
    balance:{title:'Balance',sub:'Ending balances and liquid-account trend',panels:['balanceTrendReport','balanceCompositionReport']},
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
  hub.innerHTML=`<div class="reportsHubSummary"><div><span>Income</span><b id="hubIncome">${peso(0)}</b><small id="hubIncomeCompare" class="reportCompare"></small></div><div><span>Expense</span><b id="hubExpense">${peso(0)}</b><small id="hubExpenseCompare" class="reportCompare"></small></div><div><span>Net</span><b id="hubNet">${peso(0)}</b><small id="hubNetCompare" class="reportCompare"></small></div></div><div class="reportsHubSectionLabel">Explore</div><div class="reportsHubList">${Object.entries(reportHubViewDefinitions()).map(([key,item])=>`<button type="button" onclick="openReportView('${key}')">${reportHubIcon(key)}<span class="reportHubCopy"><b>${item.title}</b><small>${item.sub}</small></span><span class="reportHubValue" id="hubValue-${key}"></span><span class="reportHubArrow">&gt;</span></button>`).join('')}</div><div class="reportsHubInsight" id="reportsHubInsight"></div>`;

  const detailBody=document.createElement('div');
  detailBody.id='reportDetailBody';
  detailBody.className='reportDetailBody hide';

  const store=document.createElement('div');
  store.id='reportPanelStore';
  store.className='reportPanelStore hide';

  const commitment=document.createElement('section');
  commitment.className='reportPanel commitmentReportPanel';
  commitment.innerHTML='<h3>Commitments Overview</h3><div id="commitmentReport"></div>';
  const incomeSources=document.createElement('section');
  incomeSources.className='reportPanel incomeSourcePanel';
  incomeSources.innerHTML='<h3>Income by Source</h3><div id="incomeSourceReport"></div>';
  const balanceComposition=document.createElement('section');
  balanceComposition.className='reportPanel balanceCompositionPanel';
  balanceComposition.innerHTML='<h3>Balance by Account</h3><div id="balanceCompositionReport"></div>';
  panels.push(incomeSources);
  panels.push(balanceComposition);
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
  resetIncomeDrill();
  if(typeof resetExpenseDrill==='function')resetExpenseDrill();
  resetCommitmentDrill();
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

function resetIncomeDrill(){incomeDrillState={source:null,accountId:null}}
function incomeDrillActive(){return Boolean(incomeDrillState.source)}

function incomeSourceData(){
  const {start,end}=periodStartEnd();
  const sourceMap=new Map();
  (data.txns||[]).filter(t=>t&&t.type==='Income'&&txInPeriod(t,start,end)).forEach(t=>{
    const amount=Number(t.amount||0);
    if(!amount)return;
    const label=String(t.category||'Uncategorized').trim()||'Uncategorized';
    const key=label.toLocaleLowerCase();
    if(!sourceMap.has(key))sourceMap.set(key,{name:label,total:0,txns:[],accounts:new Map()});
    const source=sourceMap.get(key);
    source.total+=amount;
    source.txns.push(t);
    const accountId=t.from||'missing';
    if(!source.accounts.has(accountId))source.accounts.set(accountId,{accountId,total:0,txns:[]});
    const account=source.accounts.get(accountId);
    account.total+=amount;
    account.txns.push(t);
  });
  const sources=[...sourceMap.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
  return {sources,total:sources.reduce((sum,item)=>sum+item.total,0)};
}

function incomeSourceByName(name){
  return incomeSourceData().sources.find(item=>item.name.toLocaleLowerCase()===String(name||'').toLocaleLowerCase())||null;
}

function incomeRouteValue(value){
  return encodeURIComponent(String(value??'')).replace(/'/g,'%27');
}

function incomeDrillHeader(title,sub){
  return `<div class="incomeDrillHead"><button type="button" onclick="backIncomeDrill()" aria-label="Back">&lt;</button><div><b>${htmlText(title)}</b><span>${htmlText(sub)}</span></div></div>`;
}

function incomeSummaryHtml(total,count,biggestLabel,biggestValue){
  return `<div class="expenseBreakdownSummary incomeBreakdownSummary"><div class="expenseStat"><span>Total income</span><b>${peso(total)}</b></div><div class="expenseStat"><span>${htmlText(count.label)}</span><b>${htmlText(count.value)}</b></div><div class="expenseStat"><span>${htmlText(biggestLabel)}</span><b>${htmlText(biggestValue)}</b></div></div>`;
}

function incomeSourceRowHtml(source,total,max){
  const pct=Math.round((source.total/Math.max(1,total))*100);
  const width=Math.max(5,Math.round((source.total/Math.max(1,max))*100));
  const icon=typeof catIcon==='function'?catIcon(source.name):'';
  const route=incomeRouteValue(source.name);
  return `<div class="expenseBarRow incomeSourceRow" role="button" tabindex="0" onclick="openIncomeSourceBreakdown(decodeURIComponent('${route}'))" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openIncomeSourceBreakdown(decodeURIComponent('${route}'))}"><div class="expenseBarTop"><b>${icon} ${htmlText(source.name)}</b><strong>${peso(source.total)}</strong></div><div class="expenseTrack incomeTrack"><i style="width:${width}%"></i></div><div class="expenseBarMeta"><span>${pct}% of income</span><span>${source.txns.length} ${source.txns.length===1?'entry':'entries'}</span><span>${htmlText(reportPeriodTitle())}</span></div><div class="incomeDrillHint">Tap to see accounts</div></div>`;
}

function renderIncomeSourceOverview(el){
  const result=incomeSourceData();
  const label=reportPeriodTitle();
  if(!result.sources.length){
    el.innerHTML=`<div class="expenseEmpty"><b>No income for ${htmlText(label)}.</b><br>Record income and choose a source such as Salary, Interest, or Business.</div>`;
    return;
  }
  const top=result.sources[0];
  const rows=result.sources.map(source=>incomeSourceRowHtml(source,result.total,top.total)).join('');
  el.innerHTML=incomeSummaryHtml(result.total,{label:'Sources',value:result.sources.length},'Biggest',top.name)+`<div class="expenseBreakdownRows incomeSourceRows">${rows}</div>`;
}

function incomeAccountRowHtml(item,sourceTotal,max){
  const account=(data.accounts||[]).find(a=>a.id===item.accountId);
  const pct=Math.round((item.total/Math.max(1,sourceTotal))*100);
  const width=Math.max(5,Math.round((item.total/Math.max(1,max))*100));
  const accountName=account?(account.name||account.institution||account.type):'Missing account';
  const institution=account?(account.institution||account.type):'Previously recorded income';
  const mark=account&&typeof logo==='function'?logo(account):'<span class="incomeAccountFallback">?</span>';
  const sourceRoute=incomeRouteValue(incomeDrillState.source);
  const accountRoute=incomeRouteValue(item.accountId);
  return `<div class="expenseBarRow incomeAccountRow" role="button" tabindex="0" onclick="openIncomeAccountBreakdown(decodeURIComponent('${sourceRoute}'),decodeURIComponent('${accountRoute}'))" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openIncomeAccountBreakdown(decodeURIComponent('${sourceRoute}'),decodeURIComponent('${accountRoute}'))}"><div class="incomeAccountTop"><span class="incomeAccountIdentity">${mark}<span><b>${htmlText(accountName)}</b><small>${htmlText(institution)}</small></span></span><strong>${peso(item.total)}</strong></div><div class="expenseTrack incomeTrack"><i style="width:${width}%"></i></div><div class="expenseBarMeta"><span>${pct}% of ${htmlText(incomeDrillState.source)}</span><span>${item.txns.length} ${item.txns.length===1?'entry':'entries'}</span></div><div class="incomeDrillHint">Tap to see transactions</div></div>`;
}

function renderIncomeSourceAccounts(el,source){
  const accounts=[...source.accounts.values()].sort((a,b)=>b.total-a.total);
  const top=accounts[0]||{total:0,accountId:''};
  const topAccount=(data.accounts||[]).find(a=>a.id===top.accountId);
  const rows=accounts.map(item=>incomeAccountRowHtml(item,source.total,top.total)).join('');
  const topName=topAccount?(topAccount.name||topAccount.institution||topAccount.type):'Account';
  el.innerHTML=incomeDrillHeader(source.name,`Accounts earning ${source.name.toLocaleLowerCase()} in ${reportPeriodTitle()}`)+incomeSummaryHtml(source.total,{label:'Accounts',value:accounts.length},'Biggest',topName)+`<div class="expenseBreakdownRows incomeAccountRows">${rows}</div>`;
}

function renderIncomeAccountTransactions(el,source,accountId){
  const accountData=source.accounts.get(accountId);
  const account=(data.accounts||[]).find(a=>a.id===accountId);
  if(!accountData){incomeDrillState.accountId=null;renderIncomeSourceAccounts(el,source);return}
  const accountName=account?(account.name||account.institution||account.type):'Missing account';
  const txns=accountData.txns.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  el.innerHTML=incomeDrillHeader(accountName,`${source.name} transactions in ${reportPeriodTitle()}`)+incomeSummaryHtml(accountData.total,{label:'Entries',value:txns.length},'Source',source.name)+`<div class="incomeTxnList">${txns.map(t=>txnRow(t,true)).join('')}</div>`;
}

function renderIncomeSourceReport(){
  const el=document.getElementById('incomeSourceReport');
  if(!el)return;
  if(!incomeDrillState.source){renderIncomeSourceOverview(el);return}
  const source=incomeSourceByName(incomeDrillState.source);
  if(!source){resetIncomeDrill();renderIncomeSourceOverview(el);return}
  if(incomeDrillState.accountId)renderIncomeAccountTransactions(el,source,incomeDrillState.accountId);
  else renderIncomeSourceAccounts(el,source);
}

function openIncomeSourceBreakdown(source,skipHistory=false){
  incomeDrillState={source,accountId:null};
  renderIncomeSourceReport();
  if(!skipHistory)try{history.pushState({pesoTrack:true,screen:'reports',reportView:'cashflow',incomeSource:source},'','#reports-income-source')}catch(e){}
  document.getElementById('incomeSourceReport')?.scrollIntoView({block:'start',behavior:'smooth'});
}

function openIncomeAccountBreakdown(source,accountId,skipHistory=false){
  incomeDrillState={source,accountId};
  renderIncomeSourceReport();
  if(!skipHistory)try{history.pushState({pesoTrack:true,screen:'reports',reportView:'cashflow',incomeSource:source,incomeAccount:accountId},'','#reports-income-account')}catch(e){}
  document.getElementById('incomeSourceReport')?.scrollIntoView({block:'start',behavior:'smooth'});
}

function backIncomeDrill(){
  try{history.back()}catch(e){
    if(incomeDrillState.accountId){incomeDrillState.accountId=null;renderIncomeSourceReport()}
    else{resetIncomeDrill();renderIncomeSourceReport()}
  }
}

function handleReportHistoryState(state){
  if(reportView==='commitments'){
    const handled=handleCommitmentReportHistoryState(state);
    if(handled)return true;
  }
  if(reportView==='spending'&&typeof handleExpenseReportHistoryState==='function'){
    const handled=handleExpenseReportHistoryState(state);
    if(handled)return true;
  }
  const isIncomeState=Boolean(state&&state.reportView==='cashflow'&&state.incomeSource);
  if(reportView!=='cashflow'||(!incomeDrillActive()&&!isIncomeState))return false;
  if(isIncomeState){
    incomeDrillState={source:state.incomeSource,accountId:state.incomeAccount||null};
  }else resetIncomeDrill();
  renderIncomeSourceReport();
  return true;
}

function recurringDatesInRange(rule,start,end){
  const dates=[];
  const cursor=new Date(start.getFullYear(),start.getMonth(),1);
  const created=rule.createdAt?new Date(rule.createdAt):null;
  const createdMonth=created&&!isNaN(created.getTime())?new Date(created.getFullYear(),created.getMonth(),1):null;
  while(cursor<end){
    const day=Math.max(1,Math.min(31,Number(rule.day||1)));
    const candidate=new Date(cursor.getFullYear(),cursor.getMonth(),Math.min(day,new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate()),12);
    if(candidate>=start&&candidate<end&&(!createdMonth||candidate>=createdMonth))dates.push(candidate);
    cursor.setMonth(cursor.getMonth()+1);
  }
  return dates;
}

function recurringRecordedForDate(rule,date){
  const occurrenceKey=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  const monthKey=occurrenceKey.slice(0,7);
  return (data.txns||[]).some(t=>t&&t.recurringId===rule.id&&(t.occurrenceKey===occurrenceKey||t.occurrenceMonth===monthKey||String(t.occurrenceKey||'').slice(0,7)===monthKey));
}

function commitmentPeriodData(){
  const range=periodStartEnd();
  const recurring=(data.recurring||[]).filter(r=>r&&r.enabled!==false).map(rule=>{
    const dates=recurringDatesInRange(rule,range.start,range.end);
    return {rule,dates,total:roundMoney(Math.abs(Number(rule.amount||0))*dates.length),recorded:dates.filter(date=>recurringRecordedForDate(rule,date)).length};
  }).filter(item=>item.dates.length);
  const expenses=recurring.filter(item=>item.rule.type==='Expense').sort((a,b)=>a.dates[0]-b.dates[0]);
  const incomes=recurring.filter(item=>item.rule.type==='Income').sort((a,b)=>a.dates[0]-b.dates[0]);
  const bills=(data.bills||[]).map(bill=>{
    const dueRaw=String(bill.dueDate||'').slice(0,10);
    const dueDate=new Date(dueRaw+'T12:00:00');
    const amount=typeof statementBilledAmount==='function'?statementBilledAmount(bill):Number(bill.amount||bill.remaining||0);
    return {bill,dueDate,amount:roundMoney(amount),status:billStatus(bill)};
  }).filter(item=>!isNaN(item.dueDate.getTime())&&item.dueDate>=range.start&&item.dueDate<range.end&&item.amount>0).sort((a,b)=>a.dueDate-b.dueDate);
  const expenseTotal=roundMoney(expenses.reduce((sum,item)=>sum+item.total,0));
  const incomeTotal=roundMoney(incomes.reduce((sum,item)=>sum+item.total,0));
  const cardTotal=roundMoney(bills.reduce((sum,item)=>sum+item.amount,0));
  return {range,expenses,incomes,bills,expenseTotal,incomeTotal,cardTotal};
}

function resetCommitmentDrill(){commitmentDrillState={kind:null}}
function commitmentDrillActive(){return Boolean(commitmentDrillState.kind)}

function commitmentMetricHtml(kind,label,total,count,tone){
  return `<button type="button" class="commitmentMetric ${tone||''}" onclick="openCommitmentBreakdown('${kind}')"><span>${htmlText(label)}</span><b>${peso(total)}</b><em>${count} ${count===1?'item':'items'}</em></button>`;
}

function commitmentRecurringRow(item,kind){
  const rule=item.rule;
  const count=item.dates.length;
  const action=kind==='income'?'received':'paid';
  const schedule=count===1?item.dates[0].toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):`${count} occurrences - Day ${Number(rule.day||1)}`;
  const status=item.recorded===count?(kind==='income'?'Received':'Paid'):item.recorded?`${item.recorded}/${count} ${action}`:'Scheduled';
  return `<div class="commitmentDetailRow ${kind}"><span><b>${htmlText(rule.name||rule.category||'Recurring')}</b><small>${htmlText(rule.category||rule.type)} - ${htmlText(accountLabel(rule.accountId))}</small><small>${htmlText(schedule)}</small></span><span class="commitmentDetailValue"><strong>${peso(item.total)}</strong><em>${htmlText(status)}</em></span></div>`;
}

function commitmentBillRow(item){
  const bill=item.bill;
  return `<div class="commitmentDetailRow card"><span><b>${htmlText(bill.cardName||'Credit Card')}</b><small>Due ${htmlText(displayDate(item.dueDate))}</small><small>${htmlText(compactBillPeriod(bill))}</small></span><span class="commitmentDetailValue"><strong>${peso(item.amount)}</strong><em class="${statusClass(item.status)}">${htmlText(item.status)}</em></span></div>`;
}

function commitmentDrillTitle(kind){
  return kind==='income'?'Recurring Income':kind==='cards'?'Credit Card Dues':'Recurring Expenses';
}

function renderCommitmentOverview(el,detail){
  const outgoing=detail.expenseTotal+detail.cardTotal;
  const note=detail.incomeTotal>0
    ? `Outgoing commitments are ${Math.round((outgoing/detail.incomeTotal)*100)}% of scheduled recurring income.`
    : `Outgoing commitments total ${peso(outgoing)} for ${reportPeriodTitle()}.`;
  el.innerHTML=`<div class="commitmentSummary">${commitmentMetricHtml('expense','Recurring expenses',detail.expenseTotal,detail.expenses.length,'expense')}${commitmentMetricHtml('income','Recurring income',detail.incomeTotal,detail.incomes.length,'income')}${commitmentMetricHtml('cards','Card dues',detail.cardTotal,detail.bills.length,'cards')}</div><div class="commitmentOverviewNote">${htmlText(note)}</div>`;
}

function renderCommitmentBreakdown(el,detail,kind){
  const title=commitmentDrillTitle(kind);
  const items=kind==='income'?detail.incomes:kind==='cards'?detail.bills:detail.expenses;
  const total=kind==='income'?detail.incomeTotal:kind==='cards'?detail.cardTotal:detail.expenseTotal;
  const rows=kind==='cards'?items.map(commitmentBillRow).join(''):items.map(item=>commitmentRecurringRow(item,kind)).join('');
  el.innerHTML=`<div class="incomeDrillHead commitmentDrillHead"><button type="button" onclick="backCommitmentDrill()" aria-label="Back">&lt;</button><div><b>${htmlText(title)}</b><span>${htmlText(reportPeriodTitle())}</span></div></div><div class="commitmentDrillTotal"><span>Total</span><b>${peso(total)}</b><em>${items.length} ${items.length===1?'item':'items'}</em></div><div class="commitmentList commitmentDetailList">${items.length?rows:`<div class="reportEmpty">No ${htmlText(title.toLowerCase())} for this period.</div>`}</div>`;
}

function renderCommitmentReport(){
  const el=document.getElementById('commitmentReport');
  if(!el)return;
  const detail=commitmentPeriodData();
  if(commitmentDrillState.kind)renderCommitmentBreakdown(el,detail,commitmentDrillState.kind);
  else renderCommitmentOverview(el,detail);
}

function openCommitmentBreakdown(kind,skipHistory=false){
  if(!['expense','income','cards'].includes(kind))return;
  commitmentDrillState={kind};
  renderCommitmentReport();
  if(!skipHistory)try{history.pushState({pesoTrack:true,screen:'reports',reportView:'commitments',commitmentKind:kind},'','#reports-commitment-'+kind)}catch(e){}
  document.getElementById('commitmentReport')?.scrollIntoView({block:'start',behavior:'smooth'});
}

function backCommitmentDrill(){
  try{history.back()}catch(e){resetCommitmentDrill();renderCommitmentReport()}
}

function handleCommitmentReportHistoryState(state){
  const isCommitmentState=Boolean(state&&state.reportView==='commitments'&&state.commitmentKind);
  if(reportView!=='commitments'||(!commitmentDrillActive()&&!isCommitmentState))return false;
  if(isCommitmentState)commitmentDrillState={kind:state.commitmentKind};
  else resetCommitmentDrill();
  renderCommitmentReport();
  return true;
}

function previousReportPeriodRange(){
  const {start}=periodStartEnd();
  if(reportPeriod==='Today'){
    const previousStart=new Date(start.getFullYear(),start.getMonth(),start.getDate()-1);
    return {start:previousStart,end:new Date(start)};
  }
  if(reportPeriod==='Week'){
    const previousStart=new Date(start.getFullYear(),start.getMonth(),start.getDate()-7);
    return {start:previousStart,end:new Date(start)};
  }
  if(reportPeriod==='Year'){
    return {start:new Date(start.getFullYear()-1,0,1),end:new Date(start.getFullYear(),0,1)};
  }
  return {start:new Date(start.getFullYear(),start.getMonth()-1,1),end:new Date(start.getFullYear(),start.getMonth(),1)};
}

function reportTotalsForRange(range){
  const totals={income:0,expense:0,net:0};
  (data.txns||[]).filter(t=>txInPeriod(t,range.start,range.end)).forEach(t=>{
    const amount=Number(t.amount||0);
    if(t.type==='Income')totals.income+=amount;
    else if(t.type==='Expense')totals.expense+=amount;
    else if(t.type==='Transfer'&&Number(t.fee||0))totals.expense+=Number(t.fee||0);
  });
  totals.net=totals.income-totals.expense;
  return totals;
}

function reportComparisonLabel(current,previous,favorableIncrease=true){
  const diff=Math.round((Number(current||0)-Number(previous||0))*100)/100;
  const previousLabel=reportPeriod==='Today'?'yesterday':reportPeriod==='Week'?'last week':reportPeriod==='Year'?'last year':'last month';
  if(Math.abs(diff)<.01)return {text:`No change vs ${previousLabel}`,tone:'neutral'};
  const favorable=(diff>0)===favorableIncrease;
  if(Math.abs(Number(previous||0))<.01){
    return {text:`New vs ${previousLabel}`,tone:favorable?'good':'bad'};
  }
  const percent=Math.round((Math.abs(diff)/Math.abs(Number(previous)))*100);
  return {text:`${diff>0?'+':'-'}${percent}% vs ${previousLabel}`,tone:favorable?'good':'bad'};
}

function setReportComparison(id,comparison){
  const el=document.getElementById(id);
  if(!el)return;
  el.textContent=comparison.text;
  el.className=`reportCompare ${comparison.tone}`;
}

function renderReportComparisons(current){
  const previous=reportTotalsForRange(previousReportPeriodRange());
  const comparisons={
    income:reportComparisonLabel(current.income,previous.income,true),
    expense:reportComparisonLabel(current.expense,previous.expense,false),
    net:reportComparisonLabel(current.net,previous.net,true)
  };
  setReportComparison('hubIncomeCompare',comparisons.income);
  setReportComparison('hubExpenseCompare',comparisons.expense);
  setReportComparison('hubNetCompare',comparisons.net);
  const trendCards=[...document.querySelectorAll('#cashFlowBars .trendSummary>div')];
  ['income','expense','net'].forEach((key,index)=>{
    const card=trendCards[index];
    if(!card)return;
    let compare=card.querySelector('.reportCompare');
    if(!compare){compare=document.createElement('small');card.appendChild(compare)}
    compare.textContent=comparisons[key].text;
    compare.className=`reportCompare ${comparisons[key].tone}`;
  });
}

function updateReportsHub(income,expense,txns){
  const net=income-expense;
  const set=(id,value,tone)=>{const el=document.getElementById(id);if(el){el.textContent=value;el.className=tone||''}};
  set('hubIncome',peso(income),'green');
  set('hubExpense',peso(expense),'red');
  set('hubNet',peso(Math.abs(net)),net>=0?'green':'red');
  const liquid=(data.accounts||[]).filter(a=>['Savings','Cash','Wallet'].includes(a.type)).reduce((sum,a)=>sum+Number(a.balance||0),0);
  const commitments=commitmentPeriodData();
  set('hubValue-cashflow',peso(Math.abs(net)),net>=0?'green':'red');
  set('hubValue-balance',peso(liquid));
  set('hubValue-spending',peso(expense),'red');
  set('hubValue-commitments',peso(commitments.expenseTotal+commitments.cardTotal));
  set('hubValue-transactions',`${txns.length} ${txns.length===1?'entry':'entries'}`);
  const insight=document.getElementById('reportsHubInsight');
  if(insight){
    insight.textContent=income>0
      ? `You kept ${Math.round((net/income)*100)}% of income for ${reportPeriodTitle()}.`
      : `No income recorded for ${reportPeriodTitle()}.`;
    insight.classList.toggle('negative',net<0);
  }
  renderCommitmentReport();
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
  renderReportComparisons({income,expense,net:income-expense});
  try{renderIncomeSourceReport()}catch(e){console.warn('Income source report skipped',e)}
  try{if(typeof renderBalanceTrend==='function')renderBalanceTrend()}catch(e){console.warn('Balance trend skipped',e)}
  try{renderBalanceComposition()}catch(e){console.warn('Balance composition skipped',e)}
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

function balanceCompositionData(){
  const {end}=periodStartEnd();
  const accounts=(data.accounts||[])
    .filter(account=>account&&['Savings','Cash','Wallet'].includes(account.type))
    .map(account=>({account,balance:roundMoney(liquidAccountBalanceAt(account,end))}))
    .sort((a,b)=>b.balance-a.balance||(a.account.name||'').localeCompare(b.account.name||''));
  const total=roundMoney(accounts.reduce((sum,item)=>sum+item.balance,0));
  const positiveTotal=accounts.reduce((sum,item)=>sum+Math.max(0,item.balance),0);
  return {accounts,total,positiveTotal,end};
}

function balanceAccountRowHtml(item,max,positiveTotal){
  const account=item.account;
  const positive=Math.max(0,item.balance);
  const width=positive>0?Math.max(5,Math.round((positive/Math.max(1,max))*100)):0;
  const share=positiveTotal>0?Math.round((positive/positiveTotal)*100):0;
  const mark=typeof accountLogoSafe==='function'?accountLogoSafe(account):(typeof logo==='function'?logo(account):'');
  const route=incomeRouteValue(account.id);
  return `<div class="expenseBarRow balanceAccountRow" role="button" tabindex="0" onclick="openAccountDetail(decodeURIComponent('${route}'))" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openAccountDetail(decodeURIComponent('${route}'))}"><div class="incomeAccountTop"><span class="incomeAccountIdentity">${mark}<span><b>${htmlText(account.name,'Unnamed Account')}</b><small>${htmlText(account.institution||account.type||'Account')}</small></span></span><strong class="${item.balance<0?'red':''}">${peso(item.balance)}</strong></div><div class="expenseTrack balanceCompositionTrack"><i style="width:${width}%"></i></div><div class="expenseBarMeta"><span>${share}% of liquid balance</span><span>${htmlText(account.type)}</span></div><div class="balanceAccountHint">Tap for current account details</div></div>`;
}

function renderBalanceComposition(){
  const el=document.getElementById('balanceCompositionReport');
  if(!el)return;
  const result=balanceCompositionData();
  if(!result.accounts.length){
    el.innerHTML='<div class="expenseEmpty"><b>No liquid accounts available.</b><br>Add a savings, cash, or wallet account to see its balance contribution.</div>';
    return;
  }
  const largest=result.accounts[0];
  const largestName=largest.account.name||largest.account.institution||largest.account.type;
  const max=Math.max(1,...result.accounts.map(item=>Math.max(0,item.balance)));
  const summary=`<div class="expenseBreakdownSummary balanceCompositionSummary"><div class="expenseStat"><span>Total balance</span><b>${peso(result.total)}</b></div><div class="expenseStat"><span>Accounts</span><b>${result.accounts.length}</b></div><div class="expenseStat"><span>Largest</span><b>${htmlText(largestName)}</b></div></div>`;
  const rows=result.accounts.map(item=>balanceAccountRowHtml(item,max,result.positiveTotal)).join('');
  el.innerHTML=`<div class="balanceCompositionSub">Ending balances for ${htmlText(reportPeriodTitle())}</div>${summary}<div class="expenseBreakdownRows balanceAccountRows">${rows}</div>`;
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
  function budgetForecastForMonth(used,limit,mStart,mEnd){
    const now=new Date();
    const currentMonthStart=new Date(now.getFullYear(),now.getMonth(),1);
    const nextMonthStart=new Date(now.getFullYear(),now.getMonth()+1,1);
    const safeUsed=Math.max(0,Number(used||0));
    const safeLimit=Math.max(0,Number(limit||0));
    const differenceCopy=(amount,over)=>`${peso(Math.abs(amount))} ${over?'over limit':'projected buffer'}`;

    if(mEnd<=currentMonthStart){
      const variance=safeUsed-safeLimit;
      return variance>0
        ?{label:'Final spend',value:peso(safeUsed),status:'Over budget',tone:'danger',detail:`${peso(variance)} over limit`}
        :{label:'Final spend',value:peso(safeUsed),status:'Finished under',tone:'good',detail:`${peso(Math.abs(variance))} unused`};
    }
    if(mStart>=nextMonthStart){
      return {label:'Forecast',value:'Not available',status:'Not started',tone:'neutral',detail:'Begins when the month starts'};
    }

    const daysInMonth=new Date(mStart.getFullYear(),mStart.getMonth()+1,0).getDate();
    const elapsedDays=Math.max(1,Math.min(now.getDate(),daysInMonth));
    const projected=Math.max(safeUsed,Math.round((safeUsed/elapsedDays)*daysInMonth*100)/100);
    const variance=projected-safeLimit;
    if(variance>0){
      return {label:'Projected',value:peso(projected),status:'Likely over',tone:'danger',detail:differenceCopy(variance,true)};
    }
    if(safeLimit&&projected>=safeLimit*.9){
      return {label:'Projected',value:peso(projected),status:'Watch',tone:'warn',detail:differenceCopy(variance,false)};
    }
    return {label:'Projected',value:peso(projected),status:'On track',tone:'good',detail:differenceCopy(variance,false)};
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
      const forecast=budgetForecastForMonth(used,limit,mStart,mEnd);
      return `<div class="budgetCard"><div class="budgetTop"><div><b>${catIcon(b.category)} ${htmlText(b.category)}</b><div class="sub">${htmlText(monthName)} monthly limit ${peso(limit)}</div></div><span class="budgetPct">${pct}%</span></div><div class="budgetBar ${barClass}"><i style="width:${Math.min(100,pct)}%"></i></div><div class="budgetMeta"><span>Used ${peso(used)}</span><span>Left ${peso(Math.max(0,limit-used))}</span></div><div class="budgetForecast ${forecast.tone}"><span><small>${forecast.label}</small><b>${forecast.value}</b></span><span class="budgetForecastStatus"><strong>${forecast.status}</strong><em>${forecast.detail}</em></span></div><div class="budgetActions"><button class="tiny" onclick="openBudget('${jsString(b.id)}')">Edit</button><button class="tiny danger" onclick="deleteBudget('${jsString(b.id)}')">Delete</button></div></div>`;
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
    var route=typeof incomeRouteValue==='function'?incomeRouteValue(cat):encodeURIComponent(cat);
    var action=item.grouped?'openExpenseOtherBreakdown()':"openExpenseCategoryBreakdown(decodeURIComponent('"+route+"'))";
    var hint=item.grouped?'Tap to see smaller categories':'Tap to see accounts';
    return '<div class="expenseBarRow expenseCategoryRow '+(item.grouped?'otherBreakdownTrigger':'')+'" role="button" tabindex="0" onclick="'+action+'" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();'+action+'}"><div class="expenseBarTop"><b>'+icon+' '+esc(cat)+'</b><strong>'+peso(val)+'</strong></div><div class="expenseTrack"><i style="width:'+width+'%"></i></div><div class="expenseBarMeta"><span>'+pct+'% of expenses</span><span class="expenseCompare '+comparison.tone+'"><i>'+esc(comparison.icon)+'</i>'+esc(comparison.text)+'</span><span>'+esc(label)+'</span></div><div class="expenseDrillHint">'+hint+'</div></div>';
  }

  function expenseDrillHeader(title,sub){
    return '<div class="incomeDrillHead expenseDrillHead"><button type="button" onclick="backExpenseDrill()" aria-label="Back">&lt;</button><div><b>'+esc(title)+'</b><span>'+esc(sub)+'</span></div></div>';
  }
  function expenseSummaryHtml(total,countLabel,countValue,biggestLabel,biggestValue){
    return '<div class="expenseBreakdownSummary expenseDrillSummary"><div class="expenseStat"><span>Total spent</span><b>'+peso(total)+'</b></div><div class="expenseStat"><span>'+esc(countLabel)+'</span><b>'+esc(countValue)+'</b></div><div class="expenseStat"><span>'+esc(biggestLabel)+'</span><b>'+esc(biggestValue)+'</b></div></div>';
  }
  function categoryExpenseData(category){
    var range=typeof periodStartEnd==='function'?periodStartEnd():currentReportMonthRange();
    var accounts=new Map(),entries=[],total=0;
    (data.txns||[]).forEach(function(t){
      if(!t||!txInPeriod(t,range.start,range.end))return;
      var amount=0;
      if(t.type==='Expense'&&(t.category||'Other')===category)amount=Number(t.amount||0);
      else if(category==='Transfer Fees'&&t.type==='Transfer')amount=Number(t.fee||0);
      if(!amount)return;
      var accountId=t.from||'missing';
      if(!accounts.has(accountId))accounts.set(accountId,{accountId:accountId,total:0,entries:[]});
      var entry={txn:t,amount:amount};
      var account=accounts.get(accountId);
      account.total+=amount;
      account.entries.push(entry);
      entries.push(entry);
      total+=amount;
    });
    return {category:category,total:total,entries:entries,accounts:accounts};
  }
  function expenseAccountRowHtml(item,categoryTotal,max){
    var account=(data.accounts||[]).find(function(a){return a.id===item.accountId});
    var pct=Math.round((item.total/Math.max(1,categoryTotal))*100);
    var width=Math.max(5,Math.round((item.total/Math.max(1,max))*100));
    var name=account?(account.name||account.institution||account.type):'Missing account';
    var institution=account?(account.institution||account.type):'Previously recorded expense';
    var mark=account&&typeof accountLogoSafe==='function'?accountLogoSafe(account):(account&&typeof logo==='function'?logo(account):'<span class="incomeAccountFallback">?</span>');
    var categoryRoute=incomeRouteValue(expenseDrillState.category),accountRoute=incomeRouteValue(item.accountId);
    return '<div class="expenseBarRow expenseAccountRow" role="button" tabindex="0" onclick="openExpenseAccountBreakdown(decodeURIComponent(\''+categoryRoute+'\'),decodeURIComponent(\''+accountRoute+'\'))" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openExpenseAccountBreakdown(decodeURIComponent(\''+categoryRoute+'\'),decodeURIComponent(\''+accountRoute+'\'))}"><div class="incomeAccountTop"><span class="incomeAccountIdentity">'+mark+'<span><b>'+esc(name)+'</b><small>'+esc(institution)+'</small></span></span><strong class="expenseAmount">'+peso(item.total)+'</strong></div><div class="expenseTrack expenseDrillTrack"><i style="width:'+width+'%"></i></div><div class="expenseBarMeta"><span>'+pct+'% of '+esc(expenseDrillState.category)+'</span><span>'+item.entries.length+' '+(item.entries.length===1?'entry':'entries')+'</span></div><div class="expenseDrillHint">Tap to see transactions</div></div>';
  }
  function expenseTransactionRow(entry,category){
    var t=entry.txn;
    if(category!=='Transfer Fees'||t.type!=='Transfer')return txnRow(t,true);
    var account=typeof safeAccountLabel==='function'?safeAccountLabel(t.from):accountLabel(t.from);
    return '<div class="row txnRow txn-expense"><div class="txnMain"><div class="txnTitleLine"><span class="txnTypePill">Fee</span></div><div class="txnMeta">'+esc(txnDate(t))+' - Transfer fee - '+account+'</div></div><b class="txnAmount">-'+peso(entry.amount)+'</b></div>';
  }
  function renderExpenseOther(el){
    var detail=window.__expenseOtherBreakdown;
    if(!detail||!detail.entries||!detail.entries.length){resetExpenseDrill();window.renderExpenseBreakdown();return}
    var max=Math.max(1,detail.entries[0].value);
    var rows=detail.entries.map(function(item){return expenseRowHtml(item,detail.total,max,detail.label)}).join('');
    el.innerHTML=expenseDrillHeader('Other','Smaller categories in '+detail.label)+expenseSummaryHtml(detail.otherTotal,'Categories',detail.entries.length,'Share',Math.round((detail.otherTotal/Math.max(1,detail.total))*100)+'%')+'<div class="expenseBreakdownRows">'+rows+'</div>';
  }
  function renderExpenseCategoryAccounts(el,detail){
    var accounts=[...detail.accounts.values()].sort(function(a,b){return b.total-a.total});
    var top=accounts[0]||{total:0,accountId:''};
    var topAccount=(data.accounts||[]).find(function(a){return a.id===top.accountId});
    var topName=topAccount?(topAccount.name||topAccount.institution||topAccount.type):'Account';
    var rows=accounts.map(function(item){return expenseAccountRowHtml(item,detail.total,top.total)}).join('');
    el.innerHTML=expenseDrillHeader(detail.category,'Accounts used for '+detail.category.toLocaleLowerCase()+' in '+reportPeriodTitle())+expenseSummaryHtml(detail.total,'Accounts',accounts.length,'Biggest',topName)+'<div class="expenseBreakdownRows expenseAccountRows">'+rows+'</div>';
  }
  function renderExpenseAccountTransactions(el,detail,accountId){
    var accountData=detail.accounts.get(accountId);
    var account=(data.accounts||[]).find(function(a){return a.id===accountId});
    if(!accountData){expenseDrillState.accountId=null;renderExpenseCategoryAccounts(el,detail);return}
    var accountName=account?(account.name||account.institution||account.type):'Missing account';
    var entries=accountData.entries.slice().sort(function(a,b){return new Date(b.txn.date||0)-new Date(a.txn.date||0)});
    var rows=entries.map(function(entry){return expenseTransactionRow(entry,detail.category)}).join('');
    el.innerHTML=expenseDrillHeader(accountName,detail.category+' transactions in '+reportPeriodTitle())+expenseSummaryHtml(accountData.total,'Entries',entries.length,'Category',detail.category)+'<div class="incomeTxnList expenseTxnList">'+rows+'</div>';
  }
  window.resetExpenseDrill=function(){expenseDrillState={category:null,accountId:null,showOther:false}};
  window.expenseDrillActive=function(){return Boolean(expenseDrillState.category||expenseDrillState.showOther)};
  window.openExpenseOtherBreakdown=function(skipHistory){
    if(!window.__expenseOtherBreakdown?.entries?.length)return;
    expenseDrillState={category:null,accountId:null,showOther:true};
    window.renderExpenseBreakdown();
    if(!skipHistory)try{history.pushState({pesoTrack:true,screen:'reports',reportView:'spending',expenseOther:true},'','#reports-expense-other')}catch(e){}
    document.getElementById('categoryReport')?.scrollIntoView({block:'start',behavior:'smooth'});
  };
  window.openExpenseCategoryBreakdown=function(category,skipHistory){
    expenseDrillState={category:category,accountId:null,showOther:false};
    window.renderExpenseBreakdown();
    if(!skipHistory)try{history.pushState({pesoTrack:true,screen:'reports',reportView:'spending',expenseCategory:category},'','#reports-expense-category')}catch(e){}
    document.getElementById('categoryReport')?.scrollIntoView({block:'start',behavior:'smooth'});
  };
  window.openExpenseAccountBreakdown=function(category,accountId,skipHistory){
    expenseDrillState={category:category,accountId:accountId,showOther:false};
    window.renderExpenseBreakdown();
    if(!skipHistory)try{history.pushState({pesoTrack:true,screen:'reports',reportView:'spending',expenseCategory:category,expenseAccount:accountId},'','#reports-expense-account')}catch(e){}
    document.getElementById('categoryReport')?.scrollIntoView({block:'start',behavior:'smooth'});
  };
  window.backExpenseDrill=function(){
    try{history.back()}catch(e){
      if(expenseDrillState.accountId){expenseDrillState.accountId=null;window.renderExpenseBreakdown()}
      else{resetExpenseDrill();window.renderExpenseBreakdown()}
    }
  };
  window.handleExpenseReportHistoryState=function(state){
    var isExpenseState=Boolean(state&&state.reportView==='spending'&&(state.expenseOther||state.expenseCategory));
    if(reportView!=='spending'||(!expenseDrillActive()&&!isExpenseState))return false;
    if(state&&state.expenseOther)expenseDrillState={category:null,accountId:null,showOther:true};
    else if(state&&state.expenseCategory)expenseDrillState={category:state.expenseCategory,accountId:state.expenseAccount||null,showOther:false};
    else resetExpenseDrill();
    window.renderExpenseBreakdown();
    return true;
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
    if(expenseDrillState.showOther){renderExpenseOther(el);return}
    if(expenseDrillState.category){
      var detail=categoryExpenseData(expenseDrillState.category);
      if(!detail.total){resetExpenseDrill();window.renderExpenseBreakdown();return}
      if(expenseDrillState.accountId)renderExpenseAccountTransactions(el,detail,expenseDrillState.accountId);
      else renderExpenseCategoryAccounts(el,detail);
      return;
    }
    if(rest)visibleEntries.push({name:'Other',value:rest,previous:restPrevious,grouped:true});
    var rows=visibleEntries.map(function(item){return expenseRowHtml(item,d.total,max,label)}).join('');
    el.innerHTML='<div class="expenseBreakdownSummary"><div class="expenseStat"><span>Total spent</span><b>'+peso(d.total)+'</b></div><div class="expenseStat"><span>Categories</span><b>'+d.entries.length+'</b></div><div class="expenseStat"><span>Biggest</span><b>'+esc(top[0])+'</b></div></div><div class="expenseBreakdownRows">'+rows+'</div>';
  };
  window.addEventListener('load',function(){setTimeout(function(){try{renderExpenseBreakdown()}catch(e){}},420)});
})();
