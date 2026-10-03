(()=>{
'use strict';
const $=id=>document.getElementById(id);
const pages=['Top','Settings','Tutorial','Room','Lobby','Game','Spectate','Result'];
const K={name:'sg_player_name',avatar:'sg_player_avatar',bgm:'sg_bgm',se:'sg_se',bgmPrev:'sg_bgm_prev',sePrev:'sg_se_prev',best:'sg_best'};
const colorNames=['赤','青','緑','黄','紫'];
const ROOM_ROOT='samegameRooms';
let toastTimer=null;
function show(p){pages.forEach(x=>$('page'+x).classList.toggle('hidden',x!==p));}
function toast(s,ms=2400){clearTimeout(toastTimer);const el=$('toast');el.textContent=s;el.classList.remove('hidden');toastTimer=setTimeout(()=>el.classList.add('hidden'),ms)}
function clearToast(){clearTimeout(toastTimer);$('toast').classList.add('hidden');$('toast').textContent=''}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function getName(){return (localStorage.getItem(K.name)||'Player').trim().slice(0,16)||'Player'}
function getAvatar(){return localStorage.getItem(K.avatar)||''}
function initials(n){return Array.from(n||'?').slice(0,2).join('')}
function avatarHTML(name,av,cls='avatar'){return `<div class="${cls}">${av?`<img src="${av}" alt="">`:esc(initials(name))}</div>`}
function syncTopProfile(){$('topProfile').innerHTML=avatarHTML(getName(),getAvatar())+`<div><div class="profileName">${esc(getName())}</div></div>`}

// ===== sound settings =====
function soundMarkup(kind){const label=kind==='bgm'?'BGM':'SE';return `<div class="settingTitle">${label}</div><div class="soundLine"><button id="${kind}Mute" class="soundIcon" type="button">🔊</button><input id="${kind}Range" type="range" min="0" max="100" value="70"><div class="soundValueWrap"><input id="${kind}Number" class="soundNumber" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="${label}音量"><span class="percentMark">%</span></div></div>`}
function mountSoundControls(target){target.innerHTML=soundMarkup('bgm')+soundMarkup('se');for(const kind of ['bgm','se'])bindSound(kind)}
function getStoredVolume(kind){return Math.max(0,Math.min(100,+(localStorage.getItem(K[kind])??(kind==='bgm'?70:80))))}
function setSound(kind,value,savePrev=true){value=Math.max(0,Math.min(100,Number(value)||0));localStorage.setItem(K[kind],String(value));if(value>0&&savePrev)localStorage.setItem(K[kind+'Prev'],String(value));document.querySelectorAll(`#${kind}Range`).forEach(r=>r.value=value);document.querySelectorAll(`#${kind}Number`).forEach(n=>n.value=value);document.querySelectorAll(`#${kind}Mute`).forEach(b=>b.textContent=value===0?'🔇':'🔊')}
function bindSound(kind){const r=$(kind+'Range'),n=$(kind+'Number'),m=$(kind+'Mute');if(!r||!n||!m)return;const v=getStoredVolume(kind);r.value=v;n.value=v;m.textContent=v===0?'🔇':'🔊';r.addEventListener('input',()=>setSound(kind,r.value));n.addEventListener('input',()=>{n.value=n.value.replace(/[^0-9]/g,'').slice(0,3)});const apply=()=>{if(n.value==='')n.value=getStoredVolume(kind);setSound(kind,Math.min(100,+n.value||0))};n.addEventListener('blur',apply);n.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();n.blur()}});m.addEventListener('click',()=>{const cur=getStoredVolume(kind);if(cur===0)setSound(kind,+(localStorage.getItem(K[kind+'Prev'])||(kind==='bgm'?70:80)));else{localStorage.setItem(K[kind+'Prev'],String(cur));setSound(kind,0,false)}})}
function setupSettings(){$('nameInput').value=getName()==='Player'?'':getName();renderAvatarPreview();mountSoundControls($('settingsSound'))}
function renderAvatarPreview(){$('avatarPreview').innerHTML=getAvatar()?`<img src="${getAvatar()}" alt="">`:esc(initials(getName()))}

