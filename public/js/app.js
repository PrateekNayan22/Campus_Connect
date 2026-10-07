// Data (students, communities, conversations) now comes from the backend - see api.js
const currentUser={interests:[]};
function smartMatch(s){const u=currentUser.interests.map(x=>x.toLowerCase()),t=s[3].map(x=>x.toLowerCase()),c=u.filter(x=>t.includes(x)).length,un=new Set([...u,...t]).size;return Math.max(60,Math.min(98,Math.round(62+(c/un)*28+c*8)));}
function matchReason(s){const u=currentUser.interests.map(x=>x.toLowerCase()),c=s[3].filter(x=>u.includes(x.toLowerCase()));return c.length?'AI found shared interests in '+c.join(', ')+'.':'AI found complementary skills for collaboration.';}
const students=[];
const communities=[];
function go(id){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
function mini(){document.getElementById('miniStudents').innerHTML=students.map(s=>`<div class="mini"><div class="row"><div class="av ${s[6]}">${s[0]}</div><div><div class="nm">${s[1]}</div><div class="sm">${s[2]}</div></div><div class="match">${smartMatch(s)}% Match</div></div><div class="chips">${s[3].map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>`).join('')}
function renderStudents(list=students){list=[...list].sort((a,b)=>smartMatch(b)-smartMatch(a));document.getElementById('studentGrid').innerHTML=list.map((s,i)=>`<div class="student"><div class="row"><div class="av ${s[6]}">${s[0]}</div><div><div class="nm">${s[1]}</div><div class="sm">${s[2]}</div></div><div class="match">${smartMatch(s)}% Match</div></div><div class="chips">${s[3].map(x=>`<span class="chip">${x}</span>`).join('')}</div><p>Recommended based on your interests, skills and collaboration goals.</p><div class="why"><b>✦ Why this match?</b><br>${matchReason(s)}</div><div class="studentfoot"><span class="active-dot">● Active recently</span><button class="connect" onclick="profile(${students.indexOf(s)})">Connect</button><button class="chatbtn" onclick="openChat('${s[1]}')">💬 Chat</button></div></div>`).join('')}
function filterStudents(){let q=document.getElementById('studentSearch').value.toLowerCase();renderStudents(students.filter(s=>(s[1]+' '+s[2]+' '+s[3].join(' ')).toLowerCase().includes(q)))}
function renderCommunities(){document.getElementById('commGrid').innerHTML=communities.map((c,i)=>`<div class="comm"><div class="cover">${c[0]}</div><h3>${c[1]}</h3><p>${c[2]} members · Active this week</p><div class="chips">${c[3].split(',').map(x=>`<span class="chip">${x}</span>`).join('')}</div><div class="bottom"><span class="active-dot">● Active</span><button class="secondary" onclick="openCommunity(${i})">Join Community</button></div></div>`).join('')}
function profile(i){
let s=students[i];
document.getElementById('modal').innerHTML=`<div class="modalhead"><b>Student Profile</b><button class="close" onclick="closeModal()">✕</button></div>
<div class="row" style="margin-top:15px"><div class="av ${s[6]}" style="width:72px;height:72px;font-size:18px">${s[0]}</div><div><h2 style="margin:0">${s[1]}</h2><div class="sm" style="font-size:13px">${s[2]}</div><div class="sm" style="color:var(--blue);font-weight:800">${s[7]}</div><div class="sm">🟢 Active recently</div></div></div>
<div class="profileActions"><button class="primary" id="profileConnectBtn" onclick="connectPerson(${i},true)">🤝 Connect</button><button class="chatbtn" onclick="closeModal();openChat('${s[1]}')">💬 Chat</button></div>
<div class='why'><b>AI Compatibility Score: ${smartMatch(s)}%</b><br>${matchReason(s)}</div><h3>About</h3><p class="sub" style="margin:0;text-align:left">Interested in ${s[3].join(', ')}. Currently looking to connect with students for projects, learning and collaboration.</p>
<h3>Skills & Interests</h3><div class="chips">${s[3].map(x=>`<span class="chip">${x}</span>`).join('')}</div>
<div class="why" style="margin-top:16px"><b>✦ Why you should connect</b><br>${matchReason(s)}</div>
<h3>Looking For</h3><p class="sm" style="font-size:13px">Hackathon teammates · Project collaborators · Like-minded peers</p>`;
document.getElementById('modalbg').style.display='grid'
}
function connectPerson(i,fromProfile=false){
let s=students[i];
if(fromProfile){
 let b=document.getElementById('profileConnectBtn');
 if(b){b.innerHTML='✓ Connection Request Sent';b.style.background='#16a34a'}
}else{
 alert('Connection request sent to '+s[1]+'!');
}
}

let conversations=[];
let activeConversation=null;
function ensureConversation(name){
 let s=students.find(x=>x[1]===name);
 let existing=conversations.find(c=>c.name===name);
 if(existing)return existing;
 let c={id:s?s[7]:'CCNEW',name:name,initial:s?s[0]:name.slice(0,2).toUpperCase(),style:s?s[6]:'',preview:'Start a conversation...',time:'Now',unread:false,messages:[]};
 conversations.unshift(c);return c;
}
function openDMByName(name){let c=ensureConversation(name);activeConversation=c.name;go('messages');renderDMList();renderDMChat(c.name)}
function renderDMList(){
 let q=(document.getElementById('dmSearch')?.value||'').toLowerCase();
 let list=conversations.filter(c=>(c.name+' '+c.id).toLowerCase().includes(q));
 document.getElementById('dmList').innerHTML=list.map(c=>`<div class="conversation ${activeConversation===c.name?'selected':''}" onclick="renderDMChat('${c.name}')"><div class="av ${c.style}">${c.initial}</div><div><div class="nm">${c.name}</div><div class="previewText">${c.preview}</div></div><div class="sm" style="margin-left:auto">${c.time}</div>${c.unread?'<span class="unread"></span>':''}</div>`).join('')||'<div class="sm">No conversations found.</div>';
}
function renderDMChat(name){
 let c=conversations.find(x=>x.name===name);if(!c)return;
 activeConversation=name;c.unread=false;
 document.getElementById('dmChat').innerHTML=`<div class="dmHeader"><div class="av ${c.style}">${c.initial}</div><div><div class="nm">${c.name}</div><div class="sm">🟢 Active recently · ${c.id}</div></div><button class="secondary" style="margin-left:auto;padding:8px 11px" onclick="profileByName('${c.name}')">View Profile</button></div><div class="dmMessages" id="dmMessages">${c.messages.map(m=>`<div class="msg ${m[0]}">${m[1]}</div>`).join('')}</div><div class="dmComposer"><input id="dmInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendDM()"><button class="primary" onclick="sendDM()">Send</button></div>`;
 renderDMList();
 setTimeout(()=>{let x=document.getElementById('dmMessages');if(x)x.scrollTop=x.scrollHeight},0);
}
function sendDM(){
 let input=document.getElementById('dmInput'),v=input.value.trim();if(!v)return;
 let c=conversations.find(x=>x.name===activeConversation);c.messages.push(['me',v]);c.preview=v;c.time='Now';input.value='';renderDMChat(c.name);
}
function profileByName(name){let i=students.findIndex(s=>s[1]===name);if(i>=0)profile(i)}

function homeSearch(){
 let q=(document.getElementById('homeSearchInput')?.value||'').trim().toLowerCase();
 let box=document.getElementById('homeSearchResults');
 if(!q){box.style.display='none';return;}
 let results=students.filter(s=>[s[1],s[2],s[3].join(' '),s[7]].join(' ').toLowerCase().includes(q)).slice(0,8);
 box.style.display='block';
 box.innerHTML=results.length?results.map(s=>`<div class="homeSearchResult" onclick="openSearchProfile(${students.indexOf(s)})"><div class="av ${s[6]}">${s[0]}</div><div><div class="nm">${s[1]}</div><div class="homeSearchMeta">${s[7]} · ${s[2]} · ${s[3].slice(0,2).join(', ')}</div></div><button class="secondary" style="margin-left:auto;padding:7px 10px;font-size:11px">View Profile</button></div>`).join(''):'<div class="sm" style="padding:16px">No students found. Try a name, skill, interest or Campus ID.</div>';
}

function globalSearch(){
 let input=document.getElementById('globalSearchInput');
 let q=(input.value||'').trim().toLowerCase();
 let box=document.getElementById('searchResults');
 if(!q){box.style.display='none';return;}
 let results=students.filter(s=>(s[1]+' '+s[7]).toLowerCase().includes(q));
 box.style.display='block';
 box.innerHTML=results.length?results.map(s=>`<div class="searchResult" onclick="openSearchProfile(${students.indexOf(s)})"><div class="av ${s[6]}">${s[0]}</div><div><div class="nm">${s[1]}</div><div class="rid">${s[7]}</div><div class="sm">${s[2]}</div></div></div>`).join(''):'<div class="sm" style="padding:12px">No student found. Try a name or Campus Connect ID.</div>';
}
function openSearchProfile(i){document.getElementById('searchResults').style.display='none';document.getElementById('globalSearchInput').value='';profile(i)}

function openChat(name){
let c=ensureConversation(name);
activeConversation=c.name;
go('messages');
renderDMList();
renderDMChat(c.name);
}
function sendMsg(){let i=document.getElementById('msgInput'),v=i.value.trim();if(v){document.querySelector('.messages').innerHTML+=`<div class="msg me">${v}</div>`;i.value=''}}
function closeModal(){document.getElementById('modalbg').style.display='none'}
function switchMainTab(t){document.getElementById('commSection').style.display=t==='c'?'block':'none';document.getElementById('teamSection').style.display=t==='t'?'block':'none';document.getElementById('ctab').classList.toggle('active',t==='c');document.getElementById('ttab').classList.toggle('active',t==='t')}
let currentCommunity=1,currentTab='overview',joinedCommunities={};
function openCommunity(i){currentCommunity=i;currentTab='overview';go('communityDetail');renderCommunityDetail()}
function joinCurrentCommunity(){
  joinedCommunities[currentCommunity]=true;
  currentTab='overview';
  renderCommunityDetail();
}
function communityTab(t,el){
  if(!joinedCommunities[currentCommunity] && t!=='overview'){
    alert('Please join this community to access Members, Discussions and Projects.');
    return;
  }
  currentTab=t;
  document.querySelectorAll('.cnav').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  renderCommunityDetail();
}
function renderCommunityDetail(){
let c=communities[currentCommunity];
document.getElementById('detailIcon').textContent=c[0];
document.getElementById('detailName').textContent=c[1];
let heroBtn=joinedCommunities[currentCommunity]
  ? '<button class="primary">✓ Joined</button>'
  : '<button class="primary" onclick="joinCurrentCommunity()">Join Community</button>';
document.querySelector('.communityhero > button').outerHTML=heroBtn;
let nav=document.querySelector('.communitynav');
nav.style.display=joinedCommunities[currentCommunity]?'flex':'none';
let out='';

if(!joinedCommunities[currentCommunity]){
  out=`<div class="communitycontent">
    <div>
      <div class="post">
        <div class="row"><div class="av">CC</div><div><div class="nm">${c[1]}</div><div class="sm">Community Preview</div></div></div>
        <h3>About this community</h3>
        <p>Explore students with shared interests, join discussions, discover collaboration opportunities and build meaningful connections around ${c[3].replace(',', ' and ')}.</p>
        <div class="chips">${c[3].split(',').map(x=>`<span class="chip">${x}</span>`).join('')}</div>
      </div>
      <div class="post">
        <h3>What can you do after joining?</h3>
        <p>✓ Connect with community members</p>
        <p>✓ Start private chats without sharing your phone number publicly</p>
        <p>✓ Participate in discussions</p>
        <p>✓ Discover projects and collaboration opportunities</p>
      </div>
    </div>
    <div>
      <div class="project">
        <h3>Community Snapshot</h3>
        <p class="sm">${c[2]} members</p>
        <p class="sm">🟢 Active this week</p>
        <p class="sm">8 active discussions</p>
        <p class="sm">3 collaboration opportunities</p>
        <button class="primary" style="width:100%;margin-top:12px" onclick="joinCurrentCommunity()">Join Community</button>
      </div>
    </div>
  </div>`;
  document.getElementById('communityContent').innerHTML=out;
  return;
}
if(currentTab==='overview')out=`<div class="post" style="background:#eff6ff;border-color:#bfdbfe"><b>✓ Welcome to ${c[1]}!</b><p style="margin-bottom:0">You can now connect with members, join discussions and explore collaboration projects.</p></div><div class="communitycontent"><div>
<div class="post" id="post1"><div class="row"><div class="av" style="cursor:pointer" onclick="profile(0)">AS</div><div style="cursor:pointer" onclick="profile(0)"><div class="nm">Aarav Sharma</div><div class="sm">2 hours ago</div></div></div><p>Anyone interested in building a project for the upcoming SIH? Looking for students with different skills!</p><div class="postactions"><button class="likebtn" onclick="toggleLike(this,'likes1')">👍 <span id="likes1">12</span> Likes</button><button class="commenttoggle" onclick="toggleComments('comments1')">💬 3 Comments</button></div><div class="comments" id="comments1"><div class="comment"><b>Priya Singh:</b> I'm interested! I can handle UI/UX.</div><div class="comment"><b>Rohan Kumar:</b> I can work on the frontend. Let's connect!</div><div class="comment"><b>Kavya Mehta:</b> Sounds interesting. What problem statement are you working on?</div><div class="commentinput"><input id="input1" placeholder="Write a comment..."><button class="primary" onclick="addComment('comments1','input1')">Post</button></div></div></div>
<div class="post" id="post2"><div class="row"><div class="av p" style="cursor:pointer" onclick="profile(1)">PS</div><div style="cursor:pointer" onclick="profile(1)"><div class="nm">Priya Singh</div><div class="sm">5 hours ago</div></div></div><p>Just completed my first AI prototype! Would love feedback from the community.</p><div class="postactions"><button class="likebtn" onclick="toggleLike(this,'likes2')">👍 <span id="likes2">18</span> Likes</button><button class="commenttoggle" onclick="toggleComments('comments2')">💬 3 Comments</button></div><div class="comments" id="comments2"><div class="comment"><b>Aarav Sharma:</b> Looks great! The idea has a lot of potential.</div><div class="comment"><b>Dev Malhotra:</b> Nice work! Would love to know which model you used.</div><div class="comment"><b>Ananya Verma:</b> This could become a really useful campus product.</div><div class="commentinput"><input id="input2" placeholder="Write a comment..."><button class="primary" onclick="addComment('comments2','input2')">Post</button></div></div></div>
</div><div><div class="project"><b>Community Activity</b><p class="sm">32 new discussions this week</p><p class="sm">8 active projects</p><p class="sm">14 new members joined</p></div></div></div>`;
if(currentTab==='members')out=`<div class="members"><h3>Community Members</h3>${students.map((s,i)=>`<div class="member"><div class="row"><div class="av ${s[6]}">${s[0]}</div><div><div class="nm">${s[1]}</div><div class="sm">${s[3].slice(0,2).join(' · ')}</div></div></div><div class="memberactions"><button class="connect smallbtn" onclick="profile(${i})">🤝 Connect</button><button class="chatbtn smallbtn" onclick="openChat('${s[1]}')">💬 Chat</button></div></div>`).join('')}</div>`;
if(currentTab==='discussions')out=`<div class="post"><h3>💬 Community Discussion</h3><div class="messages" style="height:330px"><div class="msg other"><b>Aarav:</b><br>Anyone interested in joining an AI project?</div><div class="msg other"><b>Priya:</b><br>I'm interested! I can handle UI/UX.</div><div class="msg other"><b>Rohan:</b><br>I can work on frontend.</div></div><div class="chatinput"><input placeholder="Write a message to the community..."><button class="primary">Send</button></div></div>`;
if(currentTab==='projects')out=`<div class="project"><div class="pill">LOOKING FOR COLLABORATORS</div><h3>🤖 AI Attendance System</h3><p class="sub" style="margin:0;text-align:left">Building an intelligent attendance solution using AI and face recognition concepts.</p><div class="need" style="margin-top:14px">Looking for: Backend Developer · UI/UX Designer</div><div class="chips"><span class="chip">AI</span><span class="chip">Web Development</span><span class="chip">Hackathon</span></div><button class="primary" style="margin-top:15px">Interested</button></div><div class="project"><div class="pill">OPEN PROJECT</div><h3>Campus Opportunity Finder</h3><p class="sub" style="margin:0;text-align:left">A platform to help students discover competitions, clubs and opportunities.</p><div class="need" style="margin-top:14px">Looking for: Frontend Developer</div><button class="primary" style="margin-top:15px">Interested</button></div>`;
document.getElementById('communityContent').innerHTML=out}
function toggleLike(btn,countId){
let count=document.getElementById(countId);
let n=parseInt(count.textContent);
if(btn.classList.contains('liked')){
 btn.classList.remove('liked');count.textContent=n-1;
}else{
 btn.classList.add('liked');count.textContent=n+1;
}
}
function toggleComments(id){
let box=document.getElementById(id);
box.style.display=box.style.display==='block'?'none':'block';
}
function addComment(containerId,inputId){
let input=document.getElementById(inputId),v=input.value.trim();
if(!v)return;
let el=document.createElement('div');
el.className='comment';
el.innerHTML='<b>You:</b> '+v;
document.getElementById(containerId).insertBefore(el,document.querySelector('#'+containerId+' .commentinput'));
input.value='';
}
function toggleAI(){let x=document.getElementById('assistantChat');x.style.display=x.style.display==='block'?'none':'block'}
mini();renderStudents();renderCommunities();renderDMList();
