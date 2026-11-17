import {TAU,clamp} from './core.js';

export function rideControls({canvas,state,inRun,action,release,pause,recenter}){
 const pointers=new Map(),heldKeys=new Set();
 const moves={
  KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',
  KeyW:'jump',ArrowUp:'jump',KeyS:'duck',ArrowDown:'duck',
  KeyF:'fly',KeyQ:'roll',KeyE:'flip',ShiftLeft:'boost',ShiftRight:'boost'
 };
 function orbit(dx,dy){
  const unit=TAU/Math.max(340,Math.min(canvas.clientWidth,canvas.clientHeight*1.75));
  const angle=state.az-dx*unit;
  state.az=Math.atan2(Math.sin(angle),Math.cos(angle));
  state.elev=clamp(state.elev+dy*unit*.68,-.53,1.47);
  state.needsRender=true;
 }
 function pair(){
  const [a,b]=pointers.values();
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,gap:Math.hypot(a.x-b.x,a.y-b.y)};
 }
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 });
 canvas.addEventListener('pointermove',e=>{
  const last=pointers.get(e.pointerId);if(!last)return;
  const before=pointers.size===2?pair():null;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(before){
   const current=pair();orbit(current.x-before.x,current.y-before.y);
   if(before.gap>1&&current.gap>1)state.zoom=clamp(state.zoom*before.gap/current.gap,.48,2.25);
  }else if(pointers.size===1)orbit(e.clientX-last.x,e.clientY-last.y);
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  canvas.addEventListener(type,e=>pointers.delete(e.pointerId));
 }
 canvas.addEventListener('dblclick',recenter);
 canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom*Math.exp(clamp(e.deltaY,-150,150)*.0018),.48,2.25);state.needsRender=true;},{passive:false});

 document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey||e.target.isContentEditable||e.target.matches?.('input,textarea,select'))return;
  const move=moves[e.code];
  if(move&&(inRun()||['left','right','jump','duck','fly'].includes(move))){
   e.preventDefault();
   if(!e.repeat&&!heldKeys.has(e.code)){
    const alreadyHeld=[...heldKeys].some(code=>moves[code]===move);
    heldKeys.add(e.code);if(!alreadyHeld)action(move);
   }
   return;
  }
  if(e.code==='Space'&&(e.target===canvas||e.target===document.body)){e.preventDefault();if(!e.repeat)pause();return;}
  if(e.target===canvas&&e.key==='Home'){e.preventDefault();recenter();}
 });
 document.addEventListener('keyup',e=>{
  if(heldKeys.delete(e.code)&&![...heldKeys].some(code=>moves[code]===moves[e.code]))release(moves[e.code]);
 });
 function clear(){pointers.clear();heldKeys.clear();release();}
 window.addEventListener('blur',clear);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
}
