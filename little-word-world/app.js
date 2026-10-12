import {WORDS,WORLDS,STORIES,LEVELS,LETTER_NAMES,wordById,freshProgress,sanitizeProgress,shuffle,choicesFor,nextWord,completeWord,chapterDone,validateLetter,MISSIONS,BOOKS,supportFor,recordReading,reviewWord,prepareMission,actMission,WORD_GAMES,currentGameRound,createWordGame,chooseWordGame,sentenceNextWords,nextWordGameRound,completeWordGame} from './model.js?v=wordgames2';
import {LocalHelper,storyFromPlan,fallbackPlan} from './local-ai.js?v=wordgames2';

const $=s=>document.querySelector(s);
const KEY='little-word-world-v1';
let storageAvailable=true;
let progress=freshProgress();try{const raw=localStorage.getItem(KEY);try{progress=sanitizeProgress(JSON.parse(raw));}catch{}}catch{storageAvailable=false;}
let wordPlay=null,wordPlayDrag=null;
let bookView=null,crossing=false,journey=false,missionDrag=null;
let screen='home',quest=null,modal=null,activeAudio=null,audioToken=0,audioContext=null,toastTimer=null,transitionTimer=null,returnFocus=null,aiStory=null;
const helper=new LocalHelper(updateAIStatus);
const icons={
 leaf:'<path d="M5 19C2 8 10 3 21 3c0 11-5 17-14 16M5 21 16 9"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',back:'<path d="m14 5-7 7 7 7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
 sound:'<path d="M11 4 5 9H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="M11 4 5 9H2v6h3l6 5V4Zm5 5 5 6m-5 0 5-6"/>',
 book:'<path d="M12 5C8 2 3 3 2 4v15c3-2 6-1 10 1 4-2 7-3 10-1V4c-3-1-6-2-10 1Zm0 0v15"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
 heart:'<path d="M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-5 4 0 10 8 16 8-6 13-12 8-16Z"/>',
 check:'<path d="m5 12 4 4L20 5"/>',star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3"/>',
 spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.leaf}</svg>`;
const sprite=(id,extra='')=>{const w=wordById(id);return `<span class="sprite ${extra}" role="img" aria-label="${id}" style="background-position:${w.sprite%3*50}% ${Math.floor(w.sprite/3)*50}%"></span>`;};
const pip=(extra='')=>`<span class="pip-actor ${extra}" role="img" aria-label="Pip, your little field mouse guide"></span>`;
const btn=(action,label,cls='soft-button',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
function save(){try{localStorage.setItem(KEY,JSON.stringify(progress));storageAvailable=true;}catch{storageAvailable=false;}}
let audioResolve=null;
function stopAudio(){audioToken++;if(activeAudio){activeAudio.pause();activeAudio=null;}window.speechSynthesis?.cancel();const done=audioResolve;audioResolve=null;done?.();document.querySelectorAll?.('.speaking').forEach(el=>el.classList.remove('speaking'));}
function speak(key,text,replace=true){
 if(replace)stopAudio();if(progress.muted)return Promise.resolve();const token=audioToken;
 return new Promise(resolve=>{
  let settled=false,watchdog;
  const done=()=>{if(settled)return;settled=true;clearTimeout(watchdog);if(audioResolve===done)audioResolve=null;resolve();};audioResolve=done;
  const fallback=()=>{
   if(settled||token!==audioToken||progress.muted){done();return;}
   if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;u.pitch=1.08;u.onend=done;u.onerror=done;window.speechSynthesis.speak(u);}else done();
  };
  watchdog=setTimeout(done,15000);
  if(!key){fallback();return;}
  const url=`assets/audio/${key}.mp3?v=wordgames2`;
  const a=new Audio(globalThis.__LWW_AUDIO__?.[key]||url);activeAudio=a;a.volume=.82;a.onended=done;a.onerror=fallback;a.play().catch(fallback);
 });
}
function tone(type='tap'){
 if(progress.muted)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const t=audioContext.currentTime;
 const notes=type==='win'?[523.25,659.25,783.99,1046.5]:type==='right'?[587,783]:[420];
 notes.forEach((n,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=n;g.gain.setValueAtTime(0,t+i*.1);g.gain.linearRampToValueAtTime(.055,t+i*.1+.018);g.gain.exponentialRampToValueAtTime(.001,t+i*.1+.32);o.connect(g);g.connect(audioContext.destination);o.start(t+i*.1);o.stop(t+i*.1+.34);});
 }catch{}}
function announce(text){$('#announcer').textContent=text;}
function toast(text){document.querySelector('.toast')?.remove();clearTimeout(toastTimer);const e=document.createElement('div');e.className='toast';e.textContent=text;document.body.append(e);toastTimer=setTimeout(()=>e.remove(),2600);announce(text);}
function confetti(){if(progress.calm||matchMedia('(prefers-reduced-motion: reduce)').matches)return;for(let i=0;i<30;i++){const p=document.createElement('i');p.className='confetti';p.style.cssText=`left:${35+Math.random()*30}%;top:40%;background:${['#deb760','#749060','#d99575','#f4e3ae'][i%4]};--dx:${(Math.random()-.5)*620}px;--dy:${80+Math.random()*380}px;animation-delay:${Math.random()*.15}s`;$('#particles').append(p);setTimeout(()=>p.remove(),2100);}}
function header(){return `<header class="topbar">${btn('home',`<span class="brand-emblem">${icon('leaf')}</span><span class="brand-name"><small>Little</small>Word World</span>`,'brand','aria-label="Little Word World home"')}<div class="header-tools">${screen==='garden'?`<span class="garden-progress">${icon('leaf')} ${progress.collected.length} / 9 discoveries</span>`:''}${btn('parents',`${icon('lock')} Grown-ups`,'soft-button')}${btn('mute',icon(progress.muted?'mute':'sound'),'round-button',`aria-label="${progress.muted?'Turn sound on':'Mute sound'}" aria-pressed="${progress.muted}"`)}</div></header>`;}
function chapterCards(){return WORLDS.map((w,i)=>`<button class="chapter-card ${progress.world===i?'selected':''}" data-action="chapter" data-world="${i}">${sprite(w.icon)}<span><span class="chapter-number">CHAPTER 0${i+1}</span><strong>${w.name}</strong><small>${w.words.filter(id=>progress.collected.includes(id)).length} of 3 discoveries</small></span></button>`).join('');}
function home(){return `${header()}<main class="home-main"><div class="hero-copy"><div class="eyebrow">${icon('leaf')} A little world of possibility</div><h1>Small words.<br><em>Big adventures.</em></h1><p class="hero-description">A sun to wake up. A friend to find.<br>Bring a little world to life, one word at a time.</p><div class="hero-actions">${btn('adventure',`${progress.adventure.step>0||progress.adventure.ready?'Back to Fox':'Help Fox cross'} ${icon('arrow')}`,'primary')}${btn('word-games',`${icon('spark')} Word games`,'primary gold')}</div><div class="home-shortcuts">${btn('garden',`${icon('home')} My garden`,'text-button')}${btn('start','Discover words','text-button')}${btn('review','A little practice','text-button')}${btn('library',`${icon('book')} Little books`,'text-button')}</div><div class="hero-note">${icon('heart')} Little steps. Happy discoveries. Your own pace.</div></div><div class="hero-character">${pip()}<div class="pip-bubble"><small>Meet your little guide</small>Hi, I’m Pip. Let’s play!</div></div><div class="floating-leaf" aria-hidden="true">${icon('leaf')}</div></main><nav class="chapter-dock" aria-label="Choose an adventure"><div class="dock-label"><strong>Where shall we go?</strong><span>Three little adventures await</span></div>${chapterCards()}</nav><footer class="footer-line">MADE FOR LITTLE EXPLORERS <span>•</span> AGES 3–6</footer>`;}
function garden(){return `${header()}<div class="garden-heading"><h1>Your little word world</h1><p>${progress.collected.length?'Tap your discoveries to hear their words. Drag them to play.':'A whole garden of possibilities is waiting for you.'}</p></div><main class="garden-stage" aria-label="Your interactive garden">${progress.collected.map(id=>{const w=wordById(id),p=progress.positions[id]||w;return `<button class="garden-object" data-action="object" data-word="${id}" style="left:${p.x}%;top:${p.y}%;--size:${w.size}px" aria-label="${id}. Tap to hear, drag or use arrow keys to move.">${sprite(id)}</button>`;}).join('')}${!progress.collected.length?`<div class="garden-empty"><p>Let’s make our first discovery.</p>${btn('start',`Find some sunshine ${icon('arrow')}`,'primary')}</div>`:''}</main><div class="garden-pip">${pip()}</div><div class="garden-bottom">${btn('adventure',`Visit Fox ${icon('arrow')}`,'primary')}${btn('word-games',`${icon('spark')} Word games`)}${btn('book',`${icon('book')} My word book`)}${btn('chapters',icon('leaf'),'round-button','aria-label="Choose an adventure"')}${btn('library',icon('book'),'round-button','aria-label="Little books"')}</div>`;}
function upcomingWord(){const world=chapterDone(progress,progress.world)?WORLDS.findIndex((_,i)=>!chapterDone(progress,i)):progress.world;return nextWord(progress,world<0?progress.world:world);}
function startWord(id=upcomingWord(),mission=false){
 clearTimeout(transitionTimer);closeModal();stopAudio();const word=wordById(id);if(!word)return;journey=mission;
 progress.world=word.world;save();const support=supportFor(progress,id);
 quest={id,step:support.retrieval?2:0,support,retrieval:support.retrieval,heardTarget:false,hints:0,totalMistakes:0,revealed:!support.retrieval,filled:[],used:[],mistakes:0,hint:false,locked:false,feedback:'',letters:shuffle([...id]),letterChoices:shuffle([id[0],...shuffle('stcmpdhlb'.split('').filter(x=>x!==id[0])).slice(0,support.choices-1)]),choices:choicesFor(id,support.choices),story:false};
 screen='play';render();narrate();
}
function questHeader(){return `<div class="quest-top"><span class="quest-place">${journey?'HELP FOX CROSS':quest.story?'A LITTLE STORY':quest.retrieval?'A LITTLE PRACTICE':WORLDS[progress.world].name}</span><div class="stepper" aria-label="${`Step ${quest.step+1} of 3`}">${[0,1,2].map(i=>`<span class="${i<quest.step?'done':i===quest.step?'current':''}"></span>`).join('')}</div>${btn(journey?'adventure':'garden',icon('close'),'round-button','aria-label="Save and leave this word"')}</div>`;}
function lesson(){
 if(quest.story)return storyLesson();const {id,step}=quest;let content;
 if(step===0){content=`<h1>Find the first letter</h1><p class="instruction">Look at the word. Tap its first letter.</p><div class="word-visual">${sprite(id)}<div class="printed-word"><span class="accent">${id[0]}</span>${id.slice(1)}</div></div><div class="letter-options">${quest.letterChoices.map(l=>btn('letter',l,`letter-tile ${quest.hint&&l===id[0]?'hint':''}`,`data-letter="${l}" aria-label="Letter ${l}" ${quest.locked?'disabled':''}`)).join('')}</div>`;}
 else if(step===1){content=`<h1>Let’s build a word</h1><p class="instruction">Tap the letters in order. You can drag them, too.</p><div class="build-object">${sprite(id)}</div><div class="slots" aria-label="Word slots">${[...id].map((l,i)=>`<div class="slot ${i<quest.filled.length?'filled':i===quest.filled.length?'next':''}" data-slot="${i}" aria-label="Position ${i+1}${i<quest.filled.length?', '+l:', empty'}">${i<quest.filled.length?l:(quest.support.ghost||quest.hint?l:'')}</div>`).join('')}</div><div class="letter-options">${quest.letters.map((l,i)=>btn('tile',l,`letter-tile ${quest.used.includes(i)?'used':''} ${quest.hint&&!quest.used.includes(i)&&l===id[quest.filled.length]?'hint':''}`,`data-letter="${l}" data-index="${i}" aria-label="Letter ${l}" ${quest.used.includes(i)||quest.locked?'disabled':''}`)).join('')}</div>`;}
 else if(progress.level==='sprout'&&!quest.retrieval){content=`<h1>Find the word</h1><p class="instruction">Listen, then choose the matching word.</p><div class="word-visual">${sprite(id)}</div><div class="word-options">${quest.choices.map(w=>btn('answer',w,`choice ${quest.hint&&w===id?'hint':''}`,`data-word="${w}" ${quest.locked?'disabled':''}`)).join('')}</div>`;}
 else{content=`<h1>Read it. Find it.</h1><p class="instruction">Read the word, then choose its picture.</p><div class="word-visual"><div class="printed-word">${id}</div></div><div class="picture-options">${quest.choices.map(w=>btn('answer',sprite(w),`choice ${quest.hint&&w===id?'hint':''}`,`data-word="${w}" aria-label="${w}" ${quest.locked?'disabled':''}`)).join('')}</div>`;}
 return `${header()}<main class="quest-layout"><aside class="quest-pip">${pip()}<div class="pip-caption">Take your time. I’m right here.</div></aside><section class="quest-card">${questHeader()}${content}${btn('listen',`${icon('sound')} ${step===2&&(quest.retrieval||progress.level!=='sprout')?'Hear the word':'Listen again'}`,'listen-button')}<div class="quest-footer">${quest.feedback?`<div class="quest-feedback" role="status">${quest.feedback}</div>`:btn('hint',`${icon('help')} A little help, Pip?`,'text-button')}</div></section></main><footer class="play-nav">${btn('book',`${icon('book')} My word book`,'text-button')}<span>YOUR OWN PACE.</span></footer>`;
}
function narrate(){if(!quest)return;const {id,step}=quest;if(quest.story){speak('story-prompt','Let’s finish our little story. Choose the missing picture.');return;}if(step===0)speak(`first-${id}`,`${id}. Find the letter ${LETTER_NAMES[id[0]]}.`);else if(step===1)speak(`build-${id}`,`Let’s build ${id}. Tap the letters in order.`);else if(progress.level==='sprout'&&!quest.retrieval)speak(`find-${id}`,`Can you find the word ${id}?`);else speak('read-picture','Read the word, then choose its picture.');}
function wrong(){if(quest.locked)return;quest.mistakes++;quest.totalMistakes=(quest.totalMistakes||0)+1;if(quest.mistakes>=2){quest.hint=true;quest.hints=(quest.hints||0)+1;}quest.feedback=quest.mistakes>=2?'Pip has left you a little clue.':'Have another look. Take your time.';tone();render();speak(quest.mistakes>=2?'clue':'try-again',quest.feedback);}
function advance(){
 quest.locked=true;quest.feedback='You found it!';tone('right');render();const q=quest;
 transitionTimer=setTimeout(()=>{if(quest!==q||screen!=='play')return;if(q.step===2)finishWord();else{q.step++;q.locked=false;q.feedback='';q.mistakes=0;q.hint=false;render();narrate();}},800);
}
function finishWord(){
 progress=completeWord(progress,quest.id);progress=recordReading(progress,quest.id,{retrieval:quest.retrieval,heardTarget:quest.heardTarget,hints:quest.hints,mistakes:quest.totalMistakes,revealed:quest.revealed});
 if(journey){progress=prepareMission(progress,quest.id);save();openAdventure();return;}
 save();screen='success';render();tone('win');confetti();speak(`reward-${quest.id}`,wordById(quest.id).reward);
}
function success(){const id=quest.id;return `${header()}<main class="quest-layout"><section class="quest-card success-card"><div class="success-badge">${icon('star')} A little discovery</div><div class="success-object">${sprite(id)}</div><div class="success-word">${id}</div><h1>${wordById(id).reward}</h1><p>Your word is saved. Enjoy your garden, read a little book, or have a rest.</p><div class="success-actions">${btn('garden',`My garden ${icon('arrow')}`,'primary')}${btn('library','A little book','soft-button')}${btn('rest','Done for now','soft-button')}</div><div class="new-discovery">${progress.collected.length} discoveries in your word book</div></section></main>`;}
function startStory(world=progress.world){closeModal();clearTimeout(transitionTimer);const s=STORIES[world];quest={story:true,storyIndex:world,step:2,id:s.answer,choices:shuffle(s.options),locked:false,hint:false,mistakes:0,feedback:''};screen='play';render();narrate();}
function storyLesson(){const s=STORIES[quest.storyIndex];return `${header()}<main class="quest-layout"><section class="quest-card">${questHeader()}<h1>${quest.locked?'A lovely little story!':s.label}</h1><p class="instruction">${quest.locked?'Words can make wonderful things happen.':'Read together. What belongs in the story?'}</p><div class="story-cast">${sprite(s.cast[0])}${quest.locked?sprite(s.answer):''}</div><div class="story-line">${s.parts.join(' ')} <span class="${quest.locked?'story-complete':'story-blank'}">${quest.locked?s.answer:'?'}</span></div>${quest.locked?btn('garden',`Back to my garden ${icon('arrow')}`,'primary'):`<div class="picture-options">${quest.choices.map(w=>btn('story-answer',sprite(w),`choice ${quest.hint&&w===s.answer?'hint':''}`,`data-word="${w}" aria-label="${w}"`)).join('')}</div>${btn('story-listen',`${icon('sound')} Read together`,'listen-button')}`}<div class="quest-footer"><div class="quest-feedback" role="status">${quest.feedback||'Little words. A whole new story.'}</div></div></section></main>`;}
function render(){document.body.dataset.screen=screen;document.body.classList.toggle('calm',progress.calm);$('#app').innerHTML=screen==='home'?home():screen==='word-games'?wordGamesHub():screen==='word-game'?wordGameScreen():screen==='garden'?garden():screen==='play'?lesson():screen==='adventure'?adventure():screen==='library'?library():screen==='reader'?reader():screen==='rest'?rest():success();}
function navigate(to){wordPlay=null;wordPlayDrag=null;journey=false;crossing=false;bookView=null;clearTimeout(transitionTimer);stopAudio();closeModal();screen=to;render();if(to==='word-games')speak('wg-welcome','Choose a little word game.');if(to==='garden')speak('garden','Welcome to your garden. Tap your discoveries to hear their words.');}
function modalShell(title,body){return `<dialog id="modal"><div class="modal-head"><h2>${title}</h2>${btn('close-modal',icon('close'),'round-button','aria-label="Close"')}</div>${body}</dialog>`;}
function closeModal(){const d=$('#modal');if(d){d.close();d.remove();}modal=null;if(returnFocus?.isConnected)returnFocus.focus();}
function showModal(name){
 stopAudio();returnFocus=document.activeElement;modal=name;let title,body;
 if(name==='book'){title='My little word book';body=`<p class="modal-intro">${progress.collected.length} little discoveries. Tap a picture to hear its word.</p><div class="book-grid">${WORDS.map(w=>{const has=progress.collected.includes(w.id);return `<button class="book-item ${has?'':'locked'}" data-action="${has?'hear-word':'unlock-word'}" data-word="${w.id}" aria-label="${has?'Hear '+w.id:'Discover '+w.id}">${sprite(w.id)}<span class="word-label">${has?w.id:'Discover me'}</span>${has?`<span class="book-check">${icon('check')}</span>`:''}</button>`;}).join('')}</div>`;}
 else if(name==='gate'){title='A moment for grown-ups';body=`<div class="gate"><p class="modal-intro">Let’s set up the right adventure for your little reader.</p><h3>7 + 5 = ?</h3><div class="word-options">${[10,12,14].map(n=>btn('gate',String(n),'choice',`data-answer="${n}"`)).join('')}</div></div>`;}
 else if(name==='parents'){title='For your little reader';body=parentContent();}
 else if(name==='chapters'){title='Where shall we go?';body=`<p class="modal-intro">Every path is open. Choose a little adventure.</p><div class="chapter-modal-list">${chapterCards()}</div>`;}
 else if(name==='stories'){title='A little story time';body=`<p class="modal-intro">Read together with Pip. A few little words can tell a story.</p><div class="chapter-modal-list">${STORIES.map((s,i)=>`<button class="chapter-card" data-action="story" data-world="${i}">${sprite(s.cast[0])}<span><strong>${s.label}</strong><small>${s.parts.join(' ')} ...</small></span>${icon('arrow')}</button>`).join('')}</div><div class="story-entry">${icon('spark')}<span>${helper.status==='ready'?'Let Pip’s local helper choose a new scene.':'Pip has another tiny tale to tell.'}</span>${btn('tiny-story','Tell me a story')}</div><div id="tiny-story-content"></div>`;}
 else if(name==='reset'){title='Start a fresh garden?';body=`<p class="modal-intro">This clears discoveries and practice counts on this device. Your current garden cannot be restored.</p><div class="success-actions">${btn('close-modal','Keep my garden','primary')}${btn('confirm-reset','Start fresh','text-button')}</div>`;}
 $('#overlay-root').innerHTML=modalShell(title,body);const d=$('#modal');d.showModal();d.addEventListener('cancel',e=>{e.preventDefault();closeModal();});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});if(name==='parents')updateAIStatus();
}
function parentContent(){return `<p class="modal-intro">Follow their curiosity. You can change the amount of help at any time.</p><div class="stats"><div><strong>${progress.collected.length}</strong><small>words discovered</small></div><div><strong>${Object.values(progress.practice).reduce((a,b)=>a+b,0)}</strong><small>adventures played</small></div><div><strong>${progress.stories.length}</strong><small>stories completed</small></div></div>${readingSummary()}<section class="settings-section"><h3>A comfortable starting point</h3>${Object.entries(LEVELS).map(([key,l])=>`<button class="level-option ${progress.level===key?'active':''}" data-action="level" data-level="${key}" aria-pressed="${progress.level===key}"><span class="level-dot"></span><span><strong>${l.name}</strong><small>${l.detail}</small></span></button>`).join('')}<p class="parent-note">The game speaks whole words and letter names. A grown-up can help sound out words together. Independent means a first-try picture choice in a fresh word check, without hearing the answer or seeing a hint. It is a practice signal, not a reading assessment. <a href="https://home.oxfordowl.co.uk/reading/phonics/" target="_blank" rel="noopener noreferrer">A guide to phonics</a>.</p></section><section class="settings-section"><div class="setting-row"><span>Adapt practice to their progress</span>${btn('adaptive','',`switch ${progress.adaptive?'on':''}`,`role="switch" aria-checked="${progress.adaptive}" aria-label="Adaptive practice"`)}</div><p class="parent-note">After two supported word sessions, offer a fresh reading check. Revisit words that needed help sooner. You can turn this off or change the starting point.</p><div class="setting-row"><span>Gentle motion</span>${btn('calm','',`switch ${progress.calm?'on':''}`,`role="switch" aria-checked="${progress.calm}" aria-label="Reduce motion"`)}</div><div class="setting-row"><span>Voice & little sounds</span>${btn('mute','',`switch ${!progress.muted?'on':''}`,`role="switch" aria-checked="${!progress.muted}" aria-label="Sound"`)}</div></section><section class="settings-section"><h3>Pip’s local story helper</h3><p class="parent-note">Optional, experimental AI that runs on this device. SmolLM2 (135M) chooses characters and actions from our approved story pieces. Raw model text never appears in the child’s game. Lesson answers stay in game logic.</p><p class="parent-note">First use downloads about 117 MB of model weights, plus runtime files, from Hugging Face and jsDelivr. Requires WebGPU with half-precision support. Only object names enter the model; there is no chat, microphone, or remote inference. Download servers receive normal connection information.</p><div id="ai-status" class="ai-status" role="status"></div><progress id="ai-progress" class="ai-progress" max="100" value="0" hidden></progress><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('ai-enable','Enable local helper','small-primary','id="ai-enable"')}${btn('ai-stop','Turn off','soft-button','id="ai-stop" hidden')}${btn('ai-test','Try a little story','soft-button','id="ai-test" hidden')}</div><div id="ai-preview" class="parent-note"></div></section><section class="settings-section"><p class="parent-note">Progress stays in this browser${storageAvailable?'.':', but this browser is currently blocking saves.'} No account, ads, or tracking. Take breaks whenever your child is ready. The helper stays off until a grown-up enables it each visit.</p>${btn('reset','Start a fresh garden','danger-link')}</section>`;}
function updateAIStatus(){const e=$('#ai-status');if(!e)return;const labels={off:'Helper is off. All adventures and built-in stories are available.',loading:helper.message||'Preparing the little helper…',ready:'Ready. Story choices are made locally on this device.',error:helper.message||'The helper could not start. All built-in activities still work.'};e.textContent=labels[helper.status];const p=$('#ai-progress');p.hidden=helper.status!=='loading';p.value=helper.percent;$('#ai-enable').hidden=helper.status==='loading'||helper.status==='ready';$('#ai-stop').hidden=helper.status==='off'||helper.status==='error';$('#ai-test').hidden=helper.status!=='ready';}
async function tinyStory(target){
 const e=$(target);if(!e)return;e.textContent='Pip is choosing a little story…';const requestScreen=modal;const plan=helper.status==='ready'?await helper.plan(progress.collected):fallbackPlan(progress.collected);if(!e.isConnected||modal!==requestScreen)return;aiStory=storyFromPlan(plan);e.innerHTML=`<div class="story-entry"><div>${sprite(plan.character)}<p style="font-size:15px;line-height:1.7">${aiStory}</p>${btn('read-tiny-story',`${icon('sound')} Read with Pip`,'listen-button')}</div></div>`;
}
let suppressedClick=false;
document.addEventListener('click',e=>{
 const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;if(suppressedClick&&(b.classList.contains('garden-object')||b.classList.contains('mission-token')||b.classList.contains('wg-draggable'))){suppressedClick=false;return;}
 const a=b.dataset.action,id=b.dataset.word;switch(a){
 case'word-games':navigate('word-games');break;case'wg-start':startWordGame(b.dataset.game);break;case'wg-swap':playWordGame('swap',b.dataset.letter);break;case'wg-select':playWordGame('select',id);break;case'wg-match':playWordGame('match',id);break;case'wg-tile':playWordGame('tile',Number(b.dataset.index));break;case'wg-undo':playWordGame('undo');break;case'wg-hint':playWordGame('hint');break;case'wg-listen':narrateWordGame();break;case'wg-next':advanceWordGame();break;
 case'adventure':openAdventure();break;case'mission-learn':startWord(MISSIONS[progress.adventure.step]?.word,true);break;case'mission-act':useMission();break;case'replay-adventure':progress.adventure={step:0,ready:false};save();openAdventure();break;
 case'library':navigate('library');break;case'open-book':openBook(b.dataset.book);break;case'book-next':turnPage(1);break;case'book-prev':turnPage(-1);break;case'book-read':readPage();break;case'book-word':speak(wordById(id)?`word-${id}`:`bookword-${id}`,id);break;case'book-answer':answerBook(id);break;
 case'rest':navigate('rest');speak('rest','Our adventure is saved. See you next time.');break;case'review':startWord(reviewWord(progress));break;
 case'home':navigate('home');break;case'garden':navigate('garden');break;case'start':startWord();break;case'next':startWord(nextWord(progress));break;
 case'chapter':progress.world=Number(b.dataset.world);save();startWord(nextWord(progress));break;
 case'chapters':showModal('chapters');break;case'book':if(screen==='play'&&quest&&!quest.story)quest.revealed=true;showModal('book');break;case'parents':showModal('gate');break;case'close-modal':closeModal();break;
 case'gate':if(b.dataset.answer==='12')showModal('parents');else toast('Have another look.');break;
 case'mute':progress.muted=!progress.muted;save();stopAudio();render();if(modal==='parents')showModal('parents');break;
 case'adaptive':progress.adaptive=!progress.adaptive;save();showModal('parents');break;
 case'calm':progress.calm=!progress.calm;save();render();showModal('parents');break;
 case'level':progress.level=b.dataset.level;save();render();showModal('parents');break;
 case'listen':quest.heardTarget=true;if(quest.step===2&&(quest.retrieval||progress.level!=='sprout'))speak(`word-${quest.id}`,quest.id);else narrate();break;
 case'hint':quest.hints=(quest.hints||0)+1;quest.hint=true;quest.feedback='Follow the little clue. You can do it.';render();speak('clue',quest.feedback);break;
 case'letter':if(!quest.locked){b.dataset.letter===quest.id[0]?advance():wrong();}break;
 case'tile':placeTile(b.dataset.letter,Number(b.dataset.index));break;
 case'answer':if(!quest.locked){id===quest.id?advance():wrong();}break;
 case'hear-word':if(screen==='play'&&quest&&!quest.story)quest.heardTarget=true;speak(`word-${id}`,id);tone();break;case'unlock-word':startWord(id);break;
 case'object':b.classList.remove('dancing');void b.offsetWidth;b.classList.add('dancing');speak(`word-${id}`,id);tone();setTimeout(()=>b.classList.remove('dancing'),700);break;
 case'stories':showModal('stories');break;case'story':startStory(Number(b.dataset.world));break;
 case'story-listen':{const s=STORIES[quest.storyIndex];speak(`story-${quest.storyIndex}`,`${s.parts.join(' ')} ${s.answer}.`);quest.hint=true;render();break;}
 case'story-answer':if(!quest.locked){if(id===quest.id){quest.locked=true;quest.feedback='You brought a story to life!';progress.stories=[...new Set([...progress.stories,quest.storyIndex])];save();render();confetti();tone('win');const s=STORIES[quest.storyIndex];speak(`story-${quest.storyIndex}`,`${s.parts.join(' ')} ${s.answer}.`);}else wrong();}break;
 case'reset':showModal('reset');break;case'confirm-reset':helper.stop();progress=freshProgress();save();quest=null;navigate('home');break;
 case'ai-enable':helper.enable();break;case'ai-stop':helper.stop();break;case'ai-test':tinyStory('#ai-preview');break;case'tiny-story':tinyStory('#tiny-story-content');break;
 case'read-tiny-story':if(aiStory)speak(null,aiStory);break;
 }
});
function placeTile(letter,index){if(!quest||quest.step!==1||quest.locked||quest.used.includes(index)||quest.letters[index]!==letter)return;if(validateLetter(quest.id,quest.filled,letter)){quest.filled.push(letter);quest.used.push(index);quest.feedback='';tone('right');speak(`letter-${letter}`,LETTER_NAMES[letter]);if(quest.filled.length===quest.id.length){quest.locked=true;quest.feedback=`You built ${quest.id}!`;render();const q=quest;transitionTimer=setTimeout(()=>{if(quest===q&&screen==='play'){q.step=2;q.locked=false;q.feedback='';q.hint=false;q.mistakes=0;render();narrate();}},900);}else{render();const next=$('.letter-tile:not(.used):not(:disabled)');next?.focus({preventScroll:true});}}else wrong();}
let drag=null;
document.addEventListener('pointerdown',e=>{
 const object=e.target.closest('.garden-object');if(object){const stage=$('.garden-stage').getBoundingClientRect();drag={kind:'object',el:object,startX:e.clientX,startY:e.clientY,stage,moved:false};object.setPointerCapture(e.pointerId);return;}
 const tile=e.target.closest('.letter-tile[data-action="tile"]');if(tile&&!tile.disabled){drag={kind:'tile',el:tile,startX:e.clientX,startY:e.clientY,moved:false};tile.setPointerCapture(e.pointerId);}
});
document.addEventListener('pointermove',e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>9)drag.moved=true;if(!drag.moved)return;if(drag.kind==='object'){e.preventDefault();drag.el.classList.add('dragging');const x=Math.min(92,Math.max(8,(e.clientX-drag.stage.left)/drag.stage.width*100)),y=Math.min(85,Math.max(24,(e.clientY-drag.stage.top)/drag.stage.height*100));drag.position={x,y};drag.el.style.left=x+'%';drag.el.style.top=y+'%';}else{drag.el.style.transform=`translate(${e.clientX-drag.startX}px,${e.clientY-drag.startY}px)`;drag.el.style.zIndex='10';}}, {passive:false});
document.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;d.el.classList.remove('dragging');if(d.kind==='object'&&d.moved){progress.positions[d.el.dataset.word]=d.position;save();suppressedClick=true;setTimeout(()=>suppressedClick=false,100);}else if(d.kind==='tile'&&d.moved){d.el.style.transform='';d.el.style.zIndex='';const r=$('.slots')?.getBoundingClientRect();if(r&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top-20&&e.clientY<=r.bottom+20){e.preventDefault();placeTile(d.el.dataset.letter,Number(d.el.dataset.index));}}});
document.addEventListener('pointercancel',()=>{if(drag){drag.el.classList.remove('dragging');drag.el.style.transform='';drag=null;}});
document.addEventListener('keydown',e=>{const el=e.target.closest('.garden-object');if(el&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const w=wordById(el.dataset.word),p=progress.positions[w.id]||{x:w.x,y:w.y};p.x=Math.min(92,Math.max(8,p.x+(e.key==='ArrowLeft'?-2:e.key==='ArrowRight'?2:0)));p.y=Math.min(85,Math.max(24,p.y+(e.key==='ArrowUp'?-2:e.key==='ArrowDown'?2:0)));progress.positions[w.id]=p;save();el.style.left=p.x+'%';el.style.top=p.y+'%';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAudio();audioContext?.suspend();}});
window.addEventListener('pagehide',()=>{stopAudio();helper.stop();});
render();

function openAdventure(){
 clearTimeout(transitionTimer);stopAudio();closeModal();journey=false;crossing=false;screen='adventure';render();
 const {step,ready}=progress.adventure;
 if(step===3)speak('mission-done','Fox is across and our picnic is ready. A lovely place to stop.');
 else if(!ready)speak(`mission-${step}`,MISSIONS[step].prompt);
 else speak(`word-${MISSIONS[step].word}`,MISSIONS[step].word);
}
function adventure(){
 const {step,ready}=progress.adventure,done=step===3,m=MISSIONS[step];
 return `${header()}<main class="adventure-layout"><section class="stream-scene" aria-label="A woodland stream. ${step>0?'A log bridge joins the banks.':'Fox waits on the left bank.'} ${step>1?'Fox is on the picnic bank.':''}"><div class="water-shimmer" aria-hidden="true"></div><span class="stream-leaf leaf-one" aria-hidden="true"></span><span class="stream-leaf leaf-two" aria-hidden="true"></span>${step>0?`<div class="mission-bridge">${sprite('log')}</div>`:''}<div class="fox-position ${step>1?'across':''} ${crossing?'crossing':''}" role="img" aria-label="${crossing?'Fox walking across the bridge':'A red fox'}"><span class="fox-walker"></span></div>${step===0&&ready?btn('mission-act',`${icon('arrow')} Here`,'mission-target','aria-label="Place the log across the stream"'):''}${step===3?`<div class="picnic-cup">${sprite('cup')}</div><div class="picnic-pip">${pip()}</div>`:''}<div class="scene-caption">${done?'A lovely little picnic':crossing?'One little paw at a time…':'The woodland stream'}</div></section><aside class="adventure-card"><span class="eyebrow">ONE LITTLE ADVENTURE</span><div class="mission-progress" aria-label="${Math.min(step,3)} of 3 tasks complete">${MISSIONS.map((task,i)=>`<span class="${i<step?'done':i===step?'current':''}" aria-label="${task.word}${i<step?', complete':''}">${i<step?icon('check'):sprite(task.word)}</span>`).join('')}</div><h1>${done?'A picnic with Fox':m.title}</h1><p>${done?'You made a bridge, helped Fox cross, and set out a cup. Our little adventure is complete.':crossing?'Fox is taking a little walk across your bridge.':ready?`You found ${m.word}! ${step===0?'Drag the log onto the stream, or tap Place the log.':m.action+'.'}`:m.prompt}</p>${done?`<div class="adventure-actions">${btn('rest','Done for now','primary')}${btn('open-book',`${icon('book')} Read our little book`,'soft-button','data-book="fox"')}${btn('garden','Enjoy my garden','soft-button')}${btn('replay-adventure','Play this adventure again','text-button')}</div><p class="save-note">${storageAvailable?'Your adventure is saved on this device.':'This browser is blocking saves. Keep this tab open to keep playing.'}</p>`:crossing?'<p class="save-note" role="status">Fox is crossing…</p>':ready?`<button class="mission-token" data-action="mission-act" aria-label="${m.action}">${sprite(m.word)}<span>${m.word}</span></button>${btn('mission-act',`${m.action} ${icon('arrow')}`,'primary')}`:`${btn('mission-learn',`Read ${m.word} ${icon('arrow')}`,'primary')}`}<div class="adventure-bottom">${btn('home',`${icon('home')} Save & leave`,'text-button')}${!done?btn('rest','Take a break','text-button'):''}</div></aside></main>`;
}
function useMission(){
 if(screen!=='adventure'||!progress.adventure.ready||crossing)return;
 const before=progress.adventure.step;progress=actMission(progress);save();
 crossing=before===1;render();soundEffect(before===0?'wood':before===1?'step':'water');
 if(crossing){
  const calm=progress.calm||matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!calm)for(let i=1;i<7;i++)setTimeout(()=>{if(crossing&&screen==='adventure'&&!document.hidden)soundEffect('step');},i*430);
  transitionTimer=setTimeout(()=>{if(screen!=='adventure')return;crossing=false;render();speak('mission-fox','Fox is safely across!');},calm?200:3200);
 }else{speak(`mission-${MISSIONS[before].word}`,MISSIONS[before].done);if(before===2){confetti();tone('win');}}
}
function soundEffect(kind){
 if(progress.muted||document.hidden)return;
 try{
  audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();
  const duration=kind==='water'?.65:.12,buffer=audioContext.createBuffer(1,Math.floor(audioContext.sampleRate*duration),audioContext.sampleRate),data=buffer.getChannelData(0);
  let previous=0;for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.12)/1.12;data[i]=previous;}
  const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='water'?1900:kind==='wood'?750:400;
  gain.gain.setValueAtTime(.001,audioContext.currentTime);gain.gain.linearRampToValueAtTime(kind==='water'?.25:.35,audioContext.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
  source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);source.start();source.stop(audioContext.currentTime+duration);
 }catch{}
}
function library(){return `${header()}<main class="library"><div class="library-heading"><span class="eyebrow">A QUIET MOMENT TOGETHER</span><h1>Our little bookshelf</h1><p>Three little pages. A whole little story.</p></div><div class="book-shelf">${BOOKS.map(b=>`<button class="book-cover book-${b.id}" data-action="open-book" data-book="${b.id}"><span class="cover-art">${sprite(b.cover)}</span><strong>${b.title}</strong><span>Read together ${icon('arrow')}</span>${progress.books.includes(b.id)?'<small>Read together before</small>':progress.bookmarks[b.id]>0?`<small>Continue on page ${progress.bookmarks[b.id]+1}</small>`:'<small>3 little pages</small>'}</button>`).join('')}</div><div class="library-actions">${btn('garden',`${icon('home')} My garden`,'soft-button')}${btn('stories','Story puzzles','soft-button')}${btn('rest','Done for now','soft-button')}</div></main>`;}
function openBook(id){
 const b=BOOKS.find(b=>b.id===id);if(!b)return;clearTimeout(transitionTimer);stopAudio();closeModal();journey=false;crossing=false;
 bookView={id,page:progress.bookmarks[id]||0,solved:false,ended:false,feedback:''};screen='reader';render();speak('book-prompt','Read together. Touch a word to hear it.');
}
function reader(){
 const b=BOOKS.find(b=>b.id===bookView.id),page=b.pages[bookView.page],missing=page.answer&&!bookView.solved;
 if(bookView.ended)return `${header()}<main class="quest-layout"><section class="quest-card book-ending"><div class="success-object">${sprite(b.cover)}</div><span class="eyebrow">THE END</span><h1>You read a little book.</h1><p class="talk-prompt">Talk together: ${b.prompt}</p><div class="success-actions">${btn('rest','Done for now','primary')}${btn('library','Back to our bookshelf','soft-button')}</div></section></main>`;
 return `${header()}<main class="reader-layout"><div class="reader-top">${btn('library',`${icon('back')} Bookshelf`,'soft-button')}<span>${b.title} · ${bookView.page+1} / ${b.pages.length}</span></div><article class="open-book"><div class="book-illustration scene-${b.id} page-${bookView.page}" aria-label="Story illustration">${page.cast.filter(id=>!missing||id!==page.answer).map(id=>`<span class="book-character cast-${id}">${sprite(id)}</span>`).join('')}</div><div class="book-page"><span class="page-number">${bookView.page+1}</span><div class="reading-line">${page.words.map((w,i)=>missing&&i===page.words.length-1?'<span class="missing-word" aria-label="Missing word">?</span>':btn('book-word',w,'reading-word',`data-word="${w}" data-reading-index="${i}" aria-label="Hear ${w}"`)).join(' ')}<span class="reading-period">.</span></div>${missing?`<p class="instruction">What belongs in our story?</p><div class="picture-options book-choices">${page.options.map(id=>btn('book-answer',sprite(id),'choice',`data-word="${id}" aria-label="${id}"`)).join('')}</div>`:btn('book-read',`${icon('sound')} Read with Pip`,'listen-button')}<p class="book-feedback" role="status">${bookView.feedback||'Touch any word to hear it.'}</p></div></article><nav class="reader-nav" aria-label="Book pages">${btn('book-prev',`${icon('back')} Back`,'soft-button',bookView.page===0?'disabled':'')}${btn('book-next',`${bookView.page===b.pages.length-1?'The end':'Turn the page'} ${icon('arrow')}`,'primary',missing?'disabled':'')}</nav></main>`;
}
function answerBook(id){
 if(screen!=='reader'||bookView.ended)return;const page=BOOKS.find(b=>b.id===bookView.id).pages[bookView.page];
 if(!page.answer||bookView.solved)return;
 if(id!==page.answer){bookView.feedback='Look at our story. Have another try.';render();speak('try-again','Have another look. Take your time.');return;}
 bookView.solved=true;bookView.feedback='You brought our story to life.';tone('right');render();readPage();
}
async function readPage(){
 if(screen!=='reader'||bookView.ended)return;stopAudio();const token=audioToken,bv=bookView,page=BOOKS.find(b=>b.id===bv.id).pages[bv.page];
 for(let i=0;i<page.words.length;i++){
  if(token!==audioToken||bookView!==bv||screen!=='reader')return;
  const el=$(`[data-reading-index="${i}"]`);el?.classList.add('speaking');const w=page.words[i];
  await speak(wordById(w)?`word-${w}`:`bookword-${w}`,w,false);el?.classList.remove('speaking');
 }
}
function turnPage(direction){
 if(screen!=='reader'||bookView.ended)return;const b=BOOKS.find(b=>b.id===bookView.id),page=b.pages[bookView.page];
 if(direction>0&&page.answer&&!bookView.solved)return;stopAudio();
 if(direction>0&&bookView.page===b.pages.length-1){bookView.ended=true;progress.books=[...new Set([...progress.books,b.id])];progress.bookmarks[b.id]=0;save();render();speak('book-done','The end. You read a little book!');return;}
 bookView={...bookView,page:Math.max(0,bookView.page+direction),solved:false,feedback:''};progress.bookmarks[b.id]=bookView.page;save();render();
}
function rest(){return `${header()}<main class="rest-screen"><div class="rest-pip">${pip('sleepy')}</div><span class="eyebrow">A LOVELY PLACE TO STOP</span><h1>See you next time.</h1><p>${storageAvailable?'Your garden and adventure are saved.':'Your garden is here while this tab stays open.'}<br>Pip is having a little rest.</p>${btn('home','Back to the garden gate','soft-button')}</main>`;}
function readingSummary(){
 return `<section class="settings-section"><h3>A little look at their practice</h3><div class="reading-table"><table><caption>Completed word checks on this device</caption><thead><tr><th scope="col">Word</th><th scope="col">With help</th><th scope="col">Independent</th></tr></thead><tbody>${WORDS.map(({id})=>`<tr><th scope="row">${id}</th><td>${progress.reading[id]?.assisted||0}</td><td>${progress.reading[id]?.independent||0}</td></tr>`).join('')}</tbody></table></div><p class="parent-note">A word built or heard just beforehand counts as supported. Hints, retries, and hearing the answer also count as supported. Older discoveries are preserved without assigning past play a reading score. Word games count as play, separately from these reading checks.</p><div class="wordgame-totals">${Object.entries(WORD_GAMES).map(([kind,game])=>`<span>${game.name}: <strong>${progress.wordGames[kind]}</strong> finished</span>`).join('')}</div>${btn('review','Practice a word','soft-button')}</section>`;
}
document.addEventListener('pointerdown',e=>{
 const token=e.target.closest('.mission-token');if(!token||progress.adventure.step!==0||!progress.adventure.ready)return;
 missionDrag={el:token,x:e.clientX,y:e.clientY,moved:false};token.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{if(!missionDrag)return;const d=missionDrag;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>8)d.moved=true;if(d.moved){e.preventDefault();d.el.style.transform=`translate(${e.clientX-d.x}px,${e.clientY-d.y}px)`;}},{passive:false});
document.addEventListener('pointerup',e=>{if(!missionDrag)return;const d=missionDrag;missionDrag=null;d.el.style.transform='';if(!d.moved)return;suppressedClick=true;setTimeout(()=>suppressedClick=false,100);const r=$('.mission-target')?.getBoundingClientRect();if(r&&e.clientX>r.left-40&&e.clientX<r.right+40&&e.clientY>r.top-40&&e.clientY<r.bottom+40)useMission();});
document.addEventListener('pointercancel',()=>{if(missionDrag){missionDrag.el.style.transform='';missionDrag=null;}});

function wordGamesHub(){
 return `${header()}<main class="wordgames-hub"><div class="wordgames-heading"><span class="eyebrow">A LITTLE PLAY. A NEW DISCOVERY.</span><h1>Let’s play with words.</h1><p>Pick a game. Three little puzzles, at your own pace.</p></div><div class="wordgames-menu">${Object.entries(WORD_GAMES).map(([kind,game])=>`<button class="wordgame-door door-${kind}" data-action="wg-start" data-game="${kind}"><span class="door-art">${kind==='swap'?`${sprite('cat','door-cat')}${sprite('hat','door-hat')}<span class="door-letters" aria-hidden="true">c ${icon('arrow')} h</span>`:kind==='pairs'?`${sprite('bug','door-bug')}<span class="door-word" aria-hidden="true">bug</span>`:`${sprite('fox','door-fox')}${sprite('hen','door-hen')}<span class="door-phrase" aria-hidden="true">a fox and a hen</span>`}</span><span class="door-copy"><strong>${game.name}</strong><span>${game.detail}</span></span><span class="door-play">Let’s play ${icon('arrow')}</span></button>`).join('')}</div><div class="wordgames-bottom">${btn('garden',`${icon('home')} My garden`,'soft-button')}${btn('library',`${icon('book')} Little books`,'soft-button')}${btn('rest','Done for now','soft-button')}</div></main>`;
}
function startWordGame(kind){
 const state=createWordGame(kind,progress.wordGames[kind]);if(!state)return;
 clearTimeout(transitionTimer);stopAudio();closeModal();journey=false;crossing=false;bookView=null;wordPlayDrag=null;wordPlay=state;screen='word-game';render();narrateWordGame();
}
function gameScene(scene,solved=true,from=null,to=null){
 let cast;
 if(scene==='cat')cast=`<span class="wg-actor actor-cat ${!solved&&from==='hat'?'not-yet':''}">${sprite('cat')}</span><span class="wg-actor actor-hat ${!solved&&from==='cat'?'not-yet':''} ${solved&&to==='hat'?'hat-arrives':''}">${sprite('hat')}</span>`;
 else if(scene==='dog')cast=`<span class="wg-actor actor-dog ${!solved&&from==='log'?'not-yet':''}">${sprite('dog')}</span><span class="wg-actor actor-log ${!solved&&from==='dog'?'not-yet':''} ${solved&&to==='log'?'log-arrives':''}">${sprite('log')}</span>`;
 else if(scene==='bug')cast=`<span class="wg-actor actor-log">${sprite('log')}</span><span class="wg-actor actor-bug">${sprite('bug')}</span>`;
 else cast=`<span class="wg-actor actor-fox">${sprite('fox')}</span><span class="wg-actor actor-hen">${sprite('hen')}</span>`;
 return `<div class="wordgame-scene scene-${scene} ${solved?'scene-complete':''}" aria-label="${!solved&&from?`A ${from}`:scene==='cat'?'A cat in a hat':scene==='dog'?'A dog and a log':scene==='bug'?'A bug on a log':'A fox and a hen'}">${cast}</div>`;
}
function wordGameScreen(){
 if(!wordPlay)return wordGamesHub();const game=WORD_GAMES[wordPlay.kind];
 if(wordPlay.done)return `${header()}<main class="quest-layout"><section class="quest-card wordgame-ending"><div class="success-badge">${icon('leaf')} ${game.name}</div><div class="success-object">${sprite(game.cover)}</div><h1>Three little puzzles.<br>A lovely bit of play.</h1><p>You changed, matched, or built with words.<br>${storageAvailable?'Your finished game is saved.':'Your game stays here while this tab is open.'}</p><div class="wordgames-bottom">${btn('word-games','Choose a game','primary')}${btn('rest','Done for now','soft-button')}${btn('garden','My garden','soft-button')}</div></section></main>`;
 const round=currentGameRound(wordPlay);let body;
 if(wordPlay.kind==='swap'){
  const word=wordPlay.solved?round.to:round.from;
  body=`<h1>${wordPlay.solved?'One letter. A new word!':'Change a little word'}</h1><p class="instruction">${wordPlay.solved?`${round.from} became ${round.to}.`:'Choose a new letter. You can drag it onto the marked letter, too.'}</p><div class="swap-layout">${gameScene(round.scene,wordPlay.solved,round.from,round.to)}<div class="swap-workbench"><div class="swap-goal"><small>Make this word</small>${sprite(round.to)}<span class="sr-only">${round.to}</span></div><div class="changing-word" aria-label="${word}">${[...word].map((letter,i)=>`<span class="change-letter ${i===round.index?'change-target':''} ${i===round.index&&wordPlay.solved?'changed':''}" ${i===round.index?'data-game-drop="swap"':''}>${letter}</span>`).join('')}</div><div class="swap-letter-bank">${round.letters.map(letter=>btn('wg-swap',letter,`letter-tile wg-draggable ${wordPlay.hint&&letter===round.to[round.index]?'hint':''}`,`data-letter="${letter}" aria-label="Use letter ${letter}" ${wordPlay.solved?'disabled':''}`)).join('')}</div></div></div>`;
 }else if(wordPlay.kind==='pairs'){
  body=`<h1>${wordPlay.solved?'Every word has a picture!':'Find their picture partners'}</h1><p class="instruction">Choose a word, then its picture. You can drag a word, too.</p><div class="pair-counter" aria-label="${wordPlay.matched.length} of 3 pairs found">${round.words.map(id=>`<span class="${wordPlay.matched.includes(id)?'found':''}" aria-hidden="true">${icon(wordPlay.matched.includes(id)?'check':'leaf')}</span>`).join('')}</div><div class="pair-word-bank">${round.wordOrder.map(id=>btn('wg-select',`${id}${wordPlay.matched.includes(id)?icon('check'):''}`,`pair-word wg-draggable ${wordPlay.selected===id?'selected':''} ${wordPlay.matched.includes(id)?'matched':''}`,`data-word="${id}" aria-label="Choose word ${id}" aria-pressed="${wordPlay.selected===id}" ${wordPlay.matched.includes(id)?'disabled':''}`)).join('')}</div><div class="pair-picture-bank">${round.pictureOrder.map(id=>btn('wg-match',`${sprite(id)}<span class="pair-label">${wordPlay.matched.includes(id)?id:icon('leaf')}</span>`,`pair-picture ${wordPlay.matched.includes(id)?'matched':''} ${wordPlay.hint&&wordPlay.selected===id?'hint':''}`,`data-word="${id}" data-game-drop="${id}" aria-label="Picture of ${id}${wordPlay.matched.includes(id)?', matched':''}" ${wordPlay.matched.includes(id)?'disabled':''}`)).join('')}</div>`;
 }else{
  const next=sentenceNextWords(wordPlay);
  body=`<h1>${wordPlay.solved?'You made a little story!':'Build a little story'}</h1><p class="instruction">${wordPlay.solved?'Read it together. Touch Listen to hear your story.':'Look at the scene. Tap the words in order, or drag them into the next space.'}</p>${gameScene(round.scene)}<div class="sentence-track" data-game-drop="sentence" aria-label="Your sentence">${round.words.map((_,i)=>`<span class="sentence-space ${i<wordPlay.filled.length?'filled':i===wordPlay.filled.length?'next':''}" aria-label="${i<wordPlay.filled.length?wordPlay.filled[i]:`Word ${i+1}, empty`}">${i<wordPlay.filled.length?wordPlay.filled[i]:'<span aria-hidden="true">·</span>'}</span>`).join('')}<span class="sentence-stop" aria-hidden="true">.</span></div><div class="sentence-bank">${round.bank.map(tile=>btn('wg-tile',tile.word,`sentence-tile wg-draggable ${wordPlay.used.includes(tile.id)?'used':''} ${wordPlay.hint&&!wordPlay.used.includes(tile.id)&&next.includes(tile.word)?'hint':''}`,`data-index="${tile.id}" aria-label="Add ${tile.word}" ${wordPlay.used.includes(tile.id)||wordPlay.solved?'disabled':''}`)).join('')}</div>${!wordPlay.solved?btn('wg-undo',`${icon('back')} Undo last word`,'text-button',wordPlay.used.length?'':'disabled'):''}`;
 }
 return `${header()}<main class="wordgame-layout"><section class="quest-card wordgame-card game-${wordPlay.kind}"><div class="wordgame-top">${btn('word-games',`${icon('back')} Word games`,'text-button')}<span>${game.name}</span><div class="puzzle-progress" aria-label="Puzzle ${wordPlay.round+1} of 3">${[0,1,2].map(i=>`<i class="${i<wordPlay.round?'done':i===wordPlay.round?'current':''}"></i>`).join('')}</div></div>${body}<div class="wordgame-feedback" role="status">${wordPlay.feedback||'A little play, at your own pace.'}</div><div class="wordgame-controls">${btn('wg-listen',`${icon('sound')} Listen`,'listen-button')}${wordPlay.solved?btn('wg-next',`${wordPlay.round===2?'Finish our game':'Next little puzzle'} ${icon('arrow')}`,'primary'):btn('wg-hint',`${icon('help')} A little help`,'text-button')}</div></section></main>`;
}
function narrateWordGame(){
 if(screen!=='word-game'||!wordPlay||wordPlay.done)return;const round=currentGameRound(wordPlay);
 if(wordPlay.kind==='swap')speak(wordPlay.solved?`word-${round.to}`:`wg-swap-${round.from}-${round.to}`,wordPlay.solved?round.to:`Change ${round.from} into ${round.to}. Choose a new letter.`);
 else if(wordPlay.kind==='pairs')speak('wg-pairs','Choose a word. Then find its picture. Make three pairs.');
 else{const reverse=wordPlay.solved&&wordPlay.filled[1]==='hen',line=(wordPlay.solved?wordPlay.filled:round.words).join(' ')+'.';speak(reverse?'wg-story-reverse':`story-${round.index}`,line);}
}
function playWordGame(action,value){
 if(screen!=='word-game'||!wordPlay||wordPlay.done)return;
 const before=wordPlay,next=chooseWordGame(before,action,value);if(next===before)return;wordPlay=next;render();
 if(next.feedback)announce(next.feedback);
 if(next.solved&&!before.solved){tone('right');if(next.kind==='pairs')speak('wg-pairs-done','Every word has found its picture!');else narrateWordGame();}
 else if(action==='hint')speak('clue','Follow the little clue. You can do it.');
 else if(next.misses>before.misses)speak('try-again','Have another look. Take your time.');
 else if(action==='select'||action==='match'&&next.matched.length>before.matched.length)speak(`word-${value}`,value);
 else if(action==='tile'&&next.filled.length>before.filled.length){const w=next.filled.at(-1);speak(wordById(w)?`word-${w}`:`bookword-${w}`,w);}
 else if(action==='match'&&!before.selected)speak('wg-choose-word','Choose a word card first.');
}
function advanceWordGame(){
 if(screen!=='word-game'||!wordPlay)return;const before=wordPlay,next=nextWordGameRound(before);if(next===before)return;stopAudio();wordPlay=next;
 if(next.done){progress=completeWordGame(progress,next.kind);save();render();tone('win');confetti();speak('wg-done','Three little puzzles. A lovely bit of play.');}
 else{render();narrateWordGame();}
}
// Dragging is optional; the same cards always work with a tap or keyboard.
document.addEventListener('pointerdown',e=>{
 const el=e.target.closest('.wg-draggable');if(!el||el.disabled||screen!=='word-game'||wordPlay?.solved||wordPlay?.done||modal)return;
 wordPlayDrag={el,x:e.clientX,y:e.clientY,moved:false,state:wordPlay,action:el.dataset.action,letter:el.dataset.letter,word:el.dataset.word,index:Number(el.dataset.index)};el.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{
 const d=wordPlayDrag;if(!d)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>9)d.moved=true;if(!d.moved)return;
 e.preventDefault();d.el.style.transform=`translate(${e.clientX-d.x}px,${e.clientY-d.y}px)`;d.el.style.zIndex='12';
},{passive:false});
document.addEventListener('pointerup',e=>{
 const d=wordPlayDrag;if(!d)return;wordPlayDrag=null;d.el.style.transform='';d.el.style.zIndex='';
 if(!d.moved)return;suppressedClick=true;setTimeout(()=>suppressedClick=false,100);
 if(screen!=='word-game'||wordPlay!==d.state||modal)return;
 const targets=[...document.querySelectorAll('[data-game-drop]')];
 const target=targets.find(el=>{const r=el.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});
 if(!target)return;
 if(d.action==='wg-swap'&&target.dataset.gameDrop==='swap')playWordGame('swap',d.letter);
 else if(d.action==='wg-tile'&&target.dataset.gameDrop==='sentence')playWordGame('tile',d.index);
 else if(d.action==='wg-select'){playWordGame('select',d.word);playWordGame('match',target.dataset.gameDrop);}
});
document.addEventListener('pointercancel',()=>{if(wordPlayDrag){wordPlayDrag.el.style.transform='';wordPlayDrag.el.style.zIndex='';wordPlayDrag=null;}});
