/* PesoTrack transaction modal, picker, ledger, and row helpers. Loaded before app.js. */
function deleteTxn(id){
  const t=data.txns.find(x=>x.id===id);
  if(!t) return alert('Transaction not found.');
  const label=`${t.type||'Transaction'} ${peso(t.amount||0)}`;
  if(!confirm(`Delete ${label}? This will reverse the balance changes.`)) return;
  try{
    reverseTxn(t);
    data.txns=data.txns.filter(x=>x.id!==id);
    if(editingTxn===id){editingTxn=null;}
    persist();
    if(typeof showToast==='function') showToast('Transaction deleted');
  }catch(err){
    console.error('Delete transaction failed',err);
    alert('Unable to delete transaction. Details: '+(err&&err.message?err.message:err));
  }
}

function deleteEditingTxn(){
  if(!editingTxn) return alert('No transaction selected.');
  const id=editingTxn;
  deleteTxn(id);
  closeSheets();
}

function openTxn(id){editingTxn=id||null;let old=editingTxn?data.txns.find(t=>t.id===editingTxn):null;if(old&&old.type==='Card Payment'){alert('Card payments are edited from the bill settlement flow. You can delete it from the transaction list if needed.');editingTxn=null;return}amount=old?String(old.amount||0):'0';txnType=old?old.type:'Expense';txn={from:old?.from||null,to:old?.to||null,category:old?.category||'Food',fee:Number(old?.fee||0),note:old?.note||''};txnTitle.textContent=old?'Edit Transaction':'Add Transaction';txnSaveBtn.textContent=old?'Update Transaction':'Save Transaction';txnDeleteBtn.classList.toggle('hide',!old);document.querySelectorAll('#txnSheet .seg button').forEach(b=>b.classList.toggle('active',b.textContent.trim()===txnType));renderTxn();if(document.getElementById('txnNote')){txnNote.value=txn.note||'';toggleTxnNote(!!txn.note)}let dateEl=document.getElementById('txnDate');if(dateEl)dateEl.value=txnInputDateValue(old?.date||Date.now());showModal();txnSheet.classList.add('show')}

function setTxnType(t,el){txnType=t;document.querySelectorAll('#txnSheet .seg button').forEach(b=>b.classList.remove('active'));if(el)el.classList.add('active');if(t==='Income'&&(!txn.category||txn.category==='Food'))txn.category='Salary';if(t==='Expense'&&(!txn.category||txn.category==='Salary'))txn.category='Food';if(t==='Transfer')txn.category='';renderTxn()}

function accountPickButton(field,label,wide=false){let a=accountById(txn[field]);if(!a)return `<button class="txnPickBtn ${wide?'wide':''}" onclick="chooseAcct('${field}')"><div class="catCircle">+</div><div class="txnPickText"><b>${label}</b><span>Choose account</span><em>Pick from accounts you added</em></div></button>`;let main=a.name||a.institution||a.type,sub=`${a.institution||a.type} - ${a.type==='Credit Card'?'Outstanding '+peso(a.outstanding||0):'Balance '+peso(a.balance||0)}`;return `<button class="txnPickBtn ${wide?'wide':''}" onclick="chooseAcct('${field}')">${logo(a)}<div class="txnPickText"><b>${label}</b><span>${main}</span><em>${sub}</em></div></button>`}

function categoryPickButton(label,wide=false){let c=txn.category||'Choose category';return `<button class="txnPickBtn ${wide?'wide':''}" onclick="chooseCat()"><div class="catCircle">${catIcon(c)}</div><div class="txnPickText"><b>${label}</b><span>${c}</span><em>${txnType==='Income'?'Income source':'Expense category'}</em></div></button>`}

function renderTxn(){if(txnType==='Transfer')txnPick.innerHTML=accountPickButton('from','From Account')+accountPickButton('to','To Account')+feeInput();else if(txnType==='Income')txnPick.innerHTML=accountPickButton('from','Deposit To')+categoryPickButton('Source');else txnPick.innerHTML=accountPickButton('from','Account')+categoryPickButton('Category');updateAmountDisplay();pad.innerHTML=['7','8','9','4','5','6','1','2','3','.','0','backspace'].map(x=>`<button type="button" class="${x==='backspace'?'backspace':''}" aria-label="${x==='backspace'?'Delete last digit':x==='.'?'Decimal point':'Number '+x}" onclick="tap('${x}')">${x==='backspace'?'<span aria-hidden="true">Del</span>':x}</button>`).join('')}

