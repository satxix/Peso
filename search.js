/* PesoTrack search screen and shared transaction matching. Loaded before app.js. */
let searchFilter='All';

function setSearchFilter(f,el){
  searchFilter=f;
  document.querySelectorAll('.searchTabs button').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  renderGlobalSearch();
}

function resultIcon(kind,type){
  if(kind==='acct')return 'AC';
  if(kind==='bill')return 'DU';
  if(type==='Income')return 'IN';
  if(type==='Expense')return 'EX';
  if(type==='Transfer')return 'TR';
  return 'TX';
}

function searchableText(parts){
  return parts.filter(v=>v!==undefined&&v!==null).join(' ').toLowerCase();
}

function searchTransactions(q){
  return data.txns.slice().reverse().reduce((results,t)=>{
    let from=accountLabel(t.from),to=t.to?accountLabel(t.to):'',date=new Date(t.date).toLocaleDateString('en-PH');
    let hay=searchableText([t.type,t.category,t.note,from,to,peso(t.amount),date]);
    if(!q||hay.includes(q)){
      results.push({
        kind:'txn',
        type:t.type,
        title:`${t.type}${t.category?' - '+t.category:''}`,
        sub:`${from}${to?' to '+to:''} - ${date}${t.note?' - '+t.note:''}`,
        amount:Number(t.amount||0),
        id:t.id
      });
    }
    return results;
  },[]);
}

function searchAccounts(q){
  return data.accounts.reduce((results,a)=>{
    let hay=searchableText([a.name,a.institution,a.type,peso(a.balance),peso(a.outstanding)]);
    if(!q||hay.includes(q)){
      results.push({
        kind:'acct',
        title:a.name,
        sub:`${a.institution||a.type} - ${a.type}`,
        amount:a.type==='Credit Card'?Number(a.outstanding||0):Number(a.balance||0),
        id:a.id
      });
    }
    return results;
  },[]);
}

function searchBills(q){
  return data.bills.slice().sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).reduce((results,b)=>{
    let hay=searchableText([b.cardName,b.status,b.dueDate,peso(b.remaining)]);
    if(!q||hay.includes(q)){
      results.push({
        kind:'bill',
        title:b.cardName,
        sub:`Due ${b.dueDate} - ${billStatus(b)}`,
        amount:Number(b.remaining||0),
        id:b.id
      });
    }
    return results;
  },[]);
}

function searchResultAmountClass(r){
  if(r.kind==='txn'&&r.type==='Income')return 'green';
  if(r.kind==='txn'&&r.type==='Expense')return 'red';
  return '';
}

function searchResultHtml(r){
  return `<div class="resultCard"><div class="resultLeft"><div class="dot">${resultIcon(r.kind,r.type)}</div><div class="resultText"><b>${htmlText(r.title)}</b><div class="sub">${htmlText(r.sub)}</div></div></div><b class="${searchResultAmountClass(r)}">${peso(r.amount)}</b></div>`;
}

function renderGlobalSearch(){
  let out=document.getElementById('globalSearchResults');
  if(!out)return;
  let input=document.getElementById('globalSearchInput'),q=(input?.value||'').toLowerCase().trim(),results=[];
  if(searchFilter==='All'||searchFilter==='Transactions')results=results.concat(searchTransactions(q));
  if(searchFilter==='All'||searchFilter==='Accounts')results=results.concat(searchAccounts(q));
  if(searchFilter==='All'||searchFilter==='Bills')results=results.concat(searchBills(q));
  results=results.slice(0,!q&&searchFilter==='All'?15:40);
  out.innerHTML=results.length?results.map(searchResultHtml).join(''):`<div class="emptyCenter">${q?'No results found.':'Start typing to search your PesoTrack data.'}</div>`;
}

function txnMatches(t,q){
  if(!q)return true;
  let hay=searchableText([t.type,t.category,t.note,accountLabel(t.from),accountLabel(t.to),String(t.amount),txnDate(t)]);
  return hay.includes(q.toLowerCase());
}
