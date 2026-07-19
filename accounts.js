/* PesoTrack account list, account details, stats, and account form actions. Loaded before app.js. */
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
function accountLogoSafe(a){try{return typeof logo==='function'?logo(a):''}catch(e){console.warn('Account logo failed',e,a)}let label=String(a?.institution||a?.name||'AC').trim().slice(0,3).toUpperCase()||'AC';return `<div class="bank otherbank"><span class="bankLogoMark"><b>${htmlText(label)}</b></span></div>`}
function accountRow(a){let amount=accountGlimpseAmount(a);let limit=Number(a.limit||0),out=Number(a.outstanding||0);let util=a.type==='Credit Card'&&limit?Math.min(100,Math.round(out/limit*100)):0;let utilClass=util>=80?'danger':util>=50?'warn':'';let utilBar=a.type==='Credit Card'&&limit?`<div class="acctUtil ${utilClass}"><i style="width:${util}%"></i></div>`:'';let hint=accountGlimpseHint(a);return `<button type="button" class="acctRow" onclick="openAccountDetail('${jsString(a.id)}')">${accountLogoSafe(a)}<span class="acctMain"><b class="acctName">${htmlText(a.name,'Unnamed Account')}</b><span class="acctMeta"><span class="acctInst">${htmlText(a.institution||a.type||'Account')}</span></span></span><span class="acctRight"><b class="acctAmount">${peso(amount)}</b>${hint?`<span class="acctHint">${htmlText(hint)}</span>`:''}${utilBar}</span></button>`}
function renderAccounts(){let grid=document.getElementById('accountGrid');if(!grid)return;let arr=(data.accounts||[]).filter(a=>a&&typeof a==='object'&&(acctFilter==='All'||a.type===acctFilter));let order=['Savings','Cash','Wallet','Credit Card','Investment'];let groups={};arr.forEach(a=>{let key=order.includes(a.type)?a.type:'Other';(groups[key]||(groups[key]=[])).push(a)});let sections=order.concat('Other').filter(k=>groups[k]?.length).map(k=>{let total=groups[k].reduce((sum,a)=>sum+accountGlimpseAmount(a),0);return `<section class="acctGroup" data-acct-group="${htmlText(k)}"><button type="button" class="acctGroupHead" onclick="toggleAcctGroup('${jsString(k)}')"><span class="acctGroupTitle"><span class="acctGroupName">${accountGroupLabel(k)}</span></span><span class="acctGroupMeta">${groups[k].length} account${groups[k].length===1?'':'s'} &middot; ${peso(total)}</span></button><div class="acctList">${groups[k].map(accountRow).join('')}</div></section>`}).join('');grid.innerHTML=(sections||'<div class="gm4-empty"><b>No accounts yet.</b><span>Tap + to add banks, cash on hand, wallets, cards, or investments.</span></div>')+`<button type="button" class="acctRow acctAddRow" onclick="openAddAccount()"><span class="acctAddIcon">+</span><span class="acctMain"><b class="acctName">Add Account</b><span class="acctInst">Bank, cash, wallet, card, or investment</span></span></button>`;((data.settings&&data.settings.collapsedAccountGroups)||[]).forEach(k=>{let sec=[...grid.querySelectorAll('[data-acct-group]')].find(x=>x.dataset.acctGroup===k);if(sec)sec.classList.add('collapsed')})}
function toggleAcctGroup(k){data.settings.collapsedAccountGroups=Array.isArray(data.settings.collapsedAccountGroups)?data.settings.collapsedAccountGroups:[];let set=new Set(data.settings.collapsedAccountGroups);if(set.has(k))set.delete(k);else set.add(k);data.settings.collapsedAccountGroups=[...set];try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}renderAccounts()}
function filterAccounts(f,el){acctFilter=f;document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));if(el)el.classList.add('active');renderAccounts()}