// ===== avatar crop =====
let cropImage=null,cropScale=1,cropX=0,cropY=0,cropBaseScale=1,cropDragging=false,cropLastX=0,cropLastY=0;
function drawCrop(){if(!cropImage)return;const c=$('cropCanvas'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);const s=cropBaseScale*cropScale,dw=cropImage.naturalWidth*s,dh=cropImage.naturalHeight*s;ctx.drawImage(cropImage,(w-dw)/2+cropX,(h-dh)/2+cropY,dw,dh)}
async function openCrop(file){if(!file||!file.type.startsWith('image/'))throw Error('画像ファイルを選択してください');const url=URL.createObjectURL(file),img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});URL.revokeObjectURL(url);cropImage=img;cropScale=1;cropX=0;cropY=0;cropBaseScale=Math.max(300/img.naturalWidth,300/img.naturalHeight);$('cropZoom').value='1';drawCrop();$('cropModal').classList.remove('hidden')}
function saveCrop(){if(!cropImage)return;const src=$('cropCanvas'),out=document.createElement('canvas');out.width=out.height=128;out.getContext('2d').drawImage(src,0,0,300,300,0,0,128,128);localStorage.setItem(K.avatar,out.toDataURL('image/webp',.76));$('cropModal').classList.add('hidden');renderAvatarPreview();syncTopProfile();toast('アイコンを保存しました')}
function bindCrop(){const vp=$('cropViewport');$('cropZoom').addEventListener('input',e=>{cropScale=+e.target.value;drawCrop()});vp.addEventListener('pointerdown',e=>{cropDragging=true;cropLastX=e.clientX;cropLastY=e.clientY;vp.setPointerCapture(e.pointerId)});vp.addEventListener('pointermove',e=>{if(!cropDragging)return;cropX+=(e.clientX-cropLastX)*(300/vp.clientWidth);cropY+=(e.clientY-cropLastY)*(300/vp.clientHeight);cropLastX=e.clientX;cropLastY=e.clientY;drawCrop()});vp.addEventListener('pointerup',()=>cropDragging=false);vp.addEventListener('pointercancel',()=>cropDragging=false);$('cropCancel').onclick=()=>$('cropModal').classList.add('hidden');$('cropSave').onclick=saveCrop}

// ===== deterministic board pool =====
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^h>>>16)>>>0}}
function mulberry32(a){return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function rngFor(seed,index){return mulberry32(xmur3(seed+':'+index)())}
function poolIndex(seed,index){const n=BOARD_POOL.length,start=xmur3(seed)()%n,step=(xmur3(seed+':step')()%(n-1))+1;return(start+(index-1)*step)%n}
function generateBoard(seed,index){const s=BOARD_POOL[poolIndex(seed,index)],b=[];for(let y=0;y<CFG.ROWS;y++){b[y]=[];for(let x=0;x<CFG.COLS;x++)b[y][x]=+s[y*CFG.COLS+x]}return b}
function groupAt(b,sy,sx){const v=b?.[sy]?.[sx];if(v==null)return[];const q=[[sy,sx]],seen=new Set([sy+','+sx]),out=[];while(q.length){const [y,x]=q.shift();out.push([y,x]);for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){const ny=y+dy,nx=x+dx,k=ny+','+nx;if(ny>=0&&ny<CFG.ROWS&&nx>=0&&nx<CFG.COLS&&!seen.has(k)&&b[ny][nx]===v){seen.add(k);q.push([ny,nx])}}}return out}
function hasMove(b){for(let y=0;y<CFG.ROWS;y++)for(let x=0;x<CFG.COLS;x++)if(b[y][x]!=null&&groupAt(b,y,x).length>=2)return true;return false}
function remaining(b){return b.flat().filter(v=>v!=null).length}
function collapse(b){for(let x=0;x<CFG.COLS;x++){const vals=[];for(let y=CFG.ROWS-1;y>=0;y--)if(b[y][x]!=null)vals.push(b[y][x]);for(let y=CFG.ROWS-1,i=0;y>=0;y--)b[y][x]=i<vals.length?vals[i++]:null}const cols=[];for(let x=0;x<CFG.COLS;x++){let any=false;for(let y=0;y<CFG.ROWS;y++)if(b[y][x]!=null){any=true;break}if(any)cols.push(x)}const nb=Array.from({length:CFG.ROWS},()=>Array(CFG.COLS).fill(null));cols.forEach((old,nx)=>{for(let y=0;y<CFG.ROWS;y++)nb[y][nx]=b[y][old]});for(let y=0;y<CFG.ROWS;y++)for(let x=0;x<CFG.COLS;x++)b[y][x]=nb[y][x]}
function scoreFor(n){return Math.max(0,(n-2)*(n-2)*CFG.SCORE_UNIT)}
function penaltyFor(n){return n*(CFG.PENALTY_BASE+n)}
function generateMission(seed,index,board){const r=rngFor(seed+':mission',index);const choices=[];for(let c=0;c<CFG.COLORS;c++){let max=0;for(let y=0;y<CFG.ROWS;y++)for(let x=0;x<CFG.COLS;x++)if(board[y][x]===c)max=Math.max(max,groupAt(board,y,x).length);if(max>=4)choices.push({color:c,max})}const pick=choices[Math.floor(r()*choices.length)]||{color:Math.floor(r()*CFG.COLORS),max:4};const count=Math.max(4,Math.min(pick.max,4+Math.floor(r()*Math.max(1,Math.min(9,pick.max-3)))));return{color:pick.color,count,bonus:CFG.MISSION_BONUS_BASE+Math.max(0,count-5)*50,done:false}}
function missionText(m){return m?`ミッション：${colorNames[m.color]}を${m.count}個以上同時に消す　+${m.bonus}点${m.done?'　✓達成':''}`:''}

