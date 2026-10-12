export const CHARACTERS=['cat','dog','fox','hen','bug'];
export const ACTIONS=['play','rest','look'];
export const OBJECTS=['sun','hat','log','cup'];
export function fallbackPlan(collected=[],rng=Math.random){
 const cast=CHARACTERS.filter(c=>collected.includes(c));const props=OBJECTS.filter(c=>collected.includes(c));
 return {character:(cast.length?cast:['cat'])[Math.floor(rng()*(cast.length||1))],action:ACTIONS[Math.floor(rng()*ACTIONS.length)],object:(props.length?props:['sun'])[Math.floor(rng()*(props.length||1))]};
}
export function validatePlan(raw,collected=[]){
 try{const match=typeof raw==='string'?raw.match(/\{[^{}]*\}/):null;const p=match?JSON.parse(match[0]):raw;
 if(!p||!CHARACTERS.includes(p.character)||!ACTIONS.includes(p.action)||!OBJECTS.includes(p.object))return null;
 const cast=CHARACTERS.filter(c=>collected.includes(c)),props=OBJECTS.filter(c=>collected.includes(c));
 if(cast.length&&!cast.includes(p.character)||props.length&&!props.includes(p.object))return null;
 return {character:p.character,action:p.action,object:p.object};
 }catch{return null;}
}
export function storyFromPlan(plan){
 const p=validatePlan(plan)||{character:'cat',action:'play',object:'sun'};
 const place=p.object==='sun'?'in the sun':`by the ${p.object}`;
 if(p.action==='rest')return `The ${p.character} has a nap ${place}. Pip is quiet. Rest well, little friend.`;
 if(p.action==='look')return `The ${p.character} looks at the ${p.object}. Pip looks too. What can you see?`;
 return `The ${p.character} plays ${place}. Pip joins in. What a lovely day!`;
}
export function helperErrorMessage(code){
 const messages={
  unsupported:'This device lacks the GPU support this model needs. Built-in stories are still available.',
  device:'The browser could not access this device’s GPU. Built-in stories are still available.',
  runtime:'The AI software could not download. Try again when the download servers are reachable. Built-in stories still work.',
  model:'The model could not start on this device. Built-in stories still work.',
  warmup:'The model loaded, but could not run on this device. Built-in stories still work.',
  inference:'The local model stopped while choosing a story. Built-in stories still work.'
 };
 return messages[code]||messages.model;
}
export class LocalHelper{
 constructor(onChange=()=>{}){this.status='off';this.message='';this.percent=0;this.worker=null;this.pending=null;this.onChange=onChange;this.loadTimer=null;this.sequence=0;}
 notify(){this.onChange();}
 enable(){
  if(this.status==='loading'||this.status==='ready')return;
  if(typeof Worker==='undefined'||!globalThis.isSecureContext||!navigator.gpu){this.status='error';this.message='This browser does not offer WebGPU here. The built-in stories are ready to play.';this.notify();return;}
  this.status='loading';this.percent=0;this.message='Checking this device, then downloading the local helper…';this.notify();
  try{const worker=this.worker=new Worker(globalThis.__LWW_WORKER_URL__||new URL('./ai-worker.js?v=helperfix2',import.meta.url),{type:'module'});worker.onmessage=({data})=>{
   if(this.worker!==worker)return;
   if(data.type==='progress'){const percent=Number(data.percent);if(Number.isFinite(percent))this.percent=Math.max(this.percent,Math.min(99,percent));this.message=data.message||'Downloading the model…';this.notify();}
   if(data.type==='ready'){clearTimeout(this.loadTimer);this.status='ready';this.percent=100;this.message='';this.notify();}
   if(data.type==='result'&&this.pending?.id===data.id){const p=this.pending;clearTimeout(p.timer);this.pending=null;p.resolve(validatePlan(data.text,p.collected)||fallbackPlan(p.collected));}
   if(data.type==='error'){console.error('[Pip local helper]',data.code,data.detail||'');this.fail(helperErrorMessage(data.code));}
  };worker.onerror=()=>{if(this.worker===worker)this.fail('This browser could not start the local helper. Built-in stories still work.');};
  this.loadTimer=setTimeout(()=>{if(this.worker===worker)this.fail('The download took too long. You can try again when your connection is ready.');},240000);worker.postMessage({type:'load'});
  }catch{this.fail('The local helper is unavailable in this browser. Built-in stories still work.');}
 }
 fail(message){this.stop();this.status='error';this.message=message;this.notify();}
 plan(collected){
  if(this.status!=='ready'||this.pending)return Promise.resolve(fallbackPlan(collected));
  return new Promise(resolve=>{const id=++this.sequence;const timer=setTimeout(()=>this.fail('The helper was taking too long, so Pip chose a built-in story.'),15000);this.pending={id,resolve,collected:[...collected],timer};try{this.worker.postMessage({type:'plan',id,collected});}catch{this.fail(helperErrorMessage('inference'));}});
 }
 stop(){clearTimeout(this.loadTimer);this.worker?.terminate();this.worker=null;if(this.pending){clearTimeout(this.pending.timer);this.pending.resolve(fallbackPlan(this.pending.collected));this.pending=null;}this.status='off';this.percent=0;this.message='';this.notify();}
}