function txnTimestamp(t){let d=new Date(t&&t.date);return isNaN(d.getTime())?0:d.getTime()}
function recentTxns(list){return (list||[]).map((t,i)=>({t,i})).sort((a,b)=>(txnTimestamp(b.t)-txnTimestamp(a.t))||(b.i-a.i)).map(x=>x.t)}
function accountTxns(accountId){return recentTxns((data.txns||[]).filter(t=>t&&typeof t==='object'&&(t.from===accountId||t.to===accountId)))}
function accountStats(accountId){let income=0,expense=0,transferIn=0,transferOut=0,fees=0,payments=0;accountTxns(accountId).forEach(t=>{let amt=Number(t.amount||0),fee=Number(t.fee||0);if(t.type==='Income'&&t.from===accountId)income+=amt;else if(t.type==='Expense'&&t.from===accountId)expense+=amt;else if(t.type==='Transfer'){if(t.from===accountId){transferOut+=amt;fees+=fee}else if(t.to===accountId)transferIn+=amt}else if(t.type==='Card Payment'){if(t.from===accountId)payments+=amt; if(t.to===accountId)payments+=amt}});return {income,expense,transferIn,transferOut,fees,payments}}
function openAccountDetail(id){let a=data.accounts.find(x=>x.id===id);if(!a)return;let st=accountStats(id);let tx=accountTxns(id).slice(0,12);let main=a.type==='Credit Card'?Number(a.outstanding||0):Number(a.balance||0);let label=a.type==='Credit Card'?'Outstanding':'Current Balance';let statements=a.type==='Credit Card'?cardAllBills(a.id):[];let openBill=statements.find(b=>billStatus(b)!=='Paid');let nextSt=a.type==='Credit Card'?nextStatementDate(a):null;let nextDue=a.type==='Credit Card'?dueFromStatement(a,nextSt):null;let baseNote=a.type==='Credit Card'?'':`<div class="sub accountBaseNote">Starting ${peso(a.ledgerBaseBalance||0)}</div>`;let extra=a.type==='Credit Card'?`<div class="statBox"><span class="small">Credit Limit</span><b>${peso(a.limit||0)}</b></div><div class="statBox"><span class="small">Available</span><b>${peso((a.limit||0)-(a.outstanding||0))}</b></div><div class="statBox"><span class="small">Next Statement</span><b>${displayDate(nextSt)}</b></div><div class="statBox"><span class="small">Next Due</span><b>${openBill?displayDate(openBill.dueDate):displayDate(nextDue)}</b></div>`:`<div class="statBox"><span class="small">Income</span><b>${peso(st.income)}</b></div><div class="statBox"><span class="small">Expense</span><b>${peso(st.expense)}</b></div><div class="statBox"><span class="small">Transfers In</span><b>${peso(st.transferIn)}</b></div><div class="statBox"><span class="small">Transfers Out</span><b>${peso(st.transferOut+st.fees)}</b></div>`;let statementHtml=a.type==='Credit Card'?`<div class="section"><h2>Statement History</h2>${openBill?`<button class="ghost" onclick="openSettle('${openBill.id}')">Settle Current</button>`:''}</div><div class="statementList">${statements.length?statements.map(b=>`<div class="statementMini compactStatement"><div><b class="statementPeriod">${compactBillPeriod(b)}</b><div class="sub">Due ${displayDate(b.dueDate)}</div></div><div class="statementAmt"><b>${peso(b.remaining||0)}</b><span class="statusPill ${statusClass(billStatus(b))}">${billStatus(b)}</span></div></div>`).join(''):'<div class="emptyState">No statement history yet. Credit card purchases will create statement records automatically.</div>'}</div>`:'';accountDetailBody.innerHTML=`<section class="detailHero"><div class="detailTop">${logo(a)}<div><div class="name">${a.name}</div><div class="inst">${a.institution||a.type} - ${a.type}</div></div></div><div class="small" style="margin-top:14px">${label}</div><div class="detailAmount">${peso(main)}</div>${baseNote}${a.type==='Credit Card'?`<div class="bar"><i style="width:${Math.min(100,((a.outstanding||0)/(a.limit||1))*100)}%"></i></div>`:''}</section><div class="statGrid">${extra}</div><div class="sheetActions"><button class="primary" onclick="editAccountFromDetail('${a.id}')">Edit Account</button><button onclick="openTxnFromDetail()">Add Transaction</button></div><button class="dangerBtn" onclick="deleteAccountById('${a.id}')">Delete Account</button>${statementHtml}<div class="section"><h2>Recent Activity</h2></div><div class="detailList">${tx.length?tx.map(t=>txnRow(t,true)).join(''):'<div class="emptyState">No activity yet for this account.</div>'}</div>`;showModal();accountDetailSheet.classList.add('show')}
function editAccountFromDetail(id){accountDetailSheet.classList.remove('show');editAccount(id)}
function openTxnFromDetail(){accountDetailSheet.classList.remove('show');openTxn()}


let searchFilter='All';

function openAddAccount(){editingAccount=null;acctTitle.textContent='Add Account';atype.value='Savings';inst.value='';aname.value='';let lf=document.getElementById('instLogo');if(lf){lf.value='otherbank';lf.dataset.manual=''}renderAccountFields();renderLogoPicker('otherbank');showModal();accountSheet.classList.add('show')}function editAccount(id){let a=data.accounts.find(x=>x.id===id); if(!a)return; editingAccount=id; acctTitle.textContent='Edit Account';atype.value=a.type;inst.value=a.institution||'';aname.value=a.name;let key=a.logoKey||banks[a.institution]||'otherbank';let lf=document.getElementById('instLogo');if(lf){lf.value=key;lf.dataset.manual='1'}renderAccountFields(a);renderLogoPicker(key);showModal();accountSheet.classList.add('show')}function renderAccountFields(a={}){let t=atype.value;if(document.getElementById('inst')){inst.style.display=t==='Cash'?'none':''; if(t==='Cash') inst.value='';} if(t==='Cash' && document.getElementById('aname') && !aname.value) aname.value='Cash on Hand';dynamicFields.innerHTML=t==='Credit Card'?`<input class="field" id="limit" type="number" placeholder="Credit limit" value="${a.limit||''}"><input class="field" id="statementDay" type="number" placeholder="Statement day, e.g. 15" value="${a.statementDay||''}"><input class="field" id="dueDay" type="number" placeholder="Due day, e.g. 5" value="${a.dueDay||''}"><button class="ghost" onclick="deleteAccount()">Delete</button>`:`<input class="field" id="balance" type="number" placeholder="${t==='Investment'?'Current value':'Opening balance'}" value="${a.balance||''}"><button class="ghost" onclick="deleteAccount()">Delete</button>`}function saveAccount(){
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
function deleteAccount(){if(!editingAccount)return closeSheets(); deleteAccountById(editingAccount)}