// ===== game state =====
let mode='single',seed='',boardIndex=1,board=[],mission=null,score=0,selected=[],startAt=0,timerId=null,finished=false;
let fbReady=false,myUid='',currentRoomKey='',currentRoom=null,currentPass='',roomUnsub=null,chatUnsub=null,spectating=false,spectateFocus='',returnedToLobby=false;
function renderBoard(el,b,mini=false,clickable=false,clickHandler=cellClick){el.innerHTML='';for(let y=0;y<CFG.ROWS;y++)for(let x=0;x<CFG.COLS;x++){const v=b?.[y]?.[x]??null,d=document.createElement(clickable?'button':'div');d.className=(mini?'miniCell ':'cell ')+(v==null?'empty':'c'+v);d.dataset.y=y;d.dataset.x=x;if(!mini&&el.id==='mainBoard'&&selected.some(([a,c])=>a===y&&c===x))d.classList.add('sel');if(clickable&&v!=null){d.type='button';d.addEventListener('click',clickHandler)}el.appendChild(d)}}
let inputLocked=false;
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function buildCollapsePlan(src,group){
  const gset=new Set(group.map(([y,x])=>y+','+x));
  const lab=src.map((row,y)=>row.map((v,x)=>v==null?null:{v,id:y+','+x,oy:y,ox:x}));
  for(const k of gset){const [y,x]=k.split(',').map(Number);lab[y][x]=null}
  const down=Array.from({length:CFG.ROWS},()=>Array(CFG.COLS).fill(null));
  for(let x=0;x<CFG.COLS;x++){let ty=CFG.ROWS-1;for(let y=CFG.ROWS-1;y>=0;y--)if(lab[y][x]){down[ty][x]=lab[y][x];ty--}}
  const liveCols=[];for(let x=0;x<CFG.COLS;x++)if(down.some(r=>r[x]))liveCols.push(x);
  const fin=Array.from({length:CFG.ROWS},()=>Array(CFG.COLS).fill(null));
  const pos=new Map();
  for(let y=0;y<CFG.ROWS;y++)for(let x=0;x<CFG.COLS;x++){const o=down[y][x];if(o)pos.set(o.id,{dropY:y,dropX:x,finalY:y,finalX:x})}
  liveCols.forEach((oldX,newX)=>{for(let y=0;y<CFG.ROWS;y++){const o=down[y][oldX];if(o){fin[y][newX]=o.v;const p=pos.get(o.id);p.finalX=newX}}});
  return{finalBoard:fin,pos};
}
async function animateBoardMove(el,src,group){
  const cells=[...el.querySelectorAll('.cell')];
  const byKey=new Map(cells.map(d=>[d.dataset.y+','+d.dataset.x,d]));
  group.forEach(([y,x])=>byKey.get(y+','+x)?.classList.add('removing'));
  el.classList.add('animating');
  await sleep(120);await sleep(30);
  const plan=buildCollapsePlan(src,group);
  // Grid pitch must be measured from fixed neighbouring cells.
  // Using the first visible block breaks as soon as upper rows become empty,
  // causing wrong/negative Y distances and bizarre diagonal/sideways motion.
  const r00=byKey.get('0,0')?.getBoundingClientRect();
  const r01=byKey.get('0,1')?.getBoundingClientRect();
  const r10=byKey.get('1,0')?.getBoundingClientRect();
  const stepX=r00&&r01?r01.left-r00.left:(el.clientWidth/CFG.COLS);
  const stepY=r00&&r10?r10.top-r00.top:(el.clientHeight/CFG.ROWS);
  for(const [id,p] of plan.pos){const d=byKey.get(id);if(!d)continue;const [oy,ox]=id.split(',').map(Number);d.classList.add('moving');d.style.transitionDuration='200ms';d.style.transform=`translate(${(p.dropX-ox)*stepX}px,${(p.dropY-oy)*stepY}px)`}
  await sleep(200);await sleep(30);
  for(const [id,p] of plan.pos){const d=byKey.get(id);if(!d)continue;const [oy,ox]=id.split(',').map(Number);d.style.transitionDuration='180ms';d.style.transform=`translate(${(p.finalX-ox)*stepX}px,${(p.finalY-oy)*stepY}px)`}
  await sleep(180);
  el.classList.remove('animating');
  return plan.finalBoard;
}
function renderSelfProfile(){$('selfMiniProfile').innerHTML=avatarHTML(getName(),getAvatar())+`<div><div class="name">${esc(getName())}</div><div class="tiny">${mode==='single'?'SINGLE':'MULTI'}</div></div>`}
function renderGame(){renderBoard($('mainBoard'),board,false,true);$('scoreEl').textContent=score.toLocaleString();$('boardIndexEl').textContent=`ステージ${boardIndex}`;$('missionEl').textContent=missionText(mission);$('missionEl').classList.toggle('done',!!mission?.done);$('bestEl').textContent=mode==='single'?`BEST ${(+(localStorage.getItem(K.best)||0)).toLocaleString()}`:'';checkStuck();renderSelfProfile();if(mode==='multi')pushState()}
async function cellClick(e){
  if(finished||inputLocked)return;
  const y=+e.currentTarget.dataset.y,x=+e.currentTarget.dataset.x,g=groupAt(board,y,x);
  if(g.length<2){selected=[];$('boardNote').textContent='2個以上つながった色を選択';renderBoard($('mainBoard'),board,false,true);return}
  const same=selected.length===g.length&&g.every(([a,b])=>selected.some(([c,d])=>a===c&&b===d));
  if(!same){selected=g;$('boardNote').textContent=`${g.length}個選択　もう一度タップで消去（+${scoreFor(g.length)}点）`;renderBoard($('mainBoard'),board,false,true);return}
  inputLocked=true;
  const color=board[y][x],oldBoard=board.map(r=>r.slice());
  score+=scoreFor(g.length);
  if(!mission.done&&color===mission.color&&g.length>=mission.count){mission.done=true;score+=mission.bonus;toast(`ミッション達成 +${mission.bonus}点`)}
  board=await animateBoardMove($('mainBoard'),oldBoard,g);
  selected=[];$('boardNote').textContent=`${g.length}個消去`;
  renderGame();inputLocked=false;
}
function checkStuck(){const rem=remaining(board),stuck=rem===0||!hasMove(board);$('nextBoardBtn').classList.toggle('hidden',!stuck||finished);if(stuck&&!finished){const pen=penaltyFor(rem);$('nextBoardBtn').textContent=`次の盤面へ（残ブロック減点 ${pen===0?'0':'-'+pen}点）`;$('boardNote').textContent=rem===0?'全消し！ 次の盤面へ進めます':`消せる組み合わせなし：残り${rem}個`}}
function nextBoard(){if(finished)return;const rem=remaining(board);score=Math.max(0,score-penaltyFor(rem));boardIndex++;board=generateBoard(seed,boardIndex);mission=generateMission(seed,boardIndex,board);selected=[];renderGame();toast(`ステージ${boardIndex}へ`)}
function startGame(opts){mode=opts.mode;seed=opts.seed||crypto.randomUUID();boardIndex=opts.boardIndex||1;board=generateBoard(seed,boardIndex);mission=generateMission(seed,boardIndex,board);score=0;selected=[];finished=false;returnedToLobby=false;startAt=opts.startAt||Date.now();show('Game');clearToast();$('opponentArea').classList.toggle('hidden',mode!=='multi');renderGame();clearInterval(timerId);timerId=setInterval(tick,250);tick()}
function tick(){const left=Math.max(0,CFG.TIME_LIMIT_SEC-Math.floor((Date.now()-startAt)/1000));$('timerEl').textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;if(left<=0)finishPlayer()}
function finishPlayer(){if(finished)return;finished=true;clearInterval(timerId);selected=[];$('nextBoardBtn').classList.add('hidden');$('boardNote').textContent=mode==='multi'?'プレイ終了。ほかのプレイヤーを待っています':'終了';if(mode==='single'){const best=+(localStorage.getItem(K.best)||0);if(score>best)localStorage.setItem(K.best,String(score));showResult([{name:getName(),avatar:getAvatar(),score,boardIndex}],false)}else if(currentRoomKey){firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}/players/${myUid}`).update({score,finished:true,status:'集計待ち',board,boardIndex,mission,updatedAt:firebase.database.ServerValue.TIMESTAMP})}}

// ===== tutorial =====
let tutorialIndex=0,tutorialBoard=[],tutorialSelected=false,tutorialBusy=false;
function emptyBoard(){return Array.from({length:CFG.ROWS},()=>Array(CFG.COLS).fill(null))}
function tutorialSetup(step){
  tutorialIndex=step;tutorialSelected=false;tutorialBusy=false;$('tutorialNext').classList.add('hidden');
  const b=emptyBoard();
  if(step===0){b[10][4]=0;b[11][4]=0;b[11][5]=0;$('tutorialStep').textContent='STEP 1 / 3';$('tutorialText').textContent='つながった同じ色を選び、もう一度タップして消します。';$('tutorialGuide').textContent='↓ ここをタップ';$('tutorialNote').textContent='まず赤いかたまりを1回タップ'}
  if(step===1){b[8][4]=2;b[9][4]=1;b[10][4]=1;b[11][4]=1;b[7][4]=3;$('tutorialStep').textContent='STEP 2 / 3';$('tutorialText').textContent='下のブロックを消すと、上のブロックが落下します。';$('tutorialGuide').textContent='↓ ここをタップ';$('tutorialNote').textContent='青い3個を消して落下を確認'}
  if(step===2){for(let y=9;y<12;y++)b[y][3]=4;for(let y=9;y<12;y++){b[y][4]=0;b[y][5]=2}$('tutorialStep').textContent='STEP 3 / 3';$('tutorialText').textContent='列が空になると、右側の列が左へ詰まります。';$('tutorialGuide').textContent='↓ ここをタップ';$('tutorialNote').textContent='紫の列を消して左詰めを確認'}
  tutorialBoard=b;renderTutorial();
}
function tutorialTargetGroup(){if(tutorialIndex===0)return groupAt(tutorialBoard,11,4);if(tutorialIndex===1)return groupAt(tutorialBoard,10,4);return groupAt(tutorialBoard,10,3)}
function renderTutorial(){
  renderBoard($('tutorialBoard'),tutorialBoard,false,true,tutorialClick);
  const tg=tutorialTargetGroup();for(const [y,x] of tg){$('tutorialBoard').querySelector(`[data-y="${y}"][data-x="${x}"]`)?.classList.add('tutorialTarget');}
  if(tutorialSelected)for(const [y,x] of tg){$('tutorialBoard').querySelector(`[data-y="${y}"][data-x="${x}"]`)?.classList.add('sel')}
}
async function tutorialClick(e){
  if(tutorialBusy)return;const y=+e.currentTarget.dataset.y,x=+e.currentTarget.dataset.x,tg=tutorialTargetGroup();
  if(!tg.some(([a,b])=>a===y&&b===x)){toast('光っているブロックをタップしてください',1200);return}
  if(!tutorialSelected){tutorialSelected=true;$('tutorialGuide').textContent='↓ もう一度ここをタップ';$('tutorialNote').textContent='選択できました。もう一度タップで消去';renderTutorial();return}
  tutorialBusy=true;const old=tutorialBoard.map(r=>r.slice());tutorialBoard=await animateBoardMove($('tutorialBoard'),old,tg);tutorialSelected=false;renderTutorial();$('tutorialGuide').textContent='✓ 確認できました';
  if(tutorialIndex===0)$('tutorialNote').textContent='同じ色の塊は2回タップで消します';
  if(tutorialIndex===1)$('tutorialNote').textContent='上のブロックが下へ落ちました';
  if(tutorialIndex===2)$('tutorialNote').textContent='空いた列の右側が左へ移動しました';
  $('tutorialNext').textContent=tutorialIndex===2?'チュートリアル終了':'次へ';$('tutorialNext').classList.remove('hidden');tutorialBusy=false;
}
function startTutorial(){show('Tutorial');clearToast();tutorialSetup(0)}
// ===== firebase =====
async function initFirebase(){try{if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);const cred=await firebase.auth().signInAnonymously();myUid=cred.user.uid;fbReady=true;$('onlineStatus').textContent='● オンライン';$('onlineStatus').className='status ok';toast('準備完了')}catch(e){console.error(e);$('onlineStatus').textContent='● 接続失敗';$('onlineStatus').className='status warn';toast('オンライン機能に接続できません')}}
async function passHash(s){const data=new TextEncoder().encode(s),h=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')}
function validPass(s){const a=Array.from(s);if(a.length<1||a.length>8)return false;return /^[A-Za-z0-9@._+\-/\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]+$/u.test(s)}
function playerData(){return{name:getName(),avatar:getAvatar(),score:0,finished:false,returned:false,status:'待機中',board:null,boardIndex:1,mission:null,joinedAt:firebase.database.ServerValue.TIMESTAMP}}
async function createRoom(pass){if(!fbReady)throw Error('オンライン未接続');const key=await passHash(pass),ref=firebase.database().ref(`${ROOM_ROOT}/${key}`),snap=await ref.once('value');if(snap.exists())throw Error('同じ合言葉のルームが使用中です');const s=crypto.randomUUID();await ref.set({version:'1.02',status:'waiting',hostUid:myUid,seed:s,timeLimit:CFG.TIME_LIMIT_SEC,passLabel:pass,createdAt:firebase.database.ServerValue.TIMESTAMP,players:{[myUid]:playerData()}});enterLobby(key,pass)}
async function findRoom(pass){const key=await passHash(pass),snap=await firebase.database().ref(`${ROOM_ROOT}/${key}`).once('value');if(!snap.exists())throw Error('ルームが見つかりません');return{key,data:snap.val(),pass}}
async function joinRoom(key,pass){const ref=firebase.database().ref(`${ROOM_ROOT}/${key}`),snap=await ref.once('value'),r=snap.val();if(!r||r.status!=='waiting')throw Error('参加受付中ではありません');const count=Object.keys(r.players||{}).length;if(count>=CFG.MAX_PLAYERS)throw Error(`参加枠は最大${CFG.MAX_PLAYERS}人です。観戦してください`);await ref.child(`players/${myUid}`).set(playerData());enterLobby(key,pass)}
function enterLobby(key,pass){currentRoomKey=key;currentPass=pass||currentPass;returnedToLobby=false;show('Lobby');clearToast();$('lobbyPass').textContent=currentPass||'参加済み';subscribeRoom();subscribeChat()}
function subscribeRoom(){if(roomUnsub){roomUnsub();roomUnsub=null}const ref=firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}`),cb=s=>{const r=s.val();if(!r){toast('ルームが終了しました');cleanupRoom();show('Top');return}currentRoom=r;renderLobby(r);if(spectating){renderSpectate(r);if(r.status==='result')showSharedResult(r,true);return}if(r.status==='playing'&&!finished&&mode!=='multi'){startGame({mode:'multi',seed:r.seed,startAt:r.startAt})}if(r.status==='playing'&&mode==='multi')renderOpponents();if(r.status==='result'&&!returnedToLobby)showSharedResult(r,false);if(r.status==='waiting')returnedToLobby=false};ref.on('value',cb);roomUnsub=()=>ref.off('value',cb)}
function renderLobby(r){const ps=Object.entries(r.players||{}).sort((a,b)=>(a[1].joinedAt||0)-(b[1].joinedAt||0));$('lobbyPass').textContent=currentPass||r.passLabel||'参加済み';$('lobbyState').textContent=r.status==='waiting'?`参加者 ${ps.length}/${CFG.MAX_PLAYERS}`:r.status==='result'?'結果確認中':r.status;$('lobbyPlayers').innerHTML=ps.map(([uid,p])=>`<div class="playerCard">${avatarHTML(p.name,p.avatar)}<b>${esc(p.name)}</b><div class="tiny">${uid===r.hostUid?'ホスト':'参加者'}${p.returned?' / 復帰済み':''}</div></div>`).join('');const host=r.hostUid===myUid;$('startMatch').classList.toggle('hidden',!host||ps.length<2||r.status!=='waiting')}
async function startMatch(){if(!currentRoomKey||!currentRoom)return;const updates={status:'playing',startAt:Date.now()+3000,seed:crypto.randomUUID(),resultAt:null};Object.keys(currentRoom.players||{}).forEach(uid=>{updates[`players/${uid}/score`]=0;updates[`players/${uid}/finished`]=false;updates[`players/${uid}/returned`]=false;updates[`players/${uid}/status`]='ゲーム中';updates[`players/${uid}/board`]=null;updates[`players/${uid}/boardIndex`]=1;updates[`players/${uid}/mission`]=null});await firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}`).update(updates);mode='none';toast('3秒後に開始',1800)}
async function pushState(){if(!currentRoomKey||!myUid||mode!=='multi')return;firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}/players/${myUid}`).update({score,board,boardIndex,mission,finished:false,status:'ゲーム中',updatedAt:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{})}
function renderOpponents(){const r=currentRoom;if(!r)return;const others=Object.entries(r.players||{}).filter(([uid])=>uid!==myUid);$('opponentArea').classList.toggle('hidden',others.length===0);const grid=$('opponentGrid');grid.innerHTML='';others.forEach(([uid,p])=>{const card=document.createElement('div');card.className='oppCard';card.innerHTML=`<div class="miniBoard"></div><div class="oppMeta">${avatarHTML(p.name,p.avatar)}<div class="grow"><div class="oppName">${esc(p.name)}</div><div class="oppState">${esc(p.finished?'集計待ち':'ゲーム中')}</div></div><div class="oppScore">${(+p.score||0).toLocaleString()}</div></div>`;renderBoard(card.querySelector('.miniBoard'),p.board||generateBoard(r.seed,p.boardIndex||1),true,false);grid.appendChild(card)})}
async function maybeFinalize(r){if(!r||r.status!=='playing')return;const ps=Object.values(r.players||{});if(ps.length>=2&&ps.every(p=>p.finished))await firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}`).update({status:'result',resultAt:firebase.database.ServerValue.TIMESTAMP})}
function showSharedResult(r,isSpectator){clearInterval(timerId);const arr=Object.values(r.players||{}).map(p=>({name:p.name,avatar:p.avatar,score:+p.score||0,boardIndex:+p.boardIndex||1})).sort((a,b)=>b.score-a.score);showResult(arr,!isSpectator);$('resultBack').textContent=isSpectator?'観戦を終了':'ルームへ戻る'}
function showResult(arr,returnRoom){show('Result');$('resultRows').innerHTML=arr.map((p,i)=>`<div class="resultRow">${avatarHTML(p.name,p.avatar)}<div><b>${i+1}位 ${esc(p.name)}</b><div class="stageReached">ステージ${p.boardIndex}到達</div></div><div class="resultScore">${p.score.toLocaleString()}点</div></div>`).join('');$('resultBack').dataset.returnRoom=returnRoom?'1':'0'}
async function returnToLobbyFromResult(){if(!currentRoomKey||spectating){cleanupRoom();show('Top');return}returnedToLobby=true;show('Lobby');clearToast();await firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}/players/${myUid}`).update({returned:true,status:'待機中'});const snap=await firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}`).once('value'),r=snap.val();if(r&&r.status==='result'){const ps=Object.values(r.players||{});if(ps.length&&ps.every(p=>p.returned)){const updates={status:'waiting',resultAt:null};Object.keys(r.players||{}).forEach(uid=>{updates[`players/${uid}/finished`]=false;updates[`players/${uid}/returned`]=false;updates[`players/${uid}/status`]='待機中';updates[`players/${uid}/board`]=null;updates[`players/${uid}/mission`]=null});await firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}`).update(updates)}}}

