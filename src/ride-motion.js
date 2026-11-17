import {PI,TAU,clamp,mix} from './core.js';

export const laneZ=lane=>.32+1.39*lane;
const nearest=z=>clamp(Math.round((z-.32)/1.39),-1,1);
const damp=(a,b,k,dt)=>mix(a,b,1-Math.exp(-k*dt));
const smooth=t=>t*t*(3-2*t);
export const cruiseAt=d=>8+3.65*(1-Math.exp(-d/400));
const trickTime={roll:.73,flip:.87},gravity=12.6;
export const trickName={roll:'横滚',flip:'后空翻'};

export function rideMotion(run,onTrick,onHint){
 const held=new Set();
 let targetY=0,targetZ=0,timeInAir=0,trick=null,seatSpeed=0,flare=0,liftOff=0;
 function reset(){
  Object.assign(run,{mode:'ground',speed:cruiseAt(0),lane:0,z:laneZ(0),y:0,vz:0,vy:0,bank:0,
   riderLean:0,duck:0,seat:0,wing:0,pitch:0,roll:0,flip:0,heading:0,trick:'',throttle:false,landing:0});
  held.clear();targetZ=run.z;targetY=timeInAir=seatSpeed=flare=liftOff=0;trick=null;crouch=0;
 }
 let crouch=0;
 function jump(impulse=6.25){
  if(run.mode!=='ground')return;
  run.mode='jump';run.vy=impulse;timeInAir=0;liftOff=1;crouch=0;
 }
 function flight(){
  if(run.mode==='flight'){
   run.mode='approach';run.lane=nearest(run.z);targetZ=laneZ(run.lane);return;
  }
  const airborne=run.mode!=='ground';
  run.mode='flight';targetZ=run.z;targetY=clamp(Math.max(2.8,run.y+.55),1.20,8.3);
  if(!airborne){run.vy=3.55;timeInAir=0;liftOff=1;}
  else run.vy=Math.max(run.vy,run.y<.65?2.8:-Math.min(1.7,run.y*1.8));
  crouch=0;
 }
 function stunt(type){
  if(trick)return;
  if(run.mode==='ground'){onHint('先跳跃或起飞');return;}
  const hang=(run.vy+Math.sqrt(run.vy**2+2*gravity*run.y))/gravity;
  if((run.mode==='jump'&&hang<trickTime[type]+.018)||run.mode==='approach'){
   onHint('升高后再做特技');return;
  }
  trick={type,t:0,direction:run.vz<-.3?-1:1};run.trick=type;
 }
 function act(key){
  held.add(key);
  if(key==='fly'){flight();return;}
  if(key==='roll'||key==='flip'){stunt(key);return;}
  if(key==='boost')return;
  const flightMode=run.mode==='flight',direction=key==='left'?-1:key==='right'?1:0;
  if(direction){
   if(flightMode)targetZ=clamp(targetZ+.56*direction,-7,7);
   else{run.lane=clamp(run.lane+direction,-1,1);targetZ=laneZ(run.lane);}
  }else if(key==='jump'){
   if(flightMode)targetY=clamp(targetY+.64,1.2,8.3);else jump();
  }else if(key==='duck'){
   if(flightMode)targetY=clamp(targetY-.64,1.2,8.3);
   else{crouch=1.05;if(run.mode==='jump'&&!trick)run.vy=Math.min(-2,run.vy);}
  }
 }
 function release(key){if(key)held.delete(key);else held.clear();}
 function touchdown(){
  const impact=clamp(-run.vy/6.6,.3,1.2);
  run.y=0;run.vy=0;run.mode='ground';run.lane=nearest(run.z);targetZ=laneZ(run.lane);
  run.landing=impact;seatSpeed=-1.48*impact;flare=1;run.trick='';trick=null;run.roll=run.flip=0;
 }
 function step(dt){
  const flying=run.mode==='flight',approach=run.mode==='approach';
  run.throttle=held.has('boost');
  const desiredSpeed=cruiseAt(run.distance)+(run.throttle?6.7:0)+(run.gust>0?3.7:0);
  run.speed=damp(run.speed,desiredSpeed,run.speed<desiredSpeed?1.75:1.25,dt);
  if(flying){
   const across=Number(held.has('right'))-Number(held.has('left')),vertical=Number(held.has('jump'))-Number(held.has('duck'));
   targetZ=clamp(targetZ+across*5.5*dt,-7,7);targetY=clamp(targetY+vertical*4.55*dt,1.2,8.3);
   run.lane=nearest(run.z);
  }
  // Critically damped steering keeps velocity continuous if the player changes their mind mid-turn.
  const stiffness=flying?7.2:12.2,error=targetZ-run.z;
  run.vz+=(stiffness*stiffness*error-2*stiffness*run.vz)*dt;run.z+=run.vz*dt;
  if(Math.abs(error)+Math.abs(run.vz)<.0004){run.z=targetZ;run.vz=0;}
  const turn=clamp(.069*run.vz+.068*error,-.38,.38);
  run.bank=damp(run.bank,turn,13,dt);run.riderLean=damp(run.riderLean,.38*turn,8,dt);
  run.heading=damp(run.heading,-.40*Math.atan2(run.vz,run.speed),8,dt);
  if(run.mode!=='ground'){
   timeInAir+=dt;
   if(flying)run.vy+=clamp(11*(targetY-run.y)-5.4*run.vy,-10,12)*dt;
   else if(approach){
    const overDeck=Math.abs(run.z-targetZ)<.44,descent=overDeck?-clamp(.95+run.y*1.4,1.45,4.8):clamp((2.35-run.y)*2,-2.9,3.2);
    run.vy=damp(run.vy,descent,4.5,dt);
   }else run.vy-=gravity*dt;
   run.y+=run.vy*dt;
   if(run.y<=0&&run.vy<0)touchdown();
  }
  if(trick){
   trick.t+=dt;const u=clamp(trick.t/trickTime[trick.type],0,1),angle=TAU*smooth(u);
   run.roll=trick.type==='roll'?trick.direction*angle:0;run.flip=trick.type==='flip'?angle:0;
   if(u>=1){onTrick(trick.type);trick=null;run.trick='';run.roll=run.flip=0;}
  }
  crouch=Math.max(0,crouch-dt);liftOff=Math.max(0,liftOff-3*dt);flare=Math.max(0,flare-2.9*dt);
  run.landing=Math.max(0,run.landing-3.5*dt);
  const grounded=run.mode==='ground',wantDuck=grounded&&(crouch>0||held.has('duck'));
  run.duck=damp(run.duck,wantDuck?1:0,wantDuck?16:10,dt);
  const seatTarget=grounded?0:.022+.034*liftOff;
  seatSpeed+=((seatTarget-run.seat)*150-15*seatSpeed)*dt;run.seat+=seatSpeed*dt;
  const extension=grounded?.68*flare:run.mode==='jump'?(.92-.11*Math.min(1,timeInAir)):(approach?.96:1);
  run.wing=damp(run.wing,extension,grounded?6.2:10,dt);
  const pitchTarget=grounded?0:clamp(run.vy*.031,-.135,.17);
  run.pitch=damp(run.pitch,pitchTarget,grounded?16:6,dt);
 }
 return {reset,act,release,step,jump};
}
