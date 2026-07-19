/* PesoTrack reports, budgets, insights, period controls, and expense breakdown views. Loaded before app.js. */
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

function renderReportList(target,obj,kind){let el=document.getElementById(target);if(!el)return;let entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]);el.innerHTML=entries.length?entries.map(([k,v])=>`<div class="reportLine"><div><b>${kind==='cat'?catIcon(k)+' ':''}${htmlText(k)}</b><div class="sub">${kind==='acct'?'Selected period activity':'Total for '+reportPeriod.toLowerCase()}</div></div><b>${peso(v)}</b></div>`).join(''):`<div class="reportEmpty">No ${kind==='income'?'income':kind==='cat'?'expenses':'activity'} for this period.</div>`}

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