function feeInput(){return `<label class="feeBox"><div><b>Transfer Fee</b><span>Optional fee charged by bank/wallet</span></div><input id="transferFee" type="number" min="0" step="0.01" value="${Number(txn.fee||0)||''}" placeholder="0" oninput="txn.fee=Number(this.value||0)"></label>`}

function name(id){return (data.accounts.find(a=>a.id===id)||{}).name}

function displayInputAmount(v){if(data.settings&&data.settings.privacy)return '\u2022\u2022\u2022\u2022';let s=String(v||'0');if(s.includes('.')){let parts=s.split('.'),whole=parts[0]||'0',dec=(parts[1]||'').slice(0,2);return '\u20b1'+Number(whole||0).toLocaleString('en-PH')+'.'+dec}return peso(s)}

function updateAmountDisplay(){if(document.getElementById('amtDisplay'))amtDisplay.textContent=displayInputAmount(amount)}

function cleanAmountInput(v){let s=String(v||'0').replace(/[^\d.]/g,'');let firstDot=s.indexOf('.');if(firstDot>-1){s=s.slice(0,firstDot+1)+s.slice(firstDot+1).replace(/\./g,'');let parts=s.split('.');parts[1]=(parts[1]||'').slice(0,2);s=parts[0]+'.'+parts[1]}s=s.replace(/^0+(?=\d)/,'');return s||'0'}

function toggleTxnNote(force){let input=document.getElementById('txnNote'),btn=document.getElementById('txnNoteToggle');if(!input)return;let open=force===undefined?input.classList.contains('collapsed'):!!force;input.classList.toggle('collapsed',!open);if(btn)btn.textContent=open?'Hide Note':'+ Note';if(open)setTimeout(()=>input.focus(),0)}

function tap(x){if(x==='backspace')amount=amount.length>1?amount.slice(0,-1):'0';else if(x==='.'&&!amount.includes('.'))amount=amount==='0'?'0.':amount+'.';else if(x!=='.'){let parts=String(amount).split('.');if(parts.length>1&&parts[1].length>=2)return;amount=amount==='0'?x:amount+x}amount=cleanAmountInput(amount);updateAmountDisplay()}

function accountSubtitle(a){
  if(!a)return '';
  if(a.type==='Credit Card'){
    let avail=Number(a.limit||0)-Number(a.outstanding||0);
    return `Outstanding ${peso(a.outstanding||0)} - Available ${peso(avail)}`;
  }
  return `${a.type} - Balance ${peso(a.balance||0)}`;
}

function closePicker(){pickerSheet.classList.remove('show');pickerSheet.classList.remove('compactCategoryPicker');pickerMode=null;pickerField=null;pickerSearch.value='';hideModalIfNone()}

function chooseAcct(field){
  pickerSheet.classList.remove('compactCategoryPicker');pickerMode='account';pickerField=field;pickerTitle.textContent=field==='to'?'Choose To Account':(txnType==='Income'?'Choose Deposit Account':'Choose Account');pickerSub.textContent='Only accounts you added are shown';pickerSearch.value='';renderPicker();showModal();pickerSheet.classList.add('show')
}

function chooseCat(){
  pickerSheet.classList.add('compactCategoryPicker');pickerMode='category';pickerField='category';pickerTitle.textContent=txnType==='Income'?'Choose Income Source':'Choose Category';pickerSub.textContent=txnType==='Income'?'Tap the source of income':'Tap a category';pickerSearch.value='';renderPicker();showModal();pickerSheet.classList.add('show')
}

