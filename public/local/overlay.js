
(function(){
const P=new URLSearchParams(location.search),$=id=>document.getElementById(id),rs=document.documentElement.style;
const maxMessages=+(P.get('max')||30);
if(P.get('size'))rs.setProperty('--font-size',P.get('size')+'px');
if(P.get('bg')==='1')document.body.classList.add('preview-bg');
if(P.get('width'))rs.setProperty('--panel-w',P.get('width')+'px');
if(P.get('maxheight'))rs.setProperty('--panel-max-h','min('+parseInt(P.get('maxheight'),10)+'px,calc(100vh - 48px))');
if(P.get('rosterwidth'))rs.setProperty('--roster-w',P.get('rosterwidth')+'px');
const rosterEnabled=P.get('roster')!=='0',maxRoster=+(P.get('rostermax')||80);
const win=$('window'),list=$('list'),dot=$('statusDot'),chLabel=$('channelLabel'),tabCount=$('tabCount'),
  rosterCol=$('rosterCol'),rosterList=$('rosterList'),rosterCount=$('rosterCount');
if(!rosterEnabled){rosterCol.style.display='none';win.classList.add('no-roster')}

const seen=new Set(),present=new Map(),avatarCache=new Map(),pending=new Set();
let ws=null,timer=null;
const C={mod:'#59c97a',vip:'#e04e4e',sub:'#a970ff',fol:'#4a9eff',none:'#8a959a'};
const statusCache=new Map(),queue=[];let qBusy=false,channel='',viewers=null;
function parseRoles(b){const l=(b||'').split(',').map(x=>x.split('/')[0]);return{mod:l.includes('moderator')||l.includes('broadcaster'),vip:l.includes('vip'),sub:l.includes('subscriber')||l.includes('founder')}}
function statusColor(d){const s=statusCache.get(d.login)||{};return d.mod?C.mod:d.vip?C.vip:(d.sub||s.sub)?C.sub:s.following?C.fol:C.none}
function queueStatus(l){if(!channel||statusCache.has(l))return;statusCache.set(l,{});queue.push(l);runQueue()}
async function hx(path){const r=await fetch('https://api.twitch.tv/helix/'+path,{headers:HX});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
async function helixFollow(l){
  if(!bId)bId=(await hx('users?login='+encodeURIComponent(channel))).data[0].id;
  const u=(await hx('users?login='+encodeURIComponent(l))).data[0];if(!u)return null;
  return (await hx('channels/followers?broadcaster_id='+bId+'&user_id='+u.id)).data.length>0;
}
async function runQueue(){
  if(qBusy)return;qBusy=true;
  while(queue.length){const l=queue.shift();let st={};
    try{const r=await fetch('https://api.ivr.fi/v2/twitch/subage/'+encodeURIComponent(l)+'/'+encodeURIComponent(channel));
      if(r.ok){const j=await r.json();st={following:!!j.followedAt,sub:j.subscribed===true||!!(j.meta&&j.meta.type)}}}catch(e){}
    statusCache.set(l,st);const d=present.get(l);if(d&&d.el)updateRow(d);
    await new Promise(r=>setTimeout(r,350));}
  qBusy=false;
}
async function pollViewers(){
  if(HX){try{const j=await hx('streams?user_login='+encodeURIComponent(channel));viewers=j.data[0]?j.data[0].viewer_count:0;updateCounts();return}catch(e){console.warn('Viewer lookup failed:',e.message)}}
  try{const r=await fetch('https://api.ivr.fi/v2/twitch/user?login='+encodeURIComponent(channel));const j=await r.json();const u=Array.isArray(j)?j[0]:j;
    if(u){const st=u.stream;viewers=st?(st.viewersCount??st.viewers??null):0;updateCounts()}}catch(e){}
}
function hashColor(n){let h=0;for(let i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return['#6fd7ff','#e8c165','#59c97a','#e07fd0','#a97fe0','#ff9e6d','#7fd6c2','#f2d675'][Math.abs(h)%8]}
function rgb(hex){const c=hex.replace('#','');return[0,2,4].map(i=>parseInt(c.substr(i,2),16))}
function readable(hex){let[r,g,b]=rgb(hex);if(.299*r+.587*g+.114*b>=110)return hex;
  return'#'+[r,g,b].map(v=>Math.round(v+(255-v)*.5).toString(16).padStart(2,'0')).join('')}
function contrast(hex){const[r,g,b]=rgb(hex);return .299*r+.587*g+.114*b>150?'#06090c':'#eef7fa'}
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function emotes(text,tag){
  if(!tag)return esc(text);
  const r=[];tag.split('/').forEach(g=>{const[id,pos]=g.split(':');if(pos)pos.split(',').forEach(p=>{const[s,e]=p.split('-').map(Number);r.push({id,s,e})})});
  r.sort((a,b)=>a.s-b.s);let out='',cur=0;
  r.forEach(x=>{if(x.s>cur)out+=esc(text.slice(cur,x.s));out+=`<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${x.id}/default/dark/2.0" alt="">`;cur=x.e+1});
  return out+esc(text.slice(cur));
}
async function fetchAvatar(l){try{const r=await fetch('https://api.ivr.fi/v2/twitch/user?login='+encodeURIComponent(l));if(!r.ok)return null;const d=await r.json();return d&&d[0]&&d[0].logo||null}catch(e){return null}}
function setImg(el,url){const i=new Image();i.onload=()=>{el.textContent='';el.appendChild(i)};i.src=url;i.alt=''}
function applyAvatar(el,l){
  if(avatarCache.has(l)){const u=avatarCache.get(l);if(u)setImg(el,u);return}
  if(pending.has(l))return;pending.add(l);
  fetchAvatar(l).then(u=>{avatarCache.set(l,u);pending.delete(l);if(u)document.querySelectorAll('.portrait[data-login="'+l+'"]').forEach(p=>setImg(p,u))});
}

function updateCounts(){tabCount.textContent=viewers!=null?viewers:(rosterEnabled?present.size:seen.size);rosterCount.textContent=present.size}
function updateRow(d){
  d.el.classList.toggle('spoken',d.spoken);
  d.nameEl.textContent=d.name;
  if(!d.pEl.querySelector('img'))d.pEl.textContent=d.name.charAt(0).toUpperCase();
  d.pEl.style.background=d.color;d.pEl.style.color=contrast(d.color);
  d.sEl.style.setProperty('--standing',statusColor(d));
}
function buildRow(l,d){
  d.el=document.createElement('li');d.el.className='roster-row';
  d.pEl=document.createElement('div');d.pEl.className='portrait';d.pEl.dataset.login=l;
  d.nameEl=document.createElement('span');d.nameEl.className='roster-name';
  d.sEl=document.createElement('span');d.sEl.className='standing';
  d.el.append(d.pEl,d.nameEl,d.sEl);applyAvatar(d.pEl,l);d.login=l;queueStatus(l);
}
function renderRoster(){
  if(!rosterEnabled)return;
  const e=[...present.entries()].sort((a,b)=>{const A=a[1],B=b[1];
    if(A.spoken!==B.spoken)return A.spoken?-1:1;return A.spoken?B.last-A.last:A.joined-B.joined});
  e.slice(maxRoster).forEach(([l,d])=>{if(d.el){d.el.remove();d.el=null}if(!d.spoken)present.delete(l)});
  e.slice(0,maxRoster).forEach(([l,d],i)=>{
    if(!d.el)buildRow(l,d);updateRow(d);
    const ref=rosterList.children[i];if(ref!==d.el)rosterList.insertBefore(d.el,ref||null);
  });
  updateCounts();
}
function upsert(login,name,color,spoke,badges){
  if(!rosterEnabled)return;login=login.toLowerCase();let d=present.get(login);const now=Date.now(),r=badges!=null?parseRoles(badges):null;
  if(!d){present.set(login,Object.assign({name:name||login,color:color||hashColor(login),spoken:!!spoke,joined:now,last:now},r||{}));return renderRoster()}
  let ch=false;
  if(spoke&&!d.spoken){d.spoken=true;ch=true}
  if(name&&name!==d.name){d.name=name;ch=true}
  if(color&&color!==d.color){d.color=color;ch=true}
  if(r&&(r.mod!==d.mod||r.vip!==d.vip||r.sub!==d.sub)){Object.assign(d,r);ch=true}
  d.last=now;if(ch)renderRoster();
}

// ----- chat -----
function addMessage(m){
  const login=m.user.toLowerCase();seen.add(login);
  const col=readable(/^#[0-9a-f]{6}$/i.test(m.color||'')?m.color:hashColor(m.user));
  const li=document.createElement('li');li.className='row';
  li.innerHTML=`<span class="who" style="color:${col}">${esc(m.user)}</span><span class="text">${emotes(m.text,m.emotes)}</span>`;
  list.appendChild(li);
  upsert(login,m.user,col,true,m.badges);updateCounts();
  let trimmed=false;
  while(list.children.length>maxMessages){list.removeChild(list.firstChild);trimmed=true}
  while(list.children.length>1&&list.scrollHeight>list.clientHeight){list.removeChild(list.firstChild);trimmed=true}
  if(trimmed)list.classList.add('overflowing');
}

// ----- IRC -----
function parse(line){
  let tags={},rest=line,prefix='';
  if(rest[0]==='@'){const i=rest.indexOf(' ');rest.slice(1,i).split(';').forEach(p=>{const k=p.indexOf('=');tags[p.slice(0,k)]=p.slice(k+1)});rest=rest.slice(i+1)}
  if(rest[0]===':'){const i=rest.indexOf(' ');prefix=rest.slice(1,i);rest=rest.slice(i+1)}
  const t=rest.indexOf(' :'),head=t<0?rest:rest.slice(0,t),trailing=t<0?'':rest.slice(t+2);
  return{tags,prefix,command:head.trim().split(' ')[0],trailing};
}
function handle(raw){
  raw.split('\r\n').filter(Boolean).forEach(line=>{
    if(line.startsWith('PING')){ws.send('PONG :tmi.twitch.tv');return}
    const m=parse(line),who=m.prefix.split('!')[0];
    if(m.command==='PRIVMSG')addMessage({user:m.tags['display-name']||who||'unknown',color:m.tags.color,badges:m.tags.badges,text:m.trailing,emotes:m.tags.emotes});
    else if(m.command==='001')dot.classList.add('live');
    else if(m.command==='353'){m.trailing.trim().split(/\s+/).filter(Boolean).forEach(n=>{n=n.toLowerCase();
      if(rosterEnabled&&!present.has(n))present.set(n,{name:n,color:hashColor(n),spoken:false,badge:null,joined:Date.now(),last:Date.now()})});renderRoster()}
    else if(m.command==='JOIN'&&who)upsert(who,who,null,false);
    else if(m.command==='PART'&&who&&rosterEnabled){const k=who.toLowerCase(),d=present.get(k);if(d){if(d.el)d.el.remove();present.delete(k);renderRoster()}}
  });
}
function connect(ch){
  ch=ch.trim().toLowerCase().replace(/^#/,'');chLabel.textContent=ch;channel=ch;clearTimeout(timer);
  ws=new WebSocket('wss://irc-ws.chat.twitch.tv:443');
  ws.onopen=()=>{ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');ws.send('NICK justinfan'+Math.floor(Math.random()*1e5));ws.send('JOIN #'+ch)};
  ws.onmessage=e=>handle(e.data);
  ws.onclose=()=>{dot.classList.remove('live');timer=setTimeout(()=>connect(ch),4000)};
  ws.onerror=()=>ws.close();
}
function start(ch){$('setup').style.display='none';win.classList.add('active');connect(ch);pollViewers();setInterval(pollViewers,30000)}
$('connectBtn').onclick=()=>{const v=$('channelInput').value.trim();if(!v){$('setupError').textContent='Enter a channel name.';return}start(v)};
$('channelInput').onkeydown=e=>{if(e.key==='Enter')$('connectBtn').click()};
if(P.get('channel'))start(P.get('channel'));
})();
