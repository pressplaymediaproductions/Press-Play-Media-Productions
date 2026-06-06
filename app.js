

const typeIcon={music:'🎵',video:'🎬',photo:'📸'};
const typeThumb={music:'tm',video:'tv',photo:'tp'};
let nextId=20;
let videoPlaying=false;
let videoProgress=0;
let videoTimer=null;
let currentVideo=null;
let currentUser=null;
let currentProfile=null;

let state={content:[],merch:[],announcements:[],comments:{music:[],video:[],photo:[]}};

async function initApp(){
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(session?.user){
    currentUser=session.user;
    await loadProfile();
    showApp();
    await loadAllData();
  }else{
    showAuth();
  }
  supabaseClient.auth.onAuthStateChange(async (_event, session)=>{
    if(session?.user){
      currentUser=session.user;
      await loadProfile();
      showApp();
      await loadAllData();
    }else{
      currentUser=null; currentProfile=null; showAuth();
    }
  });
}

function showAuth(){
  document.getElementById('auth-panel').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('user-email').textContent='Not signed in';
}
function showApp(){
  document.getElementById('auth-panel').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-email').textContent=currentUser?.email || 'Signed in';
}
async function loadProfile(){
  const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
  if(error){ console.warn(error); currentProfile={role:'free'}; return; }
  currentProfile=data;
}
function isAdmin(){ return currentProfile?.role === 'admin'; }
function isPremium(){ return currentProfile?.role === 'premium' || currentProfile?.role === 'admin'; }

async function signUpEmail(){
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value.trim();
  if(!email||!password){toast('Enter email and password');return;}
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if(error){toast(error.message);return;}
  toast('Account created. Check email if confirmation is required.');
}
async function signInEmail(){
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value.trim();
  if(!email||!password){toast('Enter email and password');return;}
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error){toast(error.message);return;}
}
async function signInGoogle(){
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider:'google' });
  if(error) toast(error.message);
}
async function signOut(){ await supabaseClient.auth.signOut(); }

async function loadAllData(){
  await Promise.all([loadContent(), loadMerch(), loadAnnouncements(), loadComments()]);
  render();
}
async function loadContent(){
  const { data, error } = await supabaseClient.from('content').select('*').order('created_at',{ascending:false});
  if(error){console.error(error); toast('Could not load content'); return;}
  state.content=(data||[]).map(row=>({id:row.id,title:row.title,type:row.type,access:row.premium?'premium':'free',desc:row.description||row.file_url||'',file_url:row.file_url||''}));
}
async function loadMerch(){
  const { data, error } = await supabaseClient.from('merch').select('*').order('created_at',{ascending:false});
  if(error){console.error(error); return;}
  state.merch=(data||[]).map(row=>({id:row.id,name:row.name,price:row.price||0,emoji:row.image_url||'📦',desc:row.description||''}));
}
async function loadAnnouncements(){
  const { data, error } = await supabaseClient.from('announcements').select('*').order('created_at',{ascending:false});
  if(error){console.error(error); return;}
  state.announcements=(data||[]).map(row=>({id:row.id,title:row.title,tag:row.tag||'Update',date:(row.created_at||'').slice(0,10),body:row.body||''}));
}
async function loadComments(){
  const { data, error } = await supabaseClient.from('comments').select('*').order('created_at',{ascending:false});
  if(error){console.error(error); return;}
  state.comments={music:[],video:[],photo:[]};
  (data||[]).forEach(row=>{
    const section=row.section || 'music';
    if(!state.comments[section]) state.comments[section]=[];
    state.comments[section].push({id:row.id,name:row.username||'Fan',text:row.comment||'',time:new Date(row.created_at).toLocaleDateString(),likes:row.likes||0,liked:false});
  });
}