function renderPicker(){
  const q=(pickerSearch.value||'').toLowerCase().trim();
  if(pickerMode==='account'){
    let accounts=data.accounts.slice();
    if(txnType==='Income') accounts=accounts.filter(a=>a.type!=='Credit Card');
    if(txnType==='Transfer' && pickerField==='to' && txn.from) accounts=accounts.filter(a=>a.id!==txn.from);
    if(txnType==='Transfer' && pickerField==='from' && txn.to) accounts=accounts.filter(a=>a.id!==txn.to);
    if(q) accounts=accounts.filter(a=>`${a.name} ${a.institution} ${a.type}`.toLowerCase().includes(q));
    pickerList.innerHTML=accounts.length?accounts.map(a=>`<button class="option" onclick="selectAccount('${a.id}')">${logo(a)}<div style="flex:1"><b>${a.name}</b><div class="meta">${a.institution||a.type}</div><div class="minirow"><span>${a.type==='Credit Card'?'Card':'Account'}</span><span>${accountSubtitle(a)}</span></div></div></button>`).join(''):`<div class="empty">No accounts yet. Add an account first from the Accounts tab.</div>`;
  }else if(pickerMode==='category'||pickerMode==='recurringCategory'){
    let cats=categoryListForTxn();
    if(q) cats=cats.filter(c=>c.toLowerCase().includes(q));
    let exact=(data.categories||[]).some(c=>c.toLowerCase()===q);
    let add=q&&!exact?`<button class="categoryCompactChip categoryCreate" onclick="selectCategory('${jsString(pickerSearch.value.trim())}')"><span class="catMiniIcon">+</span><b>Add "${htmlText(pickerSearch.value.trim())}"</b></button>`:'';
    let chips=add+cats.map(c=>`<button class="categoryCompactChip" onclick="selectCategory('${jsString(c)}')"><span class="catMiniIcon">${catIcon(c)}</span><b>${htmlText(c)}</b></button>`).join('');
    pickerList.innerHTML=chips?`<div class="categoryCompactGrid">${chips}</div>`:'<div class="empty">Type a category name to add it.</div>';  }
}

function catIcon(c){
  const key=String(c||'Other').trim();
  const rawIcon=key.startsWith('__icon:')?key.slice(7):'';
  const kind=rawIcon||(data.categoryIcons&&data.categoryIcons[key])||{Food:'food',Groceries:'cart',Coffee:'cup',Dining:'food',Transport:'car',Gas:'fuel',Parking:'park',Shopping:'bag',Bills:'receipt',Utilities:'bolt',Rent:'home',Internet:'wifi',Phone:'phone',Health:'heart',Medicine:'pill',Insurance:'shield',Travel:'plane',Entertainment:'play',Subscriptions:'repeat',Education:'book',Family:'users',Pets:'paw',Gifts:'gift',Salary:'wallet',Bonus:'gift',Freelance:'briefcase',Interest:'bank',Refund:'return',Investment:'trend',Savings:'bank','Debt Payment':'card','Credit Card':'card','Transfer Fees':'swap',Transfer:'swap',MP2:'bank',Other:'tag'}[key];
  const paths={broom:'<path d="M14 3l7 7M12 5l7 7M13 8 5 16l3 3 8-8M4 17l3 3M3 21c3-1 5-1 7 0"/>',helper:'<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0M9 15l3 3 3-3"/>',laundry:'<path d="M5 3h14v18H5V3ZM8 6h2M13 6h3M9 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"/>',wrench:'<path d="M14 7a5 5 0 0 0 6 6L11 22l-5-5 9-9ZM6 17l-4 4"/>',baby:'<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21c1-4 4-6 7-6s6 2 7 6M9 9h.1M15 9h.1"/>',shirt:'<path d="M8 4 4 7l2 4 2-1v11h8V10l2 1 2-4-4-3-2 2h-4L8 4Z"/>',scissors:'<path d="M4 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM4 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM9 8l11 8M9 16l11-8"/>',beauty:'<path d="M8 21h8M10 21V9l2-6 2 6v12M7 9h10"/>',food:'<path d="M7 3v8M11 3v8M7 7h4M9 11v10M17 3v18M15 3h4"/>',cart:'<path d="M4 5h2l2 10h9l2-7H7M9 20h.1M17 20h.1"/>',cup:'<path d="M6 8h10v5a5 5 0 0 1-10 0V8Z"/><path d="M16 9h2a3 3 0 0 1 0 6h-2M5 20h12"/>',car:'<path d="M5 13l2-5h10l2 5M5 13h14v5H5v-5ZM7 18v2M17 18v2M8 15h.1M16 15h.1"/>',fuel:'<path d="M6 21V4h9v17M6 9h9M15 7l3 3v8a2 2 0 0 0 4 0v-5l-3-3"/>',park:'<path d="M7 21V4h7a4 4 0 0 1 0 8H7"/>',bag:'<path d="M6 8h12l-1 13H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',receipt:'<path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',bolt:'<path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z"/>',home:'<path d="M4 11 12 4l8 7M6 10v10h12V10M10 20v-6h4v6"/>',wifi:'<path d="M4 9a12 12 0 0 1 16 0M7 12a7 7 0 0 1 10 0M10 15a3 3 0 0 1 4 0M12 19h.1"/>',phone:'<path d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM11 18h2"/>',heart:'<path d="M20 8.5c0 5-8 10-8 10s-8-5-8-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z"/>',pill:'<path d="M10 21 21 10a4 4 0 0 0-6-6L4 15a4 4 0 0 0 6 6ZM8 11l5 5"/>',shield:'<path d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z"/>',plane:'<path d="M3 11h18L13 3v6L7 6v5l-4 4v-4Z"/>',play:'<path d="M8 5v14l11-7L8 5Z"/>',repeat:'<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',book:'<path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3V5Z"/><path d="M4 19a3 3 0 0 1 3-3h13"/>',users:'<path d="M16 11a4 4 0 1 0-8 0M3 21a7 7 0 0 1 14 0M17 8a3 3 0 0 1 0 6M18 17a5 5 0 0 1 3 4"/>',paw:'<path d="M12 13c3 0 5 2 5 5a3 3 0 0 1-5 2 3 3 0 0 1-5-2c0-3 2-5 5-5ZM6 10h.1M10 7h.1M14 7h.1M18 10h.1"/>',gift:'<path d="M4 9h16v12H4V9ZM12 9v12M4 13h16M7 9a3 3 0 1 1 5 0M12 9a3 3 0 1 1 5 0"/>',wallet:'<path d="M4 7h16v12H4V7ZM16 12h4v4h-4a2 2 0 0 1 0-4ZM4 7l12-3 2 3"/>',briefcase:'<path d="M4 7h16v12H4V7ZM9 7V5h6v2M4 12h16"/>',bank:'<path d="M3 10 12 4l9 6M5 10h14M6 10v9M10 10v9M14 10v9M18 10v9M4 19h16"/>',return:'<path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-1"/>',trend:'<path d="M4 17 10 11l4 4 6-8M16 7h4v4"/>',card:'<path d="M3 6h18v12H3V6ZM3 10h18M7 15h4"/>',swap:'<path d="M7 7h13l-4-4M17 17H4l4 4"/>',tag:'<path d="M4 12V4h8l8 8-8 8-8-8ZM8 8h.1"/>'};
  if(kind)return '<svg class="catSvg" viewBox="0 0 24 24" fill="none" aria-hidden="true">'+paths[kind]+'</svg>';
  return '<span class="catLetters">'+categoryCode(key)+'</span>';
}

