function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function htmlText(v,fallback=''){let s=String(v??'').trim();return escapeHtml(s||fallback)}
function jsString(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' ')}
function safeClass(v){return String(v||'otherbank').replace(/[^a-z0-9_-]/gi,'')||'otherbank'}
const KEY='pesotrack2_real_foundation_v1';
const HERO_ACCOUNT_KEY='pesotrack2_home_focus_account';
function defaultCategories(){return ['Food','Groceries','Coffee','Dining','Transport','Gas','Parking','Shopping','Bills','Utilities','Rent','Internet','Phone','Health','Medicine','Insurance','Travel','Entertainment','Subscriptions','Education','Family','Pets','Gifts','Salary','Bonus','Freelance','Interest','Refund','Investment','Savings','Debt Payment','Credit Card','Transfer Fees','MP2','Other']}
function defaultPesoTrackData(){return {accounts:[],txns:[],bills:[],recurring:[],budgets:[],categories:defaultCategories(),categoryIcons:{},settings:{accent:'#6c63ff',privacy:false,weekStart:'1',currency:'PHP',dark:true,pinEnabled:false,pinHash:'',theme:'ocean'}}}
function safeLoadData(){try{return JSON.parse(localStorage.getItem(KEY)||JSON.stringify(defaultPesoTrackData()))}catch(e){console.warn('PesoTrack storage unavailable. Using in-memory data for this session.',e);return defaultPesoTrackData()}}