// ===== chat =====
function subscribeChat(){
  if(chatUnsub){chatUnsub();chatUnsub=null}
  const ref=firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}/chat`).limitToLast(CFG.CHAT_LIMIT);
  const cb=s=>{
    const rows=[];
    s.forEach(ch=>{const v=ch.val();if(v&&typeof v.text==='string')rows.push(v)});
    const log=$('chatLog');
    log.innerHTML=rows.map(m=>`<div class="chatMsg"><b>${esc(m.name)}：</b>${esc(m.text)}</div>`).join('');
    log.scrollTop=log.scrollHeight;
  };
  ref.on('value',cb);
  chatUnsub=()=>ref.off('value',cb);
}
let chatSending=false;
async function sendChat(text){
  text=String(text||'').trim().slice(0,80);
  if(!text||!currentRoomKey||chatSending)return false;
  chatSending=true;
  try{
    const msgRef=firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}/chat`).push();
    await msgRef.set({uid:myUid,name:getName(),text,at:firebase.database.ServerValue.TIMESTAMP});
    return true;
  }finally{
    chatSending=false;
  }
}

// ===== spectate =====
function startSpectate(key,pass){currentRoomKey=key;currentPass=pass||'';spectating=true;show('Spectate');clearToast();subscribeRoom()}
function renderSpectate(r){const entries=Object.entries(r.players||{});if(!entries.length)return;if(!spectateFocus||!r.players[spectateFocus])spectateFocus=entries[0][0];const fp=r.players[spectateFocus],fb=fp.board||generateBoard(r.seed,fp.boardIndex||1);$('spectateMission').textContent=missionText(fp.mission||generateMission(r.seed,fp.boardIndex||1,fb));$('spectateBigMeta').innerHTML=avatarHTML(fp.name,fp.avatar)+`<div class="grow"><div class="oppName">${esc(fp.name)}</div><div class="oppState">ステージ${fp.boardIndex||1}</div></div><div class="oppScore">${(+fp.score||0).toLocaleString()}点</div>`;renderBoard($('spectateBigBoard'),fb,false,false);const g=$('spectateGrid');g.innerHTML='';entries.forEach(([uid,p])=>{const box=document.createElement('button');box.type='button';box.className='spectateMini';box.style.color='inherit';box.innerHTML=`<div class="tiny">${esc(p.name)} / ${(+p.score||0).toLocaleString()}点</div><div class="miniBoard"></div>`;renderBoard(box.querySelector('.miniBoard'),p.board||generateBoard(r.seed,p.boardIndex||1),true,false);box.onclick=()=>{spectateFocus=uid;renderSpectate(r)};g.appendChild(box)})}