function applyTxn(t){let amt=Number(t.amount||0),from=data.accounts.find(a=>a.id===t.from),to=data.accounts.find(a=>a.id===t.to);if(t.type==='Income'){if(from)from.balance=(from.balance||0)+amt}else if(t.type==='Expense'){if(!from)return false;if(from.type==='Credit Card'){from.outstanding=(from.outstanding||0)+amt;t.billId=generateBill(from,amt,t.date)}else from.balance=(from.balance||0)-amt}else if(t.type==='Transfer'){if(!from||!to)return false;let fee=Number(t.fee||0);if(from.type==='Credit Card')from.outstanding=Math.max(0,(from.outstanding||0)-amt);else from.balance=(from.balance||0)-amt-fee;if(to.type==='Credit Card')to.outstanding=Math.max(0,(to.outstanding||0)-amt);else to.balance=(to.balance||0)+amt}else if(t.type==='Card Payment'){if(from)from.balance=(from.balance||0)-amt;if(to)to.outstanding=Math.max(0,(to.outstanding||0)-amt);if(t.billId){let b=data.bills.find(x=>x.id===t.billId);if(b){b.remaining=Math.max(0,(b.remaining||0)-amt);b.status=b.remaining<=0?'Paid':'Partial'}}}return true}

function reverseTxn(t){let amt=Number(t.amount||0),from=data.accounts.find(a=>a.id===t.from),to=data.accounts.find(a=>a.id===t.to);if(t.type==='Income'){if(from)from.balance=(from.balance||0)-amt}else if(t.type==='Expense'){if(from&&from.type==='Credit Card'){from.outstanding=Math.max(0,(from.outstanding||0)-amt);adjustBill(t.billId,-amt)}else if(from)from.balance=(from.balance||0)+amt}else if(t.type==='Transfer'){let fee=Number(t.fee||0);if(from&&from.type==='Credit Card')from.outstanding=(from.outstanding||0)+amt;else if(from)from.balance=(from.balance||0)+amt+fee;if(to&&to.type==='Credit Card')to.outstanding=(to.outstanding||0)+amt;else if(to)to.balance=(to.balance||0)-amt}else if(t.type==='Card Payment'){if(from)from.balance=(from.balance||0)+amt;if(to)to.outstanding=(to.outstanding||0)+amt;adjustBill(t.billId,amt)}}

