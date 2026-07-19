/* PesoTrack bills, credit card statements, settlement flow, and recurring items. Loaded before app.js. */
function billStatus(b){let remaining=Number(b.remaining??b.amount??0),amount=Number(b.amount??remaining);return remaining<=0?'Paid':(remaining<amount?'Partial':'Unpaid')}

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
  const q=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' ');
  const billRows=rows=>rows&&rows.length?'<div class="ccStatementList">'+rows.slice(0,4).map(b=>'<div class="ccStatementMini compactStatement"><div><b class="statementPeriod">'+esc(compactBillPeriod(b))+'</b><span class="sub">Due '+esc(displayDate(b.dueDate))+'</span></div><div class="statementAmt"><b>'+peso(b.remaining||0)+'</b><span class="statusPill '+statusClass(billStatus(b))+'">'+billStatus(b)+'</span></div></div>').join('')+'</div>':'';
  let cards=(data.accounts||[]).filter(isCreditCardAccount);
  const groupedBills={};
  (data.bills||[]).filter(b=>billStatus(b)!=='Paid'&&Number(b.remaining||b.amount||0)>0).forEach(b=>{let acct=accountForCardBill(b,cards);let key=acct?acct.id:(b.cardId||b.cardName||'Card Statement');if(!groupedBills[key])groupedBills[key]=[];groupedBills[key].push(b)});
  Object.values(groupedBills).forEach(rows=>rows.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)));
  let cardsWithBills=cards.filter(a=>groupedBills[a.id]&&groupedBills[a.id].length);
  let virtualCards=Object.entries(groupedBills).filter(([key])=>!cardsWithBills.some(a=>a.id===key)).map(([key,rows])=>{let open=rows.find(b=>billStatus(b)!=='Paid')||rows[0]||{};return {id:key,name:open.cardName||key||'Credit Card',institution:'Statement record',type:'Credit Card',limit:0,outstanding:rows.filter(b=>billStatus(b)!=='Paid').reduce((s,b)=>s+Number(b.remaining||0),0),_virtual:true,_bills:rows}});
  let allCards=cardsWithBills.concat(virtualCards).sort((a,b)=>{let ar=a._bills||groupedBills[a.id]||[],br=b._bills||groupedBills[b.id]||[];let ad=ar.find(x=>billStatus(x)!=='Paid')||ar[0]||{},bd=br.find(x=>billStatus(x)!=='Paid')||br[0]||{};let at=new Date(ad.dueDate||8640000000000000).getTime(),bt=new Date(bd.dueDate||8640000000000000).getTime();let ao=Number(a.outstanding||0)||ar.reduce((s,x)=>s+Number(x.remaining||0),0),bo=Number(b.outstanding||0)||br.reduce((s,x)=>s+Number(x.remaining||0),0);return (at-bt)||(bo-ao)||String(a.name||'').localeCompare(String(b.name||''))});
  if(!allCards.length){el.innerHTML='<div class="billSetupCard"><b>No card bills to settle</b><p>Credit card accounts will appear here only when there is an unpaid statement or settlement due.</p></div>';return;}
  el.innerHTML=allCards.map(card=>{
    let rows=card._bills||groupedBills[card.id]||[];
    let nearest=rows.find(b=>billStatus(b)!=='Paid')||null;
    let statementDay=Number(card.statementDay||0),dueDay=Number(card.dueDay||0),limit=Number(card.limit||0);
    let hasSchedule=statementDay&&dueDay&&!card._virtual;
    let st=hasSchedule?nextStatementDate(card):null,due=hasSchedule?dueFromStatement(card,st):null;
    let out=Number(card.outstanding||0)||rows.filter(b=>billStatus(b)!=='Paid').reduce((s,b)=>s+Number(b.remaining||0),0);
    let util=limit?Math.min(100,(out/limit)*100):0,avail=Math.max(0,limit-out);
    let dd=nearest?daysUntilDate(nearest.dueDate):(due?daysUntilDate(due):null);
    let dueText=nearest?'Due '+displayDate(nearest.dueDate):(due?'Next due '+displayDate(due):(card._virtual?'From statement records':'Add statement and due days'));
    let progClass=util>=80?'danger':util>=50?'warn':'';
    let pill=nearest?(dd<0?'Overdue':dd===0?'Due today':dd+'d left'):(due?'No bill':(card._virtual?'Statement':'Setup needed'));
    let dueTone=dd===null?'':(dd<0||dd<=2?'danger':dd<=7?'warn':'');
    let icon=card._virtual?'<div class="bank otherbank">CC</div>':logo(card);
    let primary=nearest?'<button class="primary" onclick="openSettle(\''+q(nearest.id)+'\')">Settle</button>':'<button class="primary" onclick="closeSheets();openTxn()">Add Purchase</button>';
    let secondary=card._virtual?'<button onclick="openAddAccount()">Create Account</button>':'<button onclick="openAccountDetail(\''+q(card.id)+'\')">'+((!statementDay||!dueDay||!limit)?'Finish Setup':'Details')+'</button>';
    let activeStatement=nearest?(nearest.statementDate||nearest.periodEnd||st):st;
    let activeDue=nearest?nearest.dueDate:due;
    return '<div class="premiumCreditCard"><div class="premiumCreditHeader"><div class="premiumCreditLeft">'+icon+'<div style="min-width:0"><div class="premiumCreditTitle">'+esc(card.name||'Credit Card')+'</div><div class="premiumCreditSub '+((!statementDay||!dueDay||!limit)&&!card._virtual?'missing':'')+'">'+esc(card.institution||'Credit Card')+' - '+esc(dueText)+'</div></div></div><span class="premiumDuePill '+dueTone+'">'+pill+'</span></div><div class="premiumCreditBody"><div class="premiumCreditMain"><span>Outstanding</span><b>'+peso(out)+'</b><div class="premiumProgress '+progClass+'" style="margin-top:12px"><i style="width:'+util+'%"></i></div><div class="premiumMetaRow" style="margin-top:9px"><span>'+(limit?util.toFixed(0)+'% used':'Limit missing')+'</span><span>'+(limit?peso(avail)+' available':'Add limit')+'</span></div></div><div class="premiumCreditSide"><div><span>Limit</span><b>'+(limit?peso(limit):'Add')+'</b></div><div><span>Available</span><b>'+(limit?peso(avail):'Add')+'</b></div><div><span>Statement</span><b>'+(activeStatement?displayDate(activeStatement):'Add')+'</b></div><div><span>Due date</span><b>'+(activeDue?displayDate(activeDue):'Add')+'</b></div></div></div>'+billRows(rows)+'<div class="premiumCreditActions">'+secondary+primary+'</div></div>';
  }).join('');
}

