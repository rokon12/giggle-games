// Inference happens only in this worker after the grown-up opts in.
// Remote origins supply static runtime/model files; no inference endpoint is used.
import {CHARACTERS,ACTIONS,OBJECTS} from './local-ai.js';
let generator=null,loading=false,busy=false;
self.onmessage=async({data})=>{
 try{
  if(data.type==='load'&&!generator&&!loading){
   loading=true;const adapter=await navigator.gpu?.requestAdapter();
   if(!adapter?.features.has('shader-f16')){self.postMessage({type:'error',code:'unsupported'});return;}
   const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
   env.allowLocalModels=false;env.useBrowserCache=true;
   generator=await pipeline('text-generation','onnx-community/SmolLM2-135M-Instruct-ONNX',{
    device:'webgpu',dtype:'q4f16',
    progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'progress',percent:p.file?.endsWith('.onnx')?Math.round(p.progress||0):0,message:p.file?.endsWith('.onnx')?'Downloading the little model…':'Preparing model files…'});else if(p.status==='done')self.postMessage({type:'progress',message:'Preparing the model on your device…'});}
   });
   self.postMessage({type:'ready'});loading=false;
  }
  if(data.type==='plan'&&generator&&!busy){
   busy=true;const cast=CHARACTERS.filter(c=>data.collected.includes(c));const props=OBJECTS.filter(c=>data.collected.includes(c));
   const prompt=[{role:'system',content:'You choose pieces of a gentle garden story. Reply with only one JSON object. Use exactly the three keys character, action, object. Choose only from the supplied lists. No explanations.'},{role:'user',content:`Characters: ${(cast.length?cast:CHARACTERS).join(', ')}. Actions: ${ACTIONS.join(', ')}. Objects: ${(props.length?props:OBJECTS).join(', ')}. Choose one from each list. Output format: {"character":"cat","action":"play","object":"sun"}`}];
   const result=await generator(prompt,{max_new_tokens:55,do_sample:true,temperature:.7,top_p:.85,return_full_text:false});
   const output=result[0].generated_text;const text=typeof output==='string'?output:output.at(-1)?.content||'';
   self.postMessage({type:'result',id:data.id,text});busy=false;
  }
 }catch{busy=false;loading=false;self.postMessage({type:'error',code:'runtime'});}
};