function saveTxn(){
  try{
    let amt=Number(amount||0);
    if(!amt || amt<=0) return alert('Enter amount');
    if(txnType==='Expense'&&!txn.from) return alert('Choose account');
    if(txnType==='Income'&&!txn.from) return alert('Choose deposit account');
    if(txnType==='Transfer'){
      if(!txn.from||!txn.to) return alert('Choose both accounts');
      if(txn.from===txn.to) return alert('From and To account cannot be the same.');
    }
    let old=editingTxn?data.txns.find(t=>t.id===editingTxn):null;
    let newTxn={
      id:editingTxn||uid(),
      type:txnType,
      amount:amt,
      fee:txnType==='Transfer'?Number(txn.fee||0):0,
      category:txnType==='Transfer'?'':(txn.category||'Other'),
      note:(document.getElementById('txnNote')?.value||'').trim(),
      date:txnIsoFromInput(document.getElementById('txnDate')?.value, old?.date),
      from:txn.from,
      to:txn.to
    };
    if(editingTxn){
      if(old) reverseTxn(old);
      if(!applyTxn(newTxn)){
        if(old) applyTxn(old);
        return alert('Unable to save transaction. Check accounts.');
      }
      data.txns=data.txns.map(t=>t.id===editingTxn?newTxn:t);
    }else{
      if(!applyTxn(newTxn)) return alert('Unable to save transaction. Check accounts.');
      data.txns.push(newTxn);
    }
    editingTxn=null;
    closeSheets();
    persist();
    if(typeof showToast==='function') showToast(old?'Transaction updated':'Transaction saved');
  }catch(e){
    console.error('Save transaction failed',e);
    alert('Save Transaction failed: '+(e&&e.message?e.message:e));
  }
}

function txnDate(t){return new Date(t.date||Date.now()).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}

function txnRow(t,compact=false){let s=txnSummary(t),canEdit=['Income','Expense','Transfer'].includes(t.type),note=t.note?`<div class="txnNoteLine">${escapeHtml(t.note)}</div>`:'';return `<div class="row txnRow txn-${s.tone}"><div class="txnMain"><div class="txnTitleLine"><span class="txnTypePill">${htmlText(s.label)}</span></div><div class="txnMeta">${txnDate(t)} - ${s.left}</div>${note}${compact?'':`<div class="txnActions">${canEdit?`<button class="tiny" onclick="openTxn('${jsString(t.id)}')">Edit</button>`:''}<button class="tiny danger" onclick="deleteTxn('${jsString(t.id)}')">Delete</button></div>`}</div><b class="txnAmount">${s.right}</b></div>`}

function txnSummary(t){let left='',right='',tone='neutral',label=t.type||'Entry';if(t.type==='Income'){left=htmlText(t.category||'Income')+' - Deposit to '+safeAccountLabel(t.from);right='+'+peso(t.amount);tone='income';label='Income'}else if(t.type==='Expense'){left=htmlText(t.category||'Expense')+' - '+safeAccountLabel(t.from);right='-'+peso(t.amount);tone='expense';label='Expense'}else if(t.type==='Transfer'){left=safeAccountLabel(t.from)+' to '+safeAccountLabel(t.to)+(Number(t.fee||0)?' - Fee '+peso(t.fee):'');right=peso(t.amount);tone='transfer';label='Transfer'}else if(t.type==='Card Payment'){left=safeAccountLabel(t.from)+' to '+safeAccountLabel(t.to);right='Paid '+peso(t.amount);tone='payment';label='Payment'}return {left,right,tone,label}}
