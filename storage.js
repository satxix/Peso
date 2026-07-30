function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function htmlText(v,fallback=''){let s=String(v??'').trim();return escapeHtml(s||fallback)}
function jsString(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' ')}
function safeClass(v){return String(v||'otherbank').replace(/[^a-z0-9_-]/gi,'')||'otherbank'}
const KEY='pesotrack2_real_foundation_v1';
const HERO_ACCOUNT_KEY='pesotrack2_home_focus_account';
const PESOTRACK_DB_NAME='PesoTrackDB';
const PESOTRACK_DB_VERSION=1;
const PESOTRACK_STATE_STORE='appState';
const PESOTRACK_STATE_KEY='main';
const PESOTRACK_MIGRATION_KEY='pesotrack_idb_migrated_v1';
function defaultCategories(){return ['Food','Groceries','Coffee','Dining','Transport','Gas','Parking','Shopping','Bills','Utilities','Rent','Internet','Phone','Health','Medicine','Insurance','Travel','Entertainment','Subscriptions','Education','Family','Pets','Gifts','Salary','Bonus','Freelance','Interest','Refund','Investment','Savings','Debt Payment','Credit Card','Transfer Fees','MP2','Other']}
function defaultPesoTrackData(){return {accounts:[],txns:[],bills:[],recurring:[],budgets:[],categories:defaultCategories(),categoryIcons:{},settings:{accent:'#6c63ff',privacy:false,weekStart:'1',currency:'PHP',dark:true,pinEnabled:false,pinHash:'',theme:'ocean'}}}
function safeLoadData(){try{return JSON.parse(localStorage.getItem(KEY)||JSON.stringify(defaultPesoTrackData()))}catch(e){console.warn('PesoTrack storage unavailable. Using in-memory data for this session.',e);return defaultPesoTrackData()}}

let indexedWriteQueue=Promise.resolve();

function validPesoTrackData(value){
  return !!value&&typeof value==='object'&&
    Array.isArray(value.accounts)&&Array.isArray(value.txns)&&
    Array.isArray(value.bills);
}

function clonePesoTrackData(value){
  if(typeof structuredClone==='function')return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function openPesoTrackDB(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    let request=indexedDB.open(PESOTRACK_DB_NAME,PESOTRACK_DB_VERSION);
    request.onupgradeneeded=()=>{
      let db=request.result;
      if(!db.objectStoreNames.contains(PESOTRACK_STATE_STORE)){
        db.createObjectStore(PESOTRACK_STATE_STORE);
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not open IndexedDB'));
    request.onblocked=()=>reject(new Error('IndexedDB upgrade was blocked'));
  });
}

async function readIndexedData(){
  let db=await openPesoTrackDB();
  try{
    return await new Promise((resolve,reject)=>{
      let request=db.transaction(PESOTRACK_STATE_STORE,'readonly')
        .objectStore(PESOTRACK_STATE_STORE).get(PESOTRACK_STATE_KEY);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Could not read IndexedDB'));
    });
  }finally{
    db.close();
  }
}

async function writeIndexedData(snapshot){
  let db=await openPesoTrackDB();
  try{
    await new Promise((resolve,reject)=>{
      let transaction=db.transaction(PESOTRACK_STATE_STORE,'readwrite');
      transaction.objectStore(PESOTRACK_STATE_STORE).put(snapshot,PESOTRACK_STATE_KEY);
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(transaction.error||new Error('Could not write IndexedDB'));
      transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB write was aborted'));
    });
  }finally{
    db.close();
  }
}

async function initializeIndexedStorage(fallbackData){
  let stored=await readIndexedData();
  if(validPesoTrackData(stored))return stored;

  let snapshot=clonePesoTrackData(fallbackData);
  await writeIndexedData(snapshot);
  let verified=await readIndexedData();
  if(!validPesoTrackData(verified))throw new Error('IndexedDB migration verification failed');
  try{localStorage.setItem(PESOTRACK_MIGRATION_KEY,new Date().toISOString())}catch(e){}
  return verified;
}

function saveDataSnapshot(value){
  let snapshot=clonePesoTrackData(value);
  indexedWriteQueue=indexedWriteQueue.catch(()=>{}).then(()=>writeIndexedData(snapshot));
  return indexedWriteQueue.catch(error=>{
    try{localStorage.setItem(KEY,JSON.stringify(snapshot))}catch(e){}
    throw error;
  });
}

function resetStoredData(value){
  let snapshot=clonePesoTrackData(value);
  try{localStorage.setItem(KEY,JSON.stringify(snapshot))}catch(e){}
  return saveDataSnapshot(snapshot);
}
