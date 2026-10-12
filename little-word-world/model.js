export const WORDS = [
  {id:'sun', sprite:0, world:0, intro:'Let’s bring some sunshine to our garden.', reward:'You made the sun shine!', x:72, y:22, size:110},
  {id:'cat', sprite:1, world:0, intro:'A little friend is waiting to meet you.', reward:'A cat has come to play!', x:48, y:68, size:132},
  {id:'hat', sprite:2, world:0, intro:'Our cat would love a little hat.', reward:'A lovely hat for a sunny day!', x:64, y:69, size:106},
  {id:'log', sprite:4, world:1, intro:'Let’s find a seat beside the pond.', reward:'A little log beside the pond!', x:74, y:73, size:143},
  {id:'dog', sprite:3, world:1, intro:'Someone is looking for a new friend.', reward:'Your dog is so happy to see you!', x:33, y:76, size:138},
  {id:'bug', sprite:5, world:1, intro:'Who is hiding in the garden?', reward:'A tiny bug with a big adventure!', x:68, y:83, size:78},
  {id:'fox', sprite:6, world:2, intro:'A woodland visitor is waiting to meet you.', reward:'A curious fox has come to visit!', x:22, y:66, size:127},
  {id:'hen', sprite:7, world:2, intro:'Let’s meet a feathered garden friend.', reward:'A friendly hen for your garden!', x:84, y:67, size:118},
  {id:'cup', sprite:8, world:2, intro:'It’s time for a tiny garden picnic.', reward:'A little cup for our picnic!', x:56, y:83, size:82}
];
export const WORLDS = [
 {name:'Sunny garden', subtitle:'A little sunshine & a new friend', words:['sun','cat','hat'], icon:'sun', color:'gold'},
 {name:'By the pond', subtitle:'Little paws & tiny discoveries', words:['log','dog','bug'], icon:'bug', color:'blue'},
 {name:'Picnic time', subtitle:'Garden friends come to play', words:['fox','hen','cup'], icon:'fox', color:'rose'}
];
export const STORIES = [
 {parts:['a','cat','in','a'], answer:'hat', cast:['cat','hat'], options:['hat','sun','cup'], label:'A sunny-day surprise'},
 {parts:['a','bug','on','a'], answer:'log', cast:['bug','log'], options:['log','dog','hat'], label:'A tiny adventure'},
 {parts:['a','fox','and','a'], answer:'hen', cast:['fox','hen'], options:['hen','cup','cat'], label:'Friends for a picnic'}
];
export const LEVELS = {
 sprout:{name:'Little sprout', detail:'Match letters and build words with clues.', choices:2, ghost:true},
 grow:{name:'Growing reader', detail:'Build new words. Try fresh reading checks on familiar words.', choices:3, ghost:false},
 bloom:{name:'Ready to bloom', detail:'Start with a fresh reading check, with help on tap.', choices:3, ghost:false}
};
// Spelled-out letter names prevent speech engines from adding "capital".
export const LETTER_NAMES = {a:'ay',b:'bee',c:'see',d:'dee',e:'ee',f:'eff',g:'jee',h:'aitch',i:'eye',j:'jay',k:'kay',l:'ell',m:'em',n:'en',o:'oh',p:'pee',q:'cue',r:'ar',s:'ess',t:'tee',u:'you',v:'vee',w:'double you',x:'ex',y:'why',z:'zee'};
export const wordById = id => WORDS.find(w=>w.id===id);
export function freshProgress(){return {version:1, collected:[], practice:{}, positions:{}, level:'sprout', muted:false, calm:false, stories:[], world:0,adaptive:true,reading:{},adventure:{step:0,ready:false},finishedTrips:0,books:[],bookmarks:{},wordGames:{swap:0,pairs:0,sentence:0}};}
export function sanitizeProgress(value){
 const base=freshProgress(); if(!value || typeof value!=='object' || value.version!==1)return base;
 const ids=new Set(WORDS.map(w=>w.id));
 const currentId=id=>id==='pig'?'fox':id;
 base.collected=[...new Set(Array.isArray(value.collected)?value.collected.map(currentId).filter(id=>ids.has(id)):[])];
 base.stories=[...new Set(Array.isArray(value.stories)?value.stories.filter(i=>Number.isInteger(i)&&i>=0&&i<3):[])];
 base.level=Object.hasOwn(LEVELS,value.level)?value.level:base.level;
 base.muted=value.muted===true;base.calm=value.calm===true;
 base.world=Number.isInteger(value.world)&&value.world>=0&&value.world<3?value.world:0;
 for(const id of ids){
  const oldId=id==='fox'?'pig':id;
  const n=value.practice?.[id]??value.practice?.[oldId];if(Number.isFinite(n)&&n>0)base.practice[id]=Math.min(100000,Math.floor(n));
  const p=value.positions?.[id]??value.positions?.[oldId];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))base.positions[id]={x:Math.min(92,Math.max(8,p.x)),y:Math.min(85,Math.max(24,p.y))};
 }
 base.adaptive=value.adaptive!==false;
 base.finishedTrips=boundedCount(value.finishedTrips);
 for(const kind of Object.keys(base.wordGames))base.wordGames[kind]=boundedCount(value.wordGames?.[kind]);
 const step=Number.isInteger(value.adventure?.step)?Math.max(0,Math.min(3,value.adventure.step)):0;
 base.adventure={step,ready:step<3&&value.adventure?.ready===true};
 base.books=[...new Set(Array.isArray(value.books)?value.books.filter(id=>BOOKS.some(b=>b.id===id)):[])];
 for(const book of BOOKS){const page=value.bookmarks?.[book.id];if(Number.isInteger(page)&&page>=0&&page<book.pages.length)base.bookmarks[book.id]=page;}
 for(const id of ids){
  const r=value.reading?.[id];if(!r||typeof r!=='object')continue;
  base.reading[id]={independent:boundedCount(r.independent),assisted:boundedCount(r.assisted),attempts:boundedCount(r.attempts),streak:Math.min(5,boundedCount(r.streak)),lastSeen:safeTime(r.lastSeen),lastIndependent:safeTime(r.lastIndependent),reviewAt:safeTime(r.reviewAt)};
 }
 return base;
}
export function shuffle(values,rng=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function choicesFor(id,count=3,rng=Math.random){
 const same=WORDS.filter(w=>w.id!==id).sort((a,b)=>{
  const score=w=>(w.id.slice(1)===id.slice(1)?4:0)+(w.id[0]===id[0]?2:0)+(w.id[1]===id[1]?1:0);
  return score(b)-score(a);
 });
 return shuffle([id,...same.slice(0,count-1).map(w=>w.id)],rng);
}
export function nextWord(progress,world=progress.world){return WORLDS[world].words.find(id=>!progress.collected.includes(id)) || WORLDS[world].words.reduce((a,b)=>(progress.practice[a]||0)<=(progress.practice[b]||0)?a:b);}
export function completeWord(progress,id){
 if(!wordById(id))return progress;
 return {...progress,collected:[...new Set([...progress.collected,id])],practice:{...progress.practice,[id]:(progress.practice[id]||0)+1}};
}
export function chapterDone(progress,world){return WORLDS[world].words.every(id=>progress.collected.includes(id));}
export function validateLetter(word,filled,letter){return filled.length<word.length&&word[filled.length]===letter;}

export const MISSIONS=[
 {word:'log',title:'A bridge for Fox',prompt:'Fox needs a way across. Let’s build a log bridge.',action:'Place the log',done:'The log makes a bridge.'},
 {word:'fox',title:'Across the stream',prompt:'The bridge is ready. Help Fox take a little walk.',action:'Help Fox cross',done:'Fox is safely across!'},
 {word:'cup',title:'A little picnic',prompt:'A cup for our picnic. Let’s get it ready.',action:'Set out the cup',done:'Our picnic is ready!'}
];
export const BOOKS=[
 {id:'cat',title:'A hat for Cat',cover:'cat',prompt:'Where would you put the hat?',pages:[{words:['a','cat'],cast:['cat']},{words:['a','hat'],cast:['hat']},{words:['a','cat','in','a','hat'],cast:['cat','hat'],answer:'hat',options:['hat','cup','log']}]},
 {id:'bug',title:'A little visitor',cover:'bug',prompt:'Can you spot a tiny visitor outside?',pages:[{words:['a','log'],cast:['log']},{words:['a','bug'],cast:['bug']},{words:['a','bug','on','a','log'],cast:['bug','log'],answer:'log',options:['log','hat','cup']}]},
 {id:'fox',title:'Fox has a picnic',cover:'fox',prompt:'What would you bring to a picnic?',pages:[{words:['a','log'],cast:['log']},{words:['a','fox','on','a','log'],cast:['fox','log']},{words:['a','fox','and','a','cup'],cast:['fox','cup'],answer:'cup',options:['cup','hat','sun']}]}
];
const boundedCount=n=>Number.isFinite(n)&&n>0?Math.min(100000,Math.floor(n)):0;
const safeTime=n=>Number.isFinite(n)&&n>0?Math.min(8640000000000000,Math.floor(n)):0;
export function supportFor(p,id){
 const r=p.reading[id]||{},seen=(r.assisted||0)+(r.independent||0);
 const retrieval=p.level==='bloom'||(p.collected.includes(id)&&(p.level==='grow'||p.adaptive&&seen>=2));
 return {retrieval,ghost:p.level==='sprout'&&!(p.adaptive&&seen>=2),choices:p.level==='sprout'&&!retrieval?2:3};
}
export function recordReading(p,id,evidence={},now=Date.now()){
 if(!wordById(id))return p;
 const old=p.reading[id]||{independent:0,assisted:0,attempts:0,streak:0,lastSeen:0,lastIndependent:0,reviewAt:0};
 const independent=evidence.retrieval===true&&!evidence.heardTarget&&!evidence.hints&&!evidence.mistakes&&!evidence.revealed;
 const streak=independent?Math.min(5,old.streak+1):0;
 const waitDays=independent?[1,2,4,7,14][streak-1]:0;
 return {...p,reading:{...p.reading,[id]:{independent:old.independent+(independent?1:0),assisted:old.assisted+(independent?0:1),attempts:old.attempts+1,streak,lastSeen:now,lastIndependent:independent?now:old.lastIndependent,reviewAt:now+waitDays*86400000}}};
}
export function reviewWord(p,now=Date.now()){
 const pool=p.collected.length?p.collected:WORDS.map(w=>w.id);
 return [...pool].sort((a,b)=>{
  const ar=p.reading[a]||{},br=p.reading[b]||{};
  const ad=(ar.reviewAt||0)<=now,bd=(br.reviewAt||0)<=now;
  return Number(bd)-Number(ad)||(ar.reviewAt||0)-(br.reviewAt||0)||(ar.lastSeen||0)-(br.lastSeen||0);
 })[0];
}
export function prepareMission(p,id){return MISSIONS[p.adventure.step]?.word===id?{...p,adventure:{...p.adventure,ready:true}}:p;}
export function actMission(p){
 if(!p.adventure.ready||p.adventure.step>=3)return p;
 const step=p.adventure.step+1;
 return {...p,adventure:{step,ready:false},finishedTrips:p.finishedTrips+(step===3?1:0)};
}

export const WORD_GAMES={
 swap:{name:'Word changers',detail:'One new letter. A new little discovery.',cover:'hat',icon:'spark'},
 pairs:{name:'Picture pairs',detail:'Find a picture for every word.',cover:'bug',icon:'leaf'},
 sentence:{name:'Story builders',detail:'Put little words into a story.',cover:'fox',icon:'book'}
};
export const WORD_CHANGES=[
 {from:'cat',to:'hat',index:0,letters:['h','d','f'],scene:'cat'},
 {from:'dog',to:'log',index:0,letters:['l','c','h'],scene:'dog'},
 {from:'hat',to:'cat',index:0,letters:['c','b','s'],scene:'cat'},
 {from:'log',to:'dog',index:0,letters:['d','f','h'],scene:'dog'}
];
export const SENTENCE_PUZZLES=STORIES.map((s,index)=>({
 index,scene:s.cast[0],words:[...s.parts,s.answer],
 variants:index===2?[[...s.parts,s.answer],['a','hen','and','a','fox']]:[[...s.parts,s.answer]]
}));
function resetGameRound(state){return {...state,solved:false,selected:null,matched:[],filled:[],used:[],hint:false,misses:0,feedback:''};}
export function createWordGame(kind,visits=0,rng=Math.random){
 if(!Object.hasOwn(WORD_GAMES,kind))return null;
 const count=boundedCount(visits);
 const source=kind==='swap'?WORD_CHANGES:kind==='pairs'?WORLDS:SENTENCE_PUZZLES;
 const rounds=Array.from({length:3},(_,i)=>{
  const item=source[(count+i)%source.length];
  if(kind==='swap')return {...item,letters:shuffle(item.letters,rng)};
  if(kind==='pairs')return {words:[...item.words],wordOrder:shuffle(item.words,rng),pictureOrder:shuffle(item.words,rng)};
  return {...item,bank:shuffle(item.words.map((word,id)=>({word,id})),rng)};
 });
 return resetGameRound({kind,round:0,rounds,done:false});
}
export const currentGameRound=state=>state.rounds[state.round];
export function sentenceNextWords(state){
 if(state.kind!=='sentence'||state.done)return [];
 return [...new Set(currentGameRound(state).variants.filter(words=>state.filled.every((word,i)=>words[i]===word)).map(words=>words[state.filled.length]).filter(Boolean))];
}
function gameMiss(state,message){return {...state,misses:state.misses+1,hint:state.hint||state.misses>=1,feedback:message};}
export function chooseWordGame(state,action,value){
 if(!state||state.done||state.solved)return state;
 const round=currentGameRound(state);
 if(action==='hint')return {...state,hint:true,selected:state.kind==='pairs'?(state.selected||round.words.find(w=>!state.matched.includes(w))):state.selected,feedback:'Pip has left a little clue.'};
 if(state.kind==='swap'&&action==='swap'){
  if(!round.letters.includes(value))return state;
  if(value!==round.to[round.index])return gameMiss(state,'Try another letter. Look at the little picture.');
  return {...state,solved:true,feedback:`${round.from} became ${round.to}!`};
 }
 if(state.kind==='pairs'){
  if(!round.words.includes(value)||state.matched.includes(value))return state;
  if(action==='select')return {...state,selected:value,feedback:'Now find its picture.'};
  if(action==='match'){
   if(!state.selected)return {...state,feedback:'Choose a word card first.'};
   if(value!==state.selected)return gameMiss(state,'Have another look. Which picture belongs to your word?');
   const matched=[...state.matched,value];
   return {...state,matched,selected:null,hint:false,misses:0,solved:matched.length===round.words.length,feedback:matched.length===round.words.length?'Every word has found its picture!':'A lovely pair. Choose another word.'};
  }
 }
 if(state.kind==='sentence'){
  if(action==='undo')return {...state,filled:state.filled.slice(0,-1),used:state.used.slice(0,-1),feedback:'',hint:false};
  if(action==='tile'){
   const tile=round.bank.find(t=>t.id===value);if(!tile||state.used.includes(value))return state;
   if(!sentenceNextWords(state).includes(tile.word))return gameMiss(state,'Try another word. You can listen to the story again.');
   const filled=[...state.filled,tile.word];
   return {...state,filled,used:[...state.used,value],hint:false,misses:0,solved:filled.length===round.words.length,feedback:filled.length===round.words.length?'You built a little story!':''};
  }
 }
 return state;
}
export function nextWordGameRound(state){
 if(!state?.solved||state.done)return state;
 return state.round===state.rounds.length-1?{...state,done:true}:resetGameRound({...state,round:state.round+1});
}
export function completeWordGame(progress,kind){
 if(!Object.hasOwn(WORD_GAMES,kind))return progress;
 return {...progress,wordGames:{...progress.wordGames,[kind]:Math.min(100000,progress.wordGames[kind]+1)}};
}
