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
 sprout:{name:'Little sprout', detail:'Match letters with plenty of help.', choices:2, ghost:true},
 grow:{name:'Growing reader', detail:'Build words, then find what they mean.', choices:3, ghost:false},
 bloom:{name:'Ready to bloom', detail:'Read independently, with help on tap.', choices:3, ghost:false}
};
// Spelled-out letter names prevent speech engines from adding "capital".
export const LETTER_NAMES = {a:'ay',b:'bee',c:'see',d:'dee',e:'ee',f:'eff',g:'jee',h:'aitch',i:'eye',j:'jay',k:'kay',l:'ell',m:'em',n:'en',o:'oh',p:'pee',q:'cue',r:'ar',s:'ess',t:'tee',u:'you',v:'vee',w:'double you',x:'ex',y:'why',z:'zee'};
export const wordById = id => WORDS.find(w=>w.id===id);
export function freshProgress(){return {version:1, collected:[], practice:{}, positions:{}, level:'sprout', muted:false, calm:false, stories:[], world:0};}
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
