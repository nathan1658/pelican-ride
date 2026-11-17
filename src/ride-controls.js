import {PI,TAU,clamp} from './core.js';

export function rideControls({canvas,state,inRun,action,release,pause,recenter}){
 const pointers=new Map();let gesture=null,swipe=null;
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function orbit(dx,dy){
  const unit=TAU/Math.max(340,Math.min(canvas.clientWidth,canvas.clientHeight*1.75));
  state.az=wrap(state.az-dx*unit);state.elev=clamp(state.elev+dy*unit*.68,-.53,1.47);
  state.needsRender=true;
 }
 function pair(){
  const [a,b]=[...pointers.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,gap:Math.hypot(a.x-b.x,a.y-b.y)};
 }
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){if(swipe?.move)release(swipe.move);gesture=pair();swipe=null;}
  else if(pointers.size===1&&e.pointerType==='touch'&&inRun())swipe={x:e.clientX,y:e.clientY,sent:false};
 });
 canvas.addEventListener('pointermove',e=>{
  const last=pointers.get(e.pointerId);if(!last)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
   const current=pair();
   if(gesture){orbit(current.x-gesture.x,current.y-gesture.y);state.zoom=clamp(state.zoom*(gesture.gap/Math.max(1,current.gap)),.48,2.25);}
   gesture=current;return;
  }
  if(pointers.size!==1)return;
  if(swipe){
   const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;if(swipe.sent||Math.hypot(dx,dy)<26)return;
   const move=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'jump':'duck');action(move);swipe.move=move;swipe.sent=true;
  }else orbit(e.clientX-last.x,e.clientY-last.y);
 });
 function end(e){pointers.delete(e.pointerId);gesture=null;if(swipe?.move)release(swipe.move);swipe=null;
  if(pointers.size===1&&e.pointerType==='touch'&&inRun())swipe={x:0,y:0,sent:true};
 }
 canvas.addEventListener('lostpointercapture',end);
 canvas.addEventListener('dblclick',recenter);
 canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom*Math.exp(clamp(e.deltaY,-150,150)*.0018),.48,2.25);state.needsRender=true;},{passive:false});
 const moves={KeyA:'left',KeyD:'right',KeyW:'jump',KeyS:'duck',KeyF:'fly',KeyQ:'roll',KeyE:'flip',ShiftLeft:'boost',ShiftRight:'boost'};
 document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey||e.target.isContentEditable||e.target.matches?.('input:not([type=range]),textarea,select'))return;
  if(moves[e.code]&&(inRun()||['left','right','jump','duck','fly'].includes(moves[e.code]))){e.preventDefault();if(!e.repeat)action(moves[e.code]);return;}
  if(e.code==='Space'&&(e.target===canvas||e.target===document.body)){e.preventDefault();if(!e.repeat)pause();return;}
  if(e.target!==canvas)return;
  if(e.key==='Home'){e.preventDefault();recenter();return;}
  const keys={ArrowLeft:[15,0],ArrowRight:[-15,0],ArrowUp:[0,14],ArrowDown:[0,-14]};
  if(keys[e.key]){e.preventDefault();orbit(...keys[e.key]);}
 });
 document.addEventListener('keyup',e=>{if(moves[e.code]&&!(moves[e.code]==='boost'&&e.shiftKey))release(moves[e.code]);});
 window.addEventListener('blur',()=>{pointers.clear();swipe=gesture=null;release();});
}
