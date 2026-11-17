import {THREE,PI,TAU,clamp,mix,group} from './core.js';
import {beginImpact,advanceImpact,impactNames} from './impact.js';
import {courseProps} from './course-props.js';
import {rideMotion,laneZ,trickName} from './ride-motion.js';
export {laneZ};

const lanes=[-1,0,1],powers=['shield','magnet','gust'];
const hazards=['log','hoop','pot','buoy','net'];
export const crashTips={
 log:'遇到了漂木。跳过漂木，或换道绕行。',hoop:'碰到了横杆。在杆前低身，或飞过杆顶。',
 pot:'碰到了龙虾笼。沿着贝壳换道，也可以跳过笼顶。',buoy:'碰到了系泊浮标。提前跳跃或向旁边换道。',
 net:'碰到了渔网。低身穿过橙色浮子下方，或飞过整张网。'
};
const powerName={shield:'护盾',magnet:'贝壳磁力',gust:'顺风加速'};
const powerColor={shield:0x91f8dc,magnet:0xffab82,gust:0xffdc70,gate:0xffda79,shell:0xffe4a8};
function bursts(parent){
 const count=54,parts=[],dummy=new THREE.Object3D(),color=new THREE.Color();
 const mesh=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.048),new THREE.MeshBasicMaterial({toneMapped:false}),count);
 mesh.frustumCulled=false;parent.add(mesh);let cursor=0;
 function clear(){parts.length=0;mesh.count=0;cursor=0;}
 function emit(n,x,y,z,tint){
  for(let i=0;i<n;i++){
   const a=TAU*(i*.618+cursor*.27),s=.75+.37*(i%4);
   parts[cursor]={x,y,z,vx:-1.2+Math.cos(a)*s,vy:.8+1.6*Math.sin(i*2.37),vz:Math.sin(a)*s,life:.54+(i%3)*.1,tint};
   cursor=(cursor+1)%count;
  }
 }
 function step(dt,distance){
  let used=0;for(const p of parts){if(!p||p.life<=0)continue;
   p.life-=dt;p.x+=(p.vx*dt-distance*.52);p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=2.3*dt;
   dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(Math.max(0,p.life)*1.7);dummy.rotation.set(p.life*4,0,p.life*9);dummy.updateMatrix();
   mesh.setMatrixAt(used,dummy.matrix);mesh.setColorAt(used++,color.setHex(p.tint));
  }mesh.count=used;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 }
 clear();return {clear,emit,step};
}
export function boardwalkRun(scene){
 const course=group(scene),templates=courseProps(),pool=Object.fromEntries(Object.keys(templates).map(k=>[k,[]]));
 const sparks=bursts(course);course.visible=false;
 function stored(key){try{return Math.max(0,Number(localStorage.getItem(key))||0);}catch{return 0;}}
 const run={active:false,ended:false,best:stored('pelican-ride-distance'),bestScore:stored('pelican-ride-score')};
 let items=[],nextAt=23,row=0,seed=1,points=0,chainTime=0,lastTrick='',lastGate=-1;
 function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 function notify(label,kind='info',duration=1.45){
  run.event=label;run.eventKind=kind;run.eventTime=duration;run.eventId++;
 }
 function score(){run.score=Math.floor(run.distance)+points;}
 function reward(type){
  const diverse=type!==lastTrick;
  run.combo=chainTime>0?Math.min(5,run.combo+(diverse?1:0)):1;chainTime=4.4;lastTrick=type;
  const award=(type==='gate'?110:type==='roll'?140:200)*run.combo;
  points+=award;score();if(type!=='gate')run.stunts++;
  notify((type==='gate'?'穿环':trickName[type])+' +'+award+(run.combo>1?'　×'+run.combo:''),'trick');
  sparks.emit(15,0,run.y+1.6,run.z,0xffdd86);
 }
 const motion=rideMotion(run,reward,label=>notify(label));
 function place(type,x,lane,y=0,z=laneZ(lane)){
  const object=pool[type].pop()||templates[type].clone(true);
  if(!object.parent)course.add(object);object.name=type;
  object.visible=true;object.position.set(x-run.distance,y,z);object.rotation.set(0,0,0);object.scale.setScalar(1);
  items.push({type,x,y,z,lane,object,done:false,pulling:false});
 }
 function retire(item){item.object.visible=false;pool[item.type].push(item.object);}
 function fill(){
  while(nextAt<run.distance+112){
   const lane=row===0?0:lanes[Math.floor(random()*3)];
   const kind=row<5?hazards[row]:hazards[Math.floor(random()*hazards.length)];
   place(kind,nextAt,lane);
   const candidates=lanes.filter(l=>l!==lane);
   const safe=row===0?1:candidates[Math.floor(random()*2)],alternate=lanes.find(l=>l!==lane&&l!==safe);
   if(row>=4&&row%3===1)place(hazards[(hazards.indexOf(kind)+2)%hazards.length],nextAt,alternate);
   else if(row%4===2)place('ramp',nextAt,alternate);
   for(let k=0;k<3;k++)place('shell',nextAt-6.4+k*1.85,safe,1);
   if(row%2===0)place(powers[(row/2)%3],nextAt-1,safe,1.18);
   // Flight lines vary independently of the three ground lanes.
   if(row%2===1){
    const section=(row-1)/2,z=.32+3.75*Math.sin(section*1.73+.20),h=4.48+1.48*Math.sin(section*1.24);
    place('gate',nextAt+.85,0,h,z);
    for(let k=0;k<3;k++)place('shell',nextAt-7+k*2,0,h-.46,z+.35*Math.sin(k*PI/3));
    if(section%3===1)place(powers[(section+1)%3],nextAt+4.7,0,h-.32,z);
   }
   nextAt+=22.5+random()*4+.095*Math.min(100,row);row++;
  }
 }
 function saveBest(){
  for(const [key,value,field] of [['pelican-ride-distance',Math.floor(run.distance),'best'],['pelican-ride-score',run.score,'bestScore']]){
   if(value>run[field]){run[field]=value;try{localStorage.setItem(key,String(value));}catch{}}
  }
 }
 function start(){
  items.forEach(retire);items=[];nextAt=23;row=0;seed=Date.now()>>>0||1;points=chainTime=0;lastTrick='';lastGate=-1;sparks.clear();
  Object.assign(run,{active:true,ended:false,crash:null,distance:0,elapsed:0,shells:0,stunts:0,score:0,combo:0,shield:false,magnet:0,gust:0,grace:0,hit:'',pickup:0,event:'',eventKind:'',eventId:0,eventTime:0});
  motion.reset();course.visible=true;place('shell',5.8,0,1);place('shell',7.6,0,1);fill();
 }
 function leave(){saveBest();motion.release();run.active=false;course.visible=false;}
 function collect(item){
  const {type,object}=item;item.done=true;object.visible=false;run.pickup=.32;
  sparks.emit(type==='shell'?5:17,object.position.x,object.position.y,object.position.z,powerColor[type]);
  if(type==='shell'){run.shells++;points+=15;}
  else{
   if(type==='shield')run.shield=true;
   if(type==='magnet')run.magnet=8;
   if(type==='gust')run.gust=5;
   points+=45;notify(powerName[type]+(type==='shield'?' +1':type==='magnet'?' · 8 s':' · 5 s'),type);
  }
 }
 function token(item,x,dt){
  const {object,type}=item,isShell=type==='shell',py=run.y+1;
  const h=item.y+.067*Math.sin(run.elapsed*3+item.x);
  if(isShell&&run.magnet>0&&Math.hypot(x,(py-h)*1.27,run.z-item.z)<5.6)item.pulling=true;
  if(item.pulling){
   // Switch to rider-relative coordinates when the magnet first catches the shell.
   const ease=1-Math.exp(-10*dt);
   object.position.x=mix(object.position.x,0,ease);object.position.y=mix(object.position.y,py,ease);object.position.z=mix(object.position.z,run.z,ease);
   if(Math.hypot(object.position.x,object.position.y-py,object.position.z-run.z)<.52)collect(item);
   return;
  }
  object.position.set(x,h,item.z);object.rotation.y=PI+.16+(isShell?.47:.32)*Math.sin(2*run.elapsed+item.x);
  object.rotation.z=.055*Math.sin(run.elapsed*2+item.x);
  if(Math.abs(x)<.82&&Math.abs(run.z-item.z)<(isShell?.58:.69)&&Math.abs(py-h)<(isShell?.82:1.03))collect(item);
 }
 function collide(item,x,prevX){
  const {type}=item;
  if(Math.abs(run.z-item.z)>.63)return;
  if(type==='ramp'){
   if(x<1.1&&prevX>.38&&run.y<.25&&run.mode==='ground'){motion.jump(8.1);item.done=true;notify('跳台腾空','ramp');}
   return;
  }
  let blocked=false;
  if(type==='log'){
   blocked=run.y<.33&&[1.06,-1.03].some(ax=>x<=ax+.19&&prevX>=ax-.19);
  }else if(type==='hoop'||type==='net'){
   const underside=type==='hoop'?2.65:2.59,top=type==='hoop'?2.77:3.38;
   blocked=x<=1.46&&prevX>=-.44&&run.y<top&&run.y+3.15-.66*run.duck>underside;
  }else{
   const half=type==='pot'?.47:.29,top=type==='pot'?.95:1.13;
   blocked=x<=1.12+half&&prevX>=-1.09-half&&run.y<top;
  }
  if(!blocked)return;
  if(run.shield||run.grace>0){
   if(run.grace<=0){run.shield=false;run.grace=1.15;notify('护盾挡住碰撞','shield');sparks.emit(22,0,run.y+1.1,run.z,powerColor.shield);}
   item.done=true;return;
  }
  run.hit=type;run.crash=beginImpact(run,item);run.mode='crash';run.trick='';run.throttle=false;motion.release();
  for(const token of items){
   if(token.done||!(token.type==='shell'||token.type==='gate'||powers.includes(token.type)))continue;
   const p=token.object.position,r=Math.hypot(p.x-x,p.y-run.crash.originY,p.z-item.z);
   if(r<10)token.blast={x:p.x,y:p.y,z:p.z,delay:r/14};
  }
  notify(impactNames[type],'impact',1.30);score();saveBest();
  sparks.emit(type==='net'?11:17,x,run.crash.high?Math.min(3.2,run.y+2.68):.32,item.z,type==='buoy'?0xdca181:0xd0b89a);
 }
 function act(key){if(run.active&&!run.ended&&!run.crash)motion.act(key);}
 function step(dt){
  if(!run.active||run.ended)return;
  const old=run.distance;run.elapsed+=dt;
  for(const key of ['pickup','magnet','gust','grace','eventTime'])run[key]=Math.max(0,run[key]-dt);
  if(run.crash){
   advanceImpact(run,dt);sparks.step(dt,0);
   for(const item of items){
    const b=item.blast;if(!b||!item.object.visible)continue;
    const t=run.crash.age-b.delay;if(t<=0)continue;
    const f=1-Math.exp(-2.7*t),o=item.object;
    o.position.set(b.x+(b.x-run.crash.contactX)*f*.62,b.y+3.0*f,b.z+(b.z-run.crash.contactZ)*f*.71);
    o.rotation.z=t*3.9;o.scale.setScalar(Math.max(0,1-t/.66));if(t>.66)o.visible=false;
   }
   return;
  }
  chainTime=Math.max(0,chainTime-dt);if(!chainTime)run.combo=0;
  motion.step(dt);run.distance+=run.speed*dt;fill();
  for(const item of items){
   const x=item.x-run.distance,prevX=item.x-old;
   if(!item.pulling)item.object.position.x=x;
   if(item.done)continue;
   if(item.type==='shell'||powers.includes(item.type))token(item,x,dt);
   else if(item.type==='gate'){
    if(prevX>=0&&x<0){item.done=true;
     if(Math.hypot(run.z-item.z,(run.y+1.56-item.y)*.92)<1.20&&lastGate!==item.x){
      lastGate=item.x;reward('gate');item.object.visible=false;
     }
    }
   }else if(x<1.75&&prevX>-1.8){collide(item,x,prevX);if(run.crash)break;}
  }
  for(let i=items.length-1;i>=0;i--)if(items[i].x-run.distance< -13){retire(items[i]);items.splice(i,1);}
  score();sparks.step(dt,run.distance-old);
 }
 return {run,start,leave,step,act,release:motion.release};
}
