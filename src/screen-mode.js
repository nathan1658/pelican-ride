// The edge-to-edge layout works independently of the browser's element fullscreen API.
export function screenMode(viewer,button,homeTip){
 const native=()=>document.fullscreenElement||document.webkitFullscreenElement;
 const request=viewer.requestFullscreen||viewer.webkitRequestFullscreen;
 const canRequest=!!request&&(document.fullscreenEnabled??document.webkitFullscreenEnabled??true);
 const installed=()=>navigator.standalone===true||matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 let expanded=false,enteredNative=false;
 function layout(on){
  expanded=on;viewer.classList.toggle('immersive',on);
  const selection=document.getSelection();
  if(on&&selection?.rangeCount&&viewer.contains(selection.anchorNode))selection.removeAllRanges();
  document.documentElement.classList.toggle('edge-to-edge',on);
  button.querySelector('use').setAttribute('href',on?'#i-shrink':'#i-full');
  button.setAttribute('aria-pressed',String(on));
  button.title=on?'还原画面':'全屏显示';button.setAttribute('aria-label',button.title);
  homeTip.hidden=!(ios&&!installed()&&!native());
 }
 function enter(){
  layout(true);
  if(canRequest&&!native()&&!installed()){
   try{Promise.resolve(request.call(viewer)).catch(()=>{});}catch{/* The viewport layout is already active. */}
  }
 }
 function leave(){
  layout(false);
  if(native()){
   const exit=document.exitFullscreen||document.webkitExitFullscreen;
   if(exit)try{Promise.resolve(exit.call(document)).catch(()=>{});}catch{}
  }
 }
 function nativeChanged(){
  const active=native()===viewer;
  if(active)layout(true);
  else if(enteredNative)layout(false);
  enteredNative=active;
 }
 button.onclick=()=>expanded?leave():enter();
 for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,nativeChanged);
 for(const name of ['selectstart','contextmenu','dragstart'])viewer.addEventListener(name,event=>event.preventDefault());
 layout(false);
 return {enter,leave,get expanded(){return expanded;}};
}