async function leaveRoom(){if(currentRoomKey&&myUid&&!spectating){try{const roomRef=firebase.database().ref(`${ROOM_ROOT}/${currentRoomKey}`);await roomRef.child(`players/${myUid}`).remove();const snap=await roomRef.child('players').once('value');if(!snap.exists())await roomRef.remove()}catch(e){console.error(e)}}cleanupRoom();show('Top')}
function cleanupRoom(){if(roomUnsub){roomUnsub();roomUnsub=null}if(chatUnsub){chatUnsub();chatUnsub=null}currentRoomKey='';currentRoom=null;currentPass='';spectating=false;spectateFocus='';returnedToLobby=false;mode='single';finished=false;clearInterval(timerId);clearToast()}

// periodic finalize check
setInterval(()=>{if(currentRoom&&currentRoom.status==='playing'){if(mode==='multi')renderOpponents();maybeFinalize(currentRoom)}},500);

// ===== UI bindings =====
$('singleBtn').onclick=()=>startGame({mode:'single',seed:crypto.randomUUID(),startAt:Date.now()});
let roomIntent='create',foundRoom=null;
$('createBtn').onclick=()=>{roomIntent='create';foundRoom=null;$('roomTitle').textContent='ルーム作成';$('roomPrompt').textContent='合言葉を設定してください。';$('roomAction').textContent='ルーム作成';$('roomFound').classList.add('hidden');$('passInput').value='';show('Room');clearToast()};
$('joinBtn').onclick=()=>{roomIntent='join';foundRoom=null;$('roomTitle').textContent='ルーム参加';$('roomPrompt').textContent='合言葉を入力してルームを検索します。';$('roomAction').textContent='検索';$('roomFound').classList.add('hidden');$('passInput').value='';show('Room');clearToast()};
$('roomAction').onclick=async()=>{const p=$('passInput').value;if(!validPass(p)){toast('合言葉は1〜8文字。絵文字・空白・未許可記号は使えません');return}try{if(roomIntent==='create')await createRoom(p);else{foundRoom=await findRoom(p);$('roomFound').classList.remove('hidden');toast('ルームが見つかりました',1800)}}catch(e){toast(e.message||String(e))}};
$('participateBtn').onclick=async()=>{try{await joinRoom(foundRoom.key,foundRoom.pass)}catch(e){toast(e.message||String(e))}};
$('spectateBtn').onclick=()=>startSpectate(foundRoom.key,foundRoom.pass);
$('tutorialBtn').onclick=startTutorial;
$('tutorialBack').onclick=()=>{show('Top');clearToast()};
$('tutorialNext').onclick=()=>{if(tutorialIndex>=2){show('Top');clearToast()}else tutorialSetup(tutorialIndex+1)};
$('settingsBtn').onclick=()=>{setupSettings();show('Settings');clearToast()};
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{show('Top');syncTopProfile();clearToast()});
$('nameInput').addEventListener('input',()=>{const n=$('nameInput').value.trim().slice(0,16);if(n)localStorage.setItem(K.name,n);else localStorage.removeItem(K.name);renderAvatarPreview();syncTopProfile()});
$('avatarInput').onchange=async()=>{try{const f=$('avatarInput').files[0];if(f)await openCrop(f)}catch(e){toast('画像処理に失敗しました')}finally{$('avatarInput').value=''}};
$('avatarRemove').onclick=()=>{localStorage.removeItem(K.avatar);renderAvatarPreview();syncTopProfile()};
$('creditBtn').onclick=()=>$('creditBox').classList.toggle('hidden');
$('nextBoardBtn').onclick=nextBoard;
$('startMatch').onclick=startMatch;
$('leaveLobby').onclick=leaveRoom;
$('leaveSpectate').onclick=()=>{cleanupRoom();show('Top')};
$('quitGame').onclick=()=>{if(mode==='multi')finishPlayer();else{clearInterval(timerId);show('Top')}};
$('resultBack').onclick=returnToLobbyFromResult;
$('chatForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const inp=$('chatInput'),t=inp.value;
  if(!t.trim())return;
  try{
    const ok=await sendChat(t);
    if(ok){inp.value='';inp.focus()}
  }catch(err){
    console.error('chat send failed',err);
    toast('送信に失敗しました。もう一度送信してください');
    inp.focus();
  }
});
$('battleSettingsBtn').onclick=()=>{mountSoundControls($('battleSound'));$('battleSettingsModal').classList.remove('hidden')};
$('battleSettingsClose').onclick=()=>$('battleSettingsModal').classList.add('hidden');

bindCrop();syncTopProfile();initFirebase();
})();