function renderBills(){
  renderCreditCenter();
}

function adjustBill(id,delta){if(!id)return;let b=data.bills.find(x=>x.id===id);if(!b)return;b.amount=Math.max(0,(b.amount||0)+delta);b.remaining=Math.max(0,(b.remaining||0)+delta);b.status=b.remaining<=0?'Paid':(b.remaining<b.amount?'Partial':'Unpaid')}

function generateBill(card,amt,forDate){let now=forDate?new Date(forDate):new Date();if(isNaN(now.getTime()))now=new Date();let y=now.getFullYear(),m=now.getMonth(),sd=card.statementDay||1,dd=card.dueDay||1;let st=new Date(y,m,sd);if(now>st)st=new Date(y,m+1,sd);let due=new Date(st.getFullYear(),st.getMonth()+(dd<=sd?1:0),dd);let prev=new Date(st.getFullYear(),st.getMonth()-1,sd+1);let id=card.id+'-'+st.toISOString().slice(0,10);let b=data.bills.find(x=>x.id===id);if(!b){b={id,cardId:card.id,cardName:card.name,periodStart:prev.toISOString().slice(0,10),periodEnd:st.toISOString().slice(0,10),statementDate:st.toISOString().slice(0,10),dueDate:due.toISOString().slice(0,10),amount:0,remaining:0,status:'Unpaid'};data.bills.push(b)}b.cardName=card.name;b.amount+=amt;b.remaining+=amt;b.status=billStatus(b);return id}