function switchView(view,el){
  if(view==='admin' && !isAdmin()){toast('Admin access only');return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('page-'+view).classList.add('active');
  el.classList.add('active');
  render();
}
function switchFanTab(tab,el){
  document.querySelectorAll('.fan-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.fan-section').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('fs-'+tab).classList.add('active');
  document.getElementById('page-fan').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function switchAdminTab(tab,el){
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.admin-section-page').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('ap-'+tab).classList.add('active');
  render();
}

function loadVideo(item){
  if(item.access==='premium'&&!isPremium()){toast('Premium content locked');return;}
  currentVideo=item;
  document.getElementById('now-playing-title').textContent=item.title;
  document.getElementById('video-info-title').textContent=item.title;
  document.getElementById('video-info-desc').textContent=item.desc||'';
  videoProgress=0;
  document.getElementById('progress-fill').style.width='0%';
  document.getElementById('vc-time').textContent='0:00';
  if(videoPlaying){clearInterval(videoTimer);}
  videoPlaying=false;
  document.getElementById('vc-play').textContent='▶';
  document.getElementById('play-btn').textContent='▶';
  toast('▶ Loaded: '+item.title);
}
function togglePlay(){
  if(!currentVideo){toast('Select a video from the list below');return;}
  videoPlaying=!videoPlaying;
  document.getElementById('vc-play').textContent=videoPlaying?'⏸':'▶';
  document.getElementById('play-btn').textContent=videoPlaying?'⏸':'▶';
  if(videoPlaying){
    videoTimer=setInterval(()=>{
      videoProgress=Math.min(videoProgress+0.4,100);
      document.getElementById('progress-fill').style.width=videoProgress+'%';
      const secs=Math.round(videoProgress*1.8);
      document.getElementById('vc-time').textContent=Math.floor(secs/60)+':'+(secs%60).toString().padStart(2,'0');
      if(videoProgress>=100){clearInterval(videoTimer);videoPlaying=false;document.getElementById('vc-play').textContent='▶';document.getElementById('play-btn').textContent='▶';}
    },300);
  }else{clearInterval(videoTimer);}
}
function seekVideo(e){
  const bar=e.currentTarget;
  const ratio=e.offsetX/bar.offsetWidth;
  videoProgress=ratio*100;
  document.getElementById('progress-fill').style.width=videoProgress+'%';
}

async function addComment(section){
  const text=document.getElementById(section+'-comment-text').value.trim();
  const name=document.getElementById(section+'-comment-name').value.trim()||'Fan';
  if(!text){toast('Write something first!');return;}
  const { error } = await supabaseClient.from('comments').insert([{username:name,comment:text,likes:0,section}]);
  if(error){console.error(error); toast('Comment not saved. Check comments table policy/columns.'); return;}
  document.getElementById(section+'-comment-text').value='';
  await loadComments(); renderComments(section); toast('Comment posted! ▶');
}
async function likeComment(section,id){
  const c=state.comments[section].find(c=>c.id===id);
  if(!c) return;
  const { error } = await supabaseClient.from('comments').update({likes:c.likes+1}).eq('id',id);
  if(error){toast('Could not like comment');return;}
  await loadComments(); renderComments(section);
}
function renderComments(section){
  const list=document.getElementById(section+'-comments');
  const count=document.getElementById(section+'-comment-count');
  if(count)count.textContent=state.comments[section].length;
  if(!list)return;
  if(!state.comments[section].length){list.innerHTML='<p style="font-size:13px;color:var(--muted);padding:8px 0;">No comments yet — be the first!</p>';return;}
  list.innerHTML=state.comments[section].map(c=>`
    <div class="comment-item">
      <div class="comment-top">
        <div class="comment-author"><div class="comment-avatar">${escapeHtml(c.name).charAt(0).toUpperCase()}</div><span class="comment-name">${escapeHtml(c.name)}</span></div>
        <span class="comment-time">${escapeHtml(c.time)}</span>
      </div>
      <div class="comment-text">${escapeHtml(c.text)}</div>
      <button class="comment-like" onclick="likeComment('${section}',${c.id})">♡ ${c.likes>0?c.likes+' like'+(c.likes>1?'s':''):'Like'}</button>
    </div>`).join('');
}

function render(){
  ['music','video','photo'].forEach(type=>{
    const el=document.getElementById('list-'+type);
    if(!el)return;
    const items=state.content.filter(c=>c.type===type);
    if(!items.length){el.innerHTML='<p class="empty-state">No content yet.</p>';return;}
    el.innerHTML=items.map(i=>`
      <div class="content-card ${i.access==='premium'&&!isPremium()?'locked':''}" onclick='openContent(${safeItemJson(i)})':'toast(\''+escapeJs(i.title)+(i.access==='premium'&&!isPremium()?' — Premium locked':'')+'\')'}">
        <div class="cthumb ${typeThumb[i.type]}">${typeIcon[i.type]}</div>
        <div class="cinfo"><div class="ctitle">${escapeHtml(i.title)}</div><div class="cmeta">${escapeHtml(i.desc||'')}</div></div>
        <span class="badge ${i.access==='premium'?'bp':'bf'}">${i.access==='premium'?'✦ Premium':'Free'}</span>
      </div>`).join('');
    renderComments(type);
  });
  const mg=document.getElementById('list-merch');
  if(mg){
    mg.innerHTML=state.merch.length?state.merch.map(m=>`
      <div class="merch-card"><div class="merch-img">${escapeHtml(m.emoji||'📦')}</div><div class="merch-info"><div class="merch-name">${escapeHtml(m.name)}</div><div class="merch-price">$${parseFloat(m.price||0).toFixed(2)}</div><div class="merch-desc">${escapeHtml(m.desc||'')}</div><button class="merch-buy" onclick="toast('Connect Stripe to enable checkout!')">Buy Now</button></div></div>`).join(''):'<p class="empty-state" style="grid-column:span 2">No merch yet.</p>';
  }
  const al=document.getElementById('list-announce');
  if(al){
    al.innerHTML=state.announcements.length?state.announcements.map(a=>`
      <div class="ann-card"><div class="ann-top"><span class="ann-tag">${escapeHtml(a.tag)}</span><span class="ann-date">${escapeHtml(a.date)}</span></div><div class="ann-title">${escapeHtml(a.title)}</div><div class="ann-body">${escapeHtml(a.body)}</div></div>`).join(''):'<p class="empty-state">No announcements yet.</p>';
  }
  const mc=document.getElementById('manage-content');
  if(mc){
    mc.innerHTML=state.content.length?state.content.map(i=>`
      <div class="mitem"><div class="micon">${typeIcon[i.type]}</div><div class="minfo"><div class="mtitle">${escapeHtml(i.title)}</div><div class="msub">${i.access==='premium'?'✦ Premium':'Free'} · ${escapeHtml(i.type)}</div></div><div class="mactions"><button class="abtn abtn-toggle" onclick="toggleAccess(${i.id})">${i.access==='premium'?'Make Free':'Make Premium'}</button><button class="abtn abtn-del" onclick="delContent(${i.id})">✕ Remove</button></div></div>`).join(''):'<p class="empty-state">No content published yet.</p>';
  }
  const mm=document.getElementById('manage-merch');
  if(mm){
    mm.innerHTML=state.merch.length?state.merch.map(m=>`
      <div class="mitem"><div class="micon">${escapeHtml(m.emoji||'📦')}</div><div class="minfo"><div class="mtitle">${escapeHtml(m.name)}</div><div class="msub">$${parseFloat(m.price||0).toFixed(2)} · ${escapeHtml(m.desc||'')}</div></div><div class="mactions"><button class="abtn abtn-del" onclick="delMerch(${m.id})">✕ Remove</button></div></div>`).join(''):'<p class="empty-state">No merch added yet.</p>';
  }
  const ma=document.getElementById('manage-announce');
  if(ma){
    ma.innerHTML=state.announcements.length?state.announcements.map(a=>`
      <div class="mitem"><div class="micon">📢</div><div class="minfo"><div class="mtitle">${escapeHtml(a.title)}</div><div class="msub">${escapeHtml(a.tag)} · ${escapeHtml(a.date)}</div></div><div class="mactions"><button class="abtn abtn-del" onclick="delAnn(${a.id})">✕ Remove</button></div></div>`).join(''):'<p class="empty-state">No announcements yet.</p>';
  }
  document.getElementById('st-content').textContent=state.content.length;
  document.getElementById('st-free').textContent=state.content.filter(c=>c.access==='free').length;
  document.getElementById('st-prem').textContent=state.content.filter(c=>c.access==='premium').length;
  document.getElementById('st-merch').textContent=state.merch.length;
}

async function addContent(){
  if(!isAdmin()){
    toast('Admin only');
    return;
  }

  const title = document.getElementById('u-title').value.trim();
  const type = document.getElementById('u-type').value;
  const access = document.getElementById('u-access').value;
  const desc = document.getElementById('u-desc').value.trim();
  const fileInput = document.getElementById('u-file');
  const externalUrl = document.getElementById('u-url')?.value.trim() || '';
  const file = fileInput?.files?.[0];

  if(!title){
    toast('Enter a title first');
    return;
  }

  let fileUrl = externalUrl;

  if(file){
    const bucket = type === 'music' ? 'Music' : type === 'video' ? 'Videos' : 'Gallery';
    const filePath = `${Date.now()}-${file.name.replaceAll(' ', '-')}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from(bucket)
      .upload(filePath, file);

    if(uploadError){
      console.error(uploadError);
      toast('File upload failed');
      return;
    }

    const { data: publicUrlData } = supabaseClient
      .storage
      .from(bucket)
      .getPublicUrl(filePath);

    fileUrl = publicUrlData.publicUrl;
  }

  const row = {
    title: title,
    type: type,
    premium: access === 'premium',
    file_url: fileUrl,
    description: desc
  };

  const { error } = await supabaseClient
    .from('content')
    .insert([row]);

  if(error){
    console.error(error);
    toast('Content not saved. Check policies.');
    return;
  }

  document.getElementById('u-title').value = '';
  document.getElementById('u-desc').value = '';
  if(fileInput) fileInput.value = '';
  const fileName = document.getElementById('u-file-name');
  if(fileName) fileName.textContent = 'Audio, video, or image';

  await loadContent();
  render();
  toast('▶ Content saved with file!');
}
async function addAnnouncement(){
  if(!isAdmin()){toast('Admin only');return;}
  const t=document.getElementById('an-title').value.trim();
  if(!t){toast('Enter a title first');return;}
  const { error }=await supabaseClient.from('announcements').insert([{title:t,tag:document.getElementById('an-tag').value,body:document.getElementById('an-body').value.trim()}]);
  if(error){console.error(error); toast('Announcement not saved.');return;}
  document.getElementById('an-title').value='';document.getElementById('an-body').value='';
  await loadAnnouncements(); render(); toast('▶ Announcement posted!');
}
async function addMerch(){
  if(!isAdmin()){toast('Admin only');return;}
  const n=document.getElementById('m-name').value.trim();
  const p=document.getElementById('m-price').value;
  if(!n||!p){toast('Enter name and price');return;}
  const { error }=await supabaseClient.from('merch').insert([{name:n,price:p,image_url:document.getElementById('m-emoji').value||'📦',description:document.getElementById('m-desc').value.trim()}]);
  if(error){console.error(error); toast('Merch not saved.');return;}
  document.getElementById('m-name').value='';document.getElementById('m-price').value='';document.getElementById('m-emoji').value='';document.getElementById('m-desc').value='';
  await loadMerch(); render(); toast('▶ Merch item saved!');
}
async function toggleAccess(id){
  if(!isAdmin()){toast('Admin only');return;}
  const i=state.content.find(c=>c.id===id);if(!i)return;
  const { error }=await supabaseClient.from('content').update({premium:i.access!=='premium'}).eq('id',id);
  if(error){toast('Could not update');return;}
  await loadContent();render();toast('Access updated!');
}
async function delContent(id){if(!isAdmin()){toast('Admin only');return;} const {error}=await supabaseClient.from('content').delete().eq('id',id); if(error){toast('Could not delete');return;} await loadContent();render();toast('Removed');}
async function delMerch(id){if(!isAdmin()){toast('Admin only');return;} const {error}=await supabaseClient.from('merch').delete().eq('id',id); if(error){toast('Could not delete');return;} await loadMerch();render();toast('Removed');}
async function delAnn(id){if(!isAdmin()){toast('Admin only');return;} const {error}=await supabaseClient.from('announcements').delete().eq('id',id); if(error){toast('Could not delete');return;} await loadAnnouncements();render();toast('Removed');}
function saveSettings(){
  const n=document.getElementById('s-name').value.trim();
  const tl=document.getElementById('s-tagline').value.trim();
  const jt=document.getElementById('s-jointext').value.trim();
  if(n)document.querySelector('.logo').innerHTML=escapeHtml(n);
  if(tl)document.getElementById('hero-tagline').textContent=tl;
  if(jt)document.getElementById('join-btn').textContent=jt;
  toast('▶ Settings saved locally for this browser');
}
function toast(msg){
  const el=document.getElementById('toastEl');
  el.textContent=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2400);
}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[m]));}
function escapeJs(s){return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');}
function safeItemJson(i){return JSON.stringify(i).replace(/"/g,'&quot;');}
function safeItemJson(i){
  return JSON.stringify(i).replace(/"/g,'&quot;');
}

function openContent(item){
  if(item.access === 'premium' && !isPremium()){
    toast('Premium content locked');
    return;
  }

  if(item.file_url){
    window.open(item.file_url, '_blank');
    return;
  }

  toast(item.title);
}

initApp();
initApp();
function openEmailModal(){
  document.getElementById('email-modal').classList.remove('hidden');
}

function closeEmailModal(){
  document.getElementById('email-modal').classList.add('hidden');
}

async function saveWaitlistEmail(){
  const email = document.getElementById('waitlist-email').value.trim();

  if(!email || !email.includes('@')){
    alert('Please enter a valid email.');
    return;
  }

  const { error } = await supabaseClient
    .from('email_subscribers')
    .insert([{ email }]);

  if(error){
    console.error(error);
    alert('Email not saved.');
    return;
  }

  alert('You are on the premium waitlist!');
  closeEmailModal();
}
