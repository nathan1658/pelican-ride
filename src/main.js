import {birdTravel,flyawayAt} from './impact.js';
import {blastEffects} from './blast-fx.js';
import {ejectionRig} from './ejection.js';
import {boardwalkRun,laneZ,crashTips} from './runner.js';
import {touchPad} from './touch-pad.js';
import {screenMode} from './screen-mode.js';
import {rideControls} from './ride-controls.js';
import {prepareSunriseMap,lightCoast} from './daybreak.js';
import {pedalBalance} from './pedal-balance.js';
import {THREE,TAU,PI,LOOP_DISTANCE,V,clamp,mix} from './core.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {bicycle} from './bicycle.js';
import {pelican} from './pelican.js';
import {coast} from './coast.js';
const $=id=>document.getElementById(id),canvas=$('film'),stage=$('stage'),slider=$('timeline');
const seconds=32,lap=LOOP_DISTANCE;
const state={time:0,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,speed:1,shot:0,az:0,elev:0,zoom:1,seeking:false,needsRender:true};
let course=null,parked=null,cut=false,resultShown=false,lastEvent=-1;
const running=()=>!!course?.run.active;
function setIcon(el,id){el.querySelector('use').setAttribute('href','#i-'+id);}
function write(id,value){const el=$(id),s=String(value);if(el.textContent!==s)el.textContent=s;}
function tag(id,value){const el=$(id);el.hidden=!value;if(value)write(id,value);}
function gameHud(run){
 const flying=run.mode==='flight',air=run.mode!=='ground';
 $('arcadeActions').hidden=$('touchPad').hidden=!!run.crash;
 write('meters',Math.floor(run.distance));write('shells',run.shells);write('points',run.score.toLocaleString('en-US'));write('velocity',Math.round(run.speed*3.6));
 tag('altTag',air&&!run.crash?(run.mode==='approach'?'降落 ':flying?'飞行 ':'腾空 ')+run.y.toFixed(1)+' m':'');
 $('shieldTag').hidden=!run.shield;tag('magnetTag',run.magnet>0?'磁力 '+Math.ceil(run.magnet)+' s':'');
 tag('gustTag',run.gust>0?'顺风 '+Math.ceil(run.gust)+' s':'');tag('comboTag',run.combo>1?'连招 ×'+run.combo:'');
 $('runEvent').hidden=run.eventTime<=0||run.ended;
 if(run.eventId!==lastEvent){lastEvent=run.eventId;write('runEvent',run.event);$('runEvent').dataset.kind=run.eventKind;if(!muted&&audio&&run.eventKind!=='info'){if(run.eventKind==='impact')audio.impact(run.crash.high);else audio.chime(run.eventKind);}}
 $('flyButton').setAttribute('aria-pressed',String(flying));$('flyButton').querySelector('span').textContent=flying?'降落':'起飞';
 $('boostButton').setAttribute('aria-pressed',String(run.throttle&&state.playing));
 write('lateralGuide',flying?'转向':'换道');write('upGuide',flying?'爬升':'跳跃');write('downGuide',flying?'俯冲':'低身');
 write('swipeGuide','方向键操控 · 单指环视 · 捏合缩放');
 for(const [key,label] of [['jump',flying?'爬升':'跳跃'],['duck',flying?'俯冲':'低身']]){
  const button=$('touchPad').querySelector('[data-drive="'+key+'"]');
  if(button.getAttribute('aria-label')!==label){button.setAttribute('aria-label',label);button.querySelector('small').textContent=label;}
 }
 $('runHud').style.borderColor=run.pickup>0?'#ffc87b':'';
}
function syncControls(){
 $('viewer').classList.toggle('paused',!state.playing&&!course?.run.ended);
 setIcon($('play'),state.playing?'pause':'play');$('play').setAttribute('aria-label',state.playing?'暂停':'播放');$('elapsed').textContent='00:'+String(Math.floor(state.time)).padStart(2,'0');
 if(running()){
  gameHud(course.run);
  return;
 }
 slider.value=state.time;slider.style.setProperty('--pct',(state.time/seconds*100)+'%');slider.setAttribute('aria-valuetext',Math.floor(state.time)+' 秒，共 32 秒');
}
let audio=null,muted=true;
function connectSea(){
 const ctx=new (window.AudioContext||window.webkitAudioContext)(),n=ctx.sampleRate*7,buf=ctx.createBuffer(2,n,ctx.sampleRate);
 for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);let last=0;for(let i=0;i<n;i++){last=(last+(Math.random()*2-1)*.031)/1.026;d[i]=last*2.4;}}
 const surf=ctx.createBufferSource();surf.buffer=buf;surf.loop=true;
 const wash=ctx.createBiquadFilter();wash.type='lowpass';wash.frequency.value=1100;wash.Q.value=.32;
 const gain=ctx.createGain(),master=ctx.createGain();gain.gain.value=.23;master.gain.value=0;
 surf.connect(wash).connect(gain).connect(master).connect(ctx.destination);
 surf.start();
 const hiss=ctx.createBiquadFilter(),foamGain=ctx.createGain();hiss.type='highpass';hiss.frequency.value=950;foamGain.gain.value=0;
 surf.connect(hiss).connect(foamGain).connect(master);
 function surfAt(t){
  const phase=TAU*t*5/32;
  const spilling=.5+.5*Math.cos(phase-2.7),washBack=.5+.5*Math.sin(phase-1.75);
  gain.gain.setTargetAtTime(.135+.19*spilling,ctx.currentTime,.12);
  wash.frequency.setTargetAtTime(710+760*spilling,ctx.currentTime,.16);
  foamGain.gain.setTargetAtTime(.014+.069*washBack*washBack,ctx.currentTime,.18);
 }
 // A quiet rolling layer gives the two tires the rhythm of the timber joints.
 const roll=ctx.createBiquadFilter();roll.type='bandpass';roll.frequency.value=340;roll.Q.value=.81;
 const contact=ctx.createGain();contact.gain.value=.043;surf.connect(roll).connect(contact).connect(master);
 const frontWheel=ctx.createOscillator(),vibration=ctx.createGain();vibration.gain.value=.022;frontWheel.connect(vibration).connect(contact.gain);frontWheel.start();
 const train=ctx.createBiquadFilter();train.type='highpass';train.frequency.value=1600;
 const tick=ctx.createGain();tick.gain.value=.012;surf.connect(train).connect(tick).connect(master);
 const sprocket=ctx.createOscillator(),teeth=ctx.createGain();teeth.gain.value=.009;sprocket.connect(teeth).connect(tick.gain);sprocket.start();
 function setSpeed(value,contactWeight=1){contact.gain.setTargetAtTime(.043*contactWeight,ctx.currentTime,.085);vibration.gain.setTargetAtTime(.022*contactWeight,ctx.currentTime,.085);frontWheel.frequency.setTargetAtTime(21*value,ctx.currentTime,.045);sprocket.frequency.setTargetAtTime(20*value,ctx.currentTime,.045);}
 function chime(kind){
  const notes=kind==='trick'?[523,659,880]:kind==='shield'?[392,587]:kind==='magnet'?[494,740]:[440,660];
  notes.forEach((frequency,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),at=ctx.currentTime+i*.055;o.type='sine';o.frequency.value=frequency;
   g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.050,at+.013);g.gain.exponentialRampToValueAtTime(.0001,at+.25);
   o.connect(g).connect(master);o.start(at);o.stop(at+.26);o.onended=()=>{o.disconnect();g.disconnect();};});
 }
 function impact(high){
  const at=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';
  o.frequency.setValueAtTime(high?340:142,at);o.frequency.exponentialRampToValueAtTime(high?77:42,at+.18);
  g.gain.setValueAtTime(.001,at);g.gain.exponentialRampToValueAtTime(.19,at+.009);g.gain.exponentialRampToValueAtTime(.0001,at+.29);
  o.connect(g).connect(master);o.start(at);o.stop(at+.30);o.onended=()=>{o.disconnect();g.disconnect();};
  const knock=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();knock.buffer=buf;
  filter.type='bandpass';filter.frequency.value=high?1750:620;filter.Q.value=.7;knock.connect(filter).connect(amp).connect(master);
  amp.gain.setValueAtTime(.77,at);amp.gain.exponentialRampToValueAtTime(.001,at+.27);knock.start(at,1.2,.28);
  knock.onended=()=>{knock.disconnect();filter.disconnect();amp.disconnect();};
 }
 // Drive the boom and the airborne whistle from simulation time so a paused shot stays quiet.
 const blastNoise=ctx.createBufferSource(),noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
 const samples=noiseBuffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=2*Math.random()-1;
 blastNoise.buffer=noiseBuffer;blastNoise.loop=true;
 const lowpass=ctx.createBiquadFilter(),roar=ctx.createGain(),bass=ctx.createOscillator(),sub=ctx.createGain(),whistle=ctx.createOscillator(),air=ctx.createGain();
 lowpass.type='lowpass';lowpass.Q.value=.77;roar.gain.value=sub.gain.value=air.gain.value=0;
 blastNoise.connect(lowpass).connect(roar).connect(master);bass.connect(sub).connect(master);whistle.connect(air).connect(master);
 bass.type='sine';whistle.type='sine';blastNoise.start();bass.start();whistle.start();
 let lastBlast=-1;
 function setBlast(age){
  if(age===lastBlast)return;lastBlast=age;const now=ctx.currentTime,a=Math.max(0,age),attack=age>0?1-Math.exp(-68*a):0;
  roar.gain.setTargetAtTime(.99*attack*Math.exp(-2.65*a),now,.016);
  lowpass.frequency.setTargetAtTime(160+3500*Math.exp(-5.0*a),now,.020);
  bass.frequency.setTargetAtTime(39+91*Math.exp(-6*a),now,.020);
  sub.gain.setTargetAtTime(.34*attack*Math.exp(-2.9*a),now,.016);
  whistle.frequency.setTargetAtTime(310+1130*Math.exp(-1.22*a)+29*Math.sin(7*a),now,.035);
  air.gain.setTargetAtTime(age>0?.033*Math.exp(-((a-1.12)**2)/.39):0,now,.035);
 }
 setSpeed(state.speed);return{ctx,master,setSpeed,surfAt,chime,impact,setBlast};
}
function audioLevel(){if(audio)audio.master.gain.setTargetAtTime(!muted&&state.playing&&!document.hidden?.8:0,audio.ctx.currentTime,.16);}
function togglePlay(){if(course?.run.active&&course.run.ended)return;state.playing=!state.playing;if(!state.playing&&running()){clearPad();course.release();}state.needsRender=true;syncControls();audioLevel();}
$('play').onclick=togglePlay;
$('audio').onclick=async()=>{try{if(!audio)audio=connectSea();await audio.ctx.resume();muted=!muted;audioLevel();$('audio').setAttribute('aria-pressed',String(!muted));$('audio').setAttribute('aria-label',muted?'开启海浪与骑行声':'关闭环境音');$('audio').title=$('audio').getAttribute('aria-label');setIcon($('audio'),muted?'soundoff':'sound');}catch{$('audio').title='浏览器未启用 Web Audio';}};
$('speed').onclick=()=>{const speeds=[1,1.5,.5];state.speed=speeds[(speeds.indexOf(state.speed)+1)%3];if(audio)audio.setSpeed(state.speed);$('speed').textContent=state.speed+'×';$('speed').setAttribute('aria-label','播放速度 '+state.speed+' 倍，点击切换');};
function resetOrbit(){state.az=0;state.elev=0;state.zoom=1;state.needsRender=true;}
const shotNames=['跟拍镜头','肖像特写','海岸广角','传动特写'];
const shotButtons=[...document.querySelectorAll('[data-shot]')];
function shot(n){if(running())return;state.shot=n;resetOrbit();$('shotName').textContent=shotNames[n];shotButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===n)));}
shotButtons.forEach((b,i)=>b.onclick=()=>shot(i));
slider.oninput=()=>{state.time=Number(slider.value);state.needsRender=true;syncControls();};
slider.onpointerdown=()=>state.seeking=true;
window.addEventListener('pointerup',()=>state.seeking=false);window.addEventListener('pointercancel',()=>state.seeking=false);
const viewer=$('viewer'),screen=screenMode(viewer,$('full'),$('homeTip'));
$('pauseCamera').onclick=resetOrbit;
function updateMode(){
 const active=running();$('viewer').classList.toggle('running',active);$('rideMode').setAttribute('aria-pressed',String(active));
 $('rideMode').querySelector('span').textContent=active?'返回观景':'开始骑行';$('rideMode').title=active?'返回观景':'开始无尽骑行 · 方向键 / WASD';
 $('touchPad').hidden=$('runHud').hidden=$('runGuide').hidden=$('flightStrip').hidden=$('arcadeActions').hidden=!active;$('runEvent').hidden=true;$('resultPanel').hidden=true;resultShown=false;$('play').disabled=false;
 syncControls();audioLevel();
}
let autoExpanded=false;
function beginRun(){
 if(!course)return;
 if(!running()){
  parked={time:state.time,playing:state.playing,az:state.az,elev:state.elev,zoom:state.zoom};
  autoExpanded=!screen.expanded&&matchMedia('(any-pointer: coarse)').matches;
  if(autoExpanded)screen.enter();
 }
 clearPad();course.start();lastEvent=0;state.playing=true;resetOrbit();cut=true;updateMode();canvas.focus({preventScroll:true});
 if(audio)audio.setSpeed(course.run.speed/(lap/seconds));
}
function exitRun(){
 if(!running())return;clearPad();if(autoExpanded)screen.leave();autoExpanded=false;audio?.setBlast(-1);course.leave();Object.assign(state,parked);parked=null;
 cut=true;state.needsRender=true;updateMode();if(audio)audio.setSpeed(state.speed);canvas.focus({preventScroll:true});
}
function gameAction(move){
 if(!course)return;if(!running())beginRun();if(state.playing&&!course.run.ended)course.act(move);
}
function finishRun(){
 if(resultShown)return;resultShown=true;state.playing=false;$('play').disabled=true;syncControls();audioLevel();
 const run=course.run;$('hitMessage').textContent=crashTips[run.hit];
 $('resultStats').textContent=run.score.toLocaleString('en-US')+' 分　·　'+Math.floor(run.distance)+' m　·　'+run.shells+' 枚贝壳　·　'+run.stunts+' 次特技';
 write('bestStats','最高 '+run.bestScore.toLocaleString('en-US')+' 分　·　最远 '+run.best+' m');
 $('arcadeActions').hidden=true;
 $('resultPanel').hidden=false;$('retry').focus({preventScroll:true});
}
$('rideMode').onclick=()=>running()?exitRun():beginRun();
$('retry').onclick=beginRun;$('backToFilm').onclick=exitRun;$('chaseView').onclick=resetOrbit;
const clearPad=touchPad($('touchPad'),gameAction,key=>course?.release(key));
rideControls({canvas,state,inRun:running,action:gameAction,release:key=>course?.release(key),pause:togglePlay,recenter:resetOrbit});
for(const [id,key] of [['flyButton','fly'],['rollButton','roll'],['flipButton','flip']]){
 $(id).onclick=()=>{gameAction(key);course?.release(key);canvas.focus({preventScroll:true});};
}
const boost=$('boostButton');
boost.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();boost.setPointerCapture(e.pointerId);gameAction('boost');};
boost.onlostpointercapture=()=>course?.release('boost');
boost.onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)gameAction('boost');}};
boost.onkeyup=e=>{if(e.code==='Space'||e.code==='Enter')course?.release('boost');};
boost.onblur=()=>course?.release('boost');
boost.oncontextmenu=e=>e.preventDefault();
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if(screen.expanded)screen.leave();else if(running())exitRun();
});
window.addEventListener('blur',()=>{if(running()&&state.playing){state.playing=false;syncControls();audioLevel();}});
function assetBytes(id){const s=atob($(id).textContent.trim()),buf=new Uint8Array(s.length);for(let i=0;i<s.length;i++)buf[i]=s.charCodeAt(i);$(id).remove();return buf;}
async function main(){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xc8ccc0);scene.fog=new THREE.FogExp2(0xc6c4b8,.009);
 async function embeddedTexture(id){
  const src=URL.createObjectURL(new Blob([assetBytes(id)],{type:'image/webp'}));
  try{const tex=await new THREE.TextureLoader().loadAsync(src);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
  finally{URL.revokeObjectURL(src);}
 }
 const [pano,sand]=await Promise.all([embeddedTexture('skyAsset'),embeddedTexture('sandAsset')]);pano.wrapS=THREE.RepeatWrapping;
 const hdr=new HDRLoader().parse(assetBytes('lightAsset').buffer);prepareSunriseMap(hdr);
 const map=new THREE.DataTexture(hdr.data,hdr.width,hdr.height,THREE.RGBAFormat,hdr.type);map.mapping=THREE.EquirectangularReflectionMapping;map.flipY=true;map.minFilter=map.magFilter=THREE.LinearFilter;map.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer),light=pmrem.fromEquirectangular(map);scene.environment=light.texture;pmrem.dispose();map.dispose();const trackLight=lightCoast(scene);
 const chassis=new THREE.Group(),stuntPivot=new THREE.Group(),ride=new THREE.Group();scene.add(chassis);chassis.add(stuntPivot);stuntPivot.add(ride);
 stuntPivot.position.y=1.55;ride.position.y=-1.55;chassis.rotation.order='YXZ';
 const birdGroup=new THREE.Group(),bikeGroup=new THREE.Group();ride.add(bikeGroup,birdGroup);
 const eject=ejectionRig(ride,birdGroup,bikeGroup),cycle=bicycle(bikeGroup),rider=pelican(birdGroup),world=coast(scene,{pano,sand,reflect:renderer.extensions.has('EXT_color_buffer_float')});
 ride.traverse(part=>part.layers.enable(2));scene.traverse(part=>{if(part.isLight)part.layers.enable(2);});
 const blast=blastEffects(scene);
 course=boardwalkRun(scene);$('rideMode').disabled=false;
 const camera=new THREE.PerspectiveCamera(27,1,.06,400),focus=V(.07,1.51,0),desired=V(),look=V();let first=true,width=0,height=0;
 // Tracking, portrait, and a wide establishing view share the same time and rig.
 const views=[
  {a:.20,e:.065,y:1.52,x:.08,h:3.88,w:4.14},
  {a:.38,e:.06,y:2.46,x:.24,h:1.95,w:3.38},
  {a:-.36,e:.105,y:1.34,x:.2,h:5.05,w:6.3},
  {a:.32,e:.15,y:.99,x:-.08,h:1.91,w:3.42}
 ];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),crashAim=V(),flyawayOffset=V();
 let stamp=0,lastUi=-1,lastSound=-1000,transition=false,frames=0,dtMean=0;
 let orbitAngle=0,orbitHeight=.06,orbitRadius=8;
 const chase={a:-PI/2+.153,e:.348,y:1.23,x:2.30};
 function render(now){
  requestAnimationFrame(render);
  const dt=stamp?Math.min((now-stamp)/1000,.12):0;stamp=now;
  if(document.hidden)return;
  let w=stage.clientWidth,h=stage.clientHeight;if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();state.needsRender=true;}
  if(!state.playing&&!state.needsRender&&!transition)return;
  const active=running(),run=course.run;
  if(active&&state.playing){
   // Input, contact and collision advance in bounded steps even on a slow frame.
   let left=dt;while(left>1e-6&&!run.ended){const step=Math.min(1/90,left);course.step(step);left-=step;}
   if(run.ended)finishRun();
  }else if(!active&&state.playing&&!state.seeking){state.time=(state.time+dt*state.speed)%seconds;}
  const t=active?parked.time+run.elapsed:state.time,d=active?parked.time*lap/seconds+run.distance:t*lap/seconds;
  const phase=TAU*(16*(d%lap)/lap+.12),jumpHeight=active?run.y:0,lane=active?run.z:0;
  const load=pedalBalance(phase),pitch=active?run.pitch:0;
  const impact=active?run.crash:null,reveal=impact?.reveal||0;
  chassis.position.set(impact?.offsetX||0,jumpHeight+1.06*Math.abs(Math.sin(pitch))+.662*(1-Math.cos(pitch)),lane);chassis.rotation.set(load.frameRoll+(active?run.bank:0),active?run.heading:0,pitch,'YXZ');
  stuntPivot.rotation.set(active?run.roll:0,0,active?run.flip:0);
  eject.update(impact);blast.update(impact,eject.origin,eject.birdCenter);
  if(impact?.age)trackLight(eject.birdCenter.y-1.9,eject.birdCenter.z,eject.birdCenter.x);
  else trackLight(jumpHeight,lane);
  cycle.animate(phase,d,impact);rider.animate(t,phase,load,active?run.duck:0,active?run:null);world.animate(t,d,impact?.age?eject.bikeCenter.z:lane,impact?.age?Math.max(.27,eject.bikeCenter.y-.84):jumpHeight,active,impact?.age?eject.bikeCenter.x:0);
  audio?.setBlast(!muted&&state.playing&&impact?impact.age:-1);
  if(audio&&!muted&&state.playing&&now-lastSound>130){audio.surfAt(t);audio.setSpeed(active?run.speed/(lap/seconds):state.speed,active?Math.exp(-jumpHeight*3)*(impact?Math.exp(-6*impact.time):1):1);lastSound=now;}
  const v=active?chase:views[state.shot],age=impact?.age||0;
  const wide=THREE.MathUtils.smoothstep(age,0,.38),follow=THREE.MathUtils.smoothstep(age,.68,1.95);
  const fov=active?(impact?52+10*wide-20*follow:52+Math.round(Math.max(0,run.speed-8)*.41)):27;
  if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
  let radius=active?Math.max(10.0,(5.10+1.6*run.wing)/camera.aspect)*state.zoom:Math.max(v.h,v.w/camera.aspect)/(2*Math.tan(fov*PI/360))*state.zoom;
  const path=TAU*t/seconds,drift=active?0:state.shot===2?.068:state.shot===3?.034:.021;
  const rearView=Math.max(0,Math.cos(state.az))**3,az=v.a+state.az+drift*Math.sin(path)+1.10*reveal*rearView;
  if(active){
   // Lead the road in chase view; bring the orbit back onto the rider when looking side-on.
   const ahead=(v.x+.075*(run.speed-8)-1.4*reveal)*rearView*Math.min(1,state.zoom);
   look.set(ahead,mix(1.5,v.y,rearView)+jumpHeight*(1-.17*rearView),mix(lane,.84*lane+.16*laneZ(0),rearView));
  }else look.set(v.x,v.y,0);
  if(impact){
   const subjectWeight=.63+.35*follow;
   crashAim.copy(eject.origin).lerp(eject.birdCenter,subjectWeight);crashAim.y+=.43*(1-follow);
   look.lerp(crashAim,Math.max(reveal,THREE.MathUtils.smoothstep(age,0,.36)));
   const span=eject.birdCenter.distanceTo(eject.origin);
   const fit=Math.max(11.90,(5.8+span*.57*(1-follow))/Math.min(1,camera.aspect));
   radius=mix(radius,fit*(1+.12*wide-.32*follow)*state.zoom,reveal);
  }
  const minEl=Math.asin(clamp((.22-look.y)/radius,-.95,.95));
  const el=clamp(v.e-.325*reveal+state.elev+(active?0:.007*Math.sin(2*path)),minEl,1.485);
  const snap=first||cut||matchMedia('(prefers-reduced-motion: reduce)').matches,ease=snap?1:1-Math.exp(-dt*10);
  const deltaA=Math.atan2(Math.sin(az-orbitAngle),Math.cos(az-orbitAngle));
  orbitAngle+=deltaA*ease;orbitHeight=mix(orbitHeight,el,ease);orbitRadius=mix(orbitRadius,radius,ease);focus.lerp(look,ease);
  desired.set(focus.x+Math.sin(orbitAngle)*Math.cos(orbitHeight)*orbitRadius,Math.max(.20,focus.y+Math.sin(orbitHeight)*orbitRadius),focus.z+Math.cos(orbitAngle)*Math.cos(orbitHeight)*orbitRadius);
    if(age>flyawayAt){
   birdTravel(impact,flyawayAt,flyawayOffset);
   flyawayOffset.x-=impact.bird.x;flyawayOffset.y-=impact.bird.y;flyawayOffset.z-=impact.bird.z;
   desired.addScaledVector(flyawayOffset,THREE.MathUtils.smoothstep(age,flyawayAt,flyawayAt+.50)*.96);
  }
  if(age>0&&!reduced.matches){
   const kick=(1-Math.exp(-38*age))*Math.exp(-6.2*age)*impact.strength;
   desired.y+=.27*kick*Math.sin(49*age);desired.z+=.19*kick*Math.sin(62*age);
  }
  camera.position.copy(desired);camera.lookAt(focus);
  transition=!snap&&(Math.abs(deltaA)+Math.abs(orbitHeight-el)+Math.abs(orbitRadius-radius)+focus.distanceTo(look))>.0008;cut=false;
  first=false;state.needsRender=false;renderer.render(scene,camera);
  if(now-lastUi>65||!state.playing||state.seeking){syncControls();lastUi=now;}
  if(!$('loading').hidden)$('loading').hidden=true;
  // Bound pixel cost on high-density displays while retaining native CSS layout.
  if(state.playing&&dt>0){dtMean+=dt;frames++;if(frames===95){if(dtMean/frames>.044&&renderer.getPixelRatio()>1){renderer.setPixelRatio(Math.max(1,renderer.getPixelRatio()*.8));state.needsRender=true;}dtMean=0;frames=0;}}
 }
 document.addEventListener('visibilitychange',()=>{stamp=0;state.needsRender=true;if(document.hidden&&running()){state.playing=false;course.release();syncControls();}audioLevel();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').hidden=false;$('status').textContent='图形环境已暂停，正在恢复…';});
 canvas.addEventListener('webglcontextrestored',()=>{location.reload();});
 syncControls();requestAnimationFrame(render);
}
main().catch(error=>{
 console.error(error);$('status').textContent='当前为静帧预览。请在支持 WebGL 2 的浏览器中开启硬件加速以播放动画。';
 document.querySelector('.spin').hidden=true;
 for(const el of [$('play'),$('speed'),$('timeline'),$('audio'),$('rideMode'),...shotButtons])el.disabled=true;
});