function setPayAmount(mode){if(!settling)return;document.querySelectorAll('.payMode').forEach(b=>b.classList.remove('active'));let btn=document.querySelector(`[data-paymode="${mode}"]`);if(btn)btn.classList.add('active');if(mode==='full')payAmount.value=Number(settling.remaining||0);if(mode==='half')payAmount.value=Math.ceil(Number(settling.remaining||0)/2);if(mode==='custom'){payAmount.focus();payAmount.select()}}

function openSettle(id){settling=data.bills.find(b=>b.id===id);if(!settling){alert('This bill is no longer available to settle.');return}let detail=document.getElementById('accountDetailSheet');if(detail)detail.classList.remove('show');let banks=data.accounts.filter(a=>a.type!=='Credit Card');let card=data.accounts.find(a=>a.id===settling.cardId)||{};settleBody.innerHTML=`<div class="paySummary"><div class="small">${settling.cardName}</div><h3 style="margin:6px 0 2px">${peso(settling.remaining)}</h3><div class="sub">Due ${settling.dueDate} - ${billPeriod(settling)}</div></div>${banks.length?`<label class="small">Pay from</label><select class="field" id="payFrom">${banks.map(a=>`<option value="${a.id}">${a.name} (${a.institution}) - ${peso(a.balance||0)}</option>`).join('')}</select><div class="paymentModes"><button class="payMode active" data-paymode="full" onclick="setPayAmount('full')">Full remaining</button><button class="payMode" data-paymode="half" onclick="setPayAmount('half')">Half</button></div><label class="small">Payment amount</label><input class="field" id="payAmount" type="number" value="${settling.remaining}"><button class="save" onclick="settleBill()">Record Payment</button>`:'<div class="empty">Add a Savings, Wallet, Cash, or Investment account first so you can choose where the payment comes from.</div>'}<div class="payHistory"><div class="small">Previous payments</div>${billPayments(settling).length?billPayments(settling).map(p=>`<div class="historyRow"><span>${txnDate(p)} - ${accountLabel(p.from)}</span><b>${peso(p.amount)}</b></div>`).join(''):'<div class="sub">No payments recorded yet.</div>'}</div>`;showModal();settleSheet.classList.add('show')}

function settleBill(){let a=data.accounts.find(x=>x.id===payFrom.value),card=data.accounts.find(x=>x.id===settling.cardId),amt=Number(payAmount.value||0);if(!a||!card||!amt)return alert('Choose account and amount');if(amt>Number(settling.remaining||0)&&!confirm('Payment is higher than the remaining bill. Continue?'))return;let t={id:uid(),type:'Card Payment',amount:amt,date:new Date().toISOString(),from:a.id,to:card.id,billId:settling.id};applyTxn(t);data.txns.push(t);persist();closeSheets()}

function accountOptionsForRecurring(type,selected=''){let arr=data.accounts.filter(a=>type==='Income'?a.type!=='Credit Card':true);return arr.map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${a.name} (${a.institution||a.type}) - ${a.type==='Credit Card'?'Outstanding '+peso(a.outstanding||0):'Balance '+peso(a.balance||0)}</option>`).join('')}

function renderRecurringFields(r={}){
  let type=recType.value;
  let selected=recurringDraftCategory||r.category||(type==='Income'?'Salary':'Food');
  recurringDraftCategory=selected;
  recDynamic.innerHTML='<label class="small">'+(type==='Income'?'Deposit to':'Pay from')+'</label><select class="field" id="recAccount">'+accountOptionsForRecurring(type,r.accountId||'')+'</select><input type="hidden" id="recCategory" value="'+htmlText(selected)+'"><button type="button" id="recCategoryPick" class="txnPickBtn wide" onclick="chooseRecurringCat()"><div class="catCircle">'+catIcon(selected)+'</div><div class="txnPickText"><b>'+(type==='Income'?'Source':'Category')+'</b><span>'+htmlText(selected)+'</span><em>Recurring '+(type==='Income'?'income source':'expense category')+'</em></div></button>';
}

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

function toggleRecurring(id){let r=data.recurring.find(x=>x.id===id);if(!r)return;r.enabled=!(r.enabled!==false);persist()}
