import {TAU,clamp,mix} from './core.js';

export const blastAt=.21;
export const impactDuration=3.90;
export const flyawayAt=2.04;
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export const impactNames={log:'前轮撞到漂木',pot:'前轮撞到龙虾笼',buoy:'前轮撞到浮标',hoop:'碰到横杆',net:'碰到渔网'};
export function beginImpact(run,item){
 const high=item.type==='net'||item.type==='hoop',offset=run.z-.32;
 const side=Math.abs(offset)>.72?-Math.sign(offset):(Math.sign(run.vz)||Math.sign(run.z-item.z)||1);
 const initial={};for(const key of ['y','z','vy','bank','seat','wing','pitch','roll','flip','duck','heading','riderLean','speed'])initial[key]=run[key];
 return {initial,high,side,prop:item.object,contactX:item.object.position.x,contactZ:item.z,
  originY:high?Math.min(run.y+2.72,item.type==='net'?3.22:2.73):.28+Math.min(.68,run.y),
  strength:clamp(.96+.038*(run.speed-8),.96,1.31),duration:impactDuration,
  time:0,age:0,reveal:0,release:0,offsetX:0,rollout:0,flinch:0,
  bird:{x:0,y:0,z:0,roll:0,pitch:0,yaw:0},bike:{x:0,y:0,z:0,roll:0,pitch:0,yaw:0},settle:0};
}
export function birdTravel(hit,a,target){
 const apex=hit.high?10.6:9.4,peak=1.68,u=Math.min(1,a/peak),glide=Math.max(0,a-peak);
 target.x=(3.85*a+.67*a*a)*hit.strength;
 target.y=apex*hit.strength*(2*u-u*u)-1.15*glide*(1-Math.exp(-2.6*glide));
 target.z=-(2.85*a+.17*a*a);
 // A final downstroke sends the bird past the tracking camera and out over the water.
 const dash=clamp((a-flyawayAt)/1.60,0,1)**2.1;
 target.x+=13.5*dash;target.y+=11.0*dash;target.z-=87*dash;
 return target;
}
export function advanceImpact(run,dt){
 const hit=run.crash,s=hit.initial;
 hit.time=Math.min(hit.duration,hit.time+dt);
 const a=hit.age=Math.max(0,hit.time-blastAt);
 // The tyre catches in the first 80 ms, followed by a held anticipation pose.
 const catchPose=ease(hit.time/.082),release=hit.release=ease(a/.30);
 hit.reveal=ease(hit.time/1.02);hit.flinch=catchPose*Math.exp(-3.3*a);
 run.speed=s.speed*(1-catchPose);run.vz=run.vy=0;run.z=s.z;run.y=s.y;run.throttle=false;
 run.pitch=mix(s.pitch,hit.high?.10:-.39,catchPose);run.bank=s.bank+hit.side*.09*catchPose;
 run.heading=s.heading;run.roll=s.roll;run.flip=s.flip;
 hit.offsetX=hit.high?.035*catchPose:1.06*(1-Math.cos(run.pitch))+.662*Math.sin(run.pitch);
 run.riderLean=mix(s.riderLean,hit.side*.16,catchPose)*(1-release);
 run.seat=mix(s.seat,.065,catchPose)*(1-release);
 run.duck=mix(s.duck,hit.high?.65:.25,catchPose)*(1-.80*release);
 run.wing=mix(s.wing,.58,catchPose);
 if(a>0)run.wing=clamp(mix(run.wing,1,release)-.26*Math.sin(a*5.2)**2*ease(a/.23)*Math.exp(-.88*a),0,1);
 run.landing=0;
 birdTravel(hit,a,hit.bird);
 const tumble=ease(a/1.66),soar=ease((a-.82)/1.13);
 hit.bird.roll=hit.side*(TAU*tumble+.27*Math.sin(5*a)*soar);
 hit.bird.pitch=(hit.high?-.9:.9)*Math.sin(Math.PI*tumble)-.54*soar;
 hit.bird.yaw=.69*soar+.16*hit.side*Math.sin(Math.PI*tumble)+.65*ease((a-flyawayAt)/.60);
 const flight=Math.min(1,a/1.76),bounce=clamp((a-1.76)/.64,0,1),skid=clamp((a-2.40)/.60,0,1);
 hit.bike.x=-hit.strength*(3.55*(1-(1-flight)**2)+.84*bounce+.34*skid);
 hit.bike.y=4.7*hit.strength*4*flight*(1-flight)+.87*4*bounce*(1-bounce)+.14*4*skid*(1-skid);
 hit.bike.z=hit.side*(1.38*(1-(1-flight)**2)+.18*bounce);
 hit.bike.pitch=-(TAU+.30)*(.46*flight+.54*ease(flight))+.36*Math.sin(Math.PI*bounce);
 hit.bike.roll=hit.side*(1.28*ease(a/1.75)+.30*Math.sin(Math.PI*bounce));
 hit.bike.yaw=-hit.side*.56*ease(a/2.0);hit.settle=ease((a-1.57)/.29);
 hit.rollout=s.speed*.8*(1-Math.exp(-1.68*a));
 const prop=hit.prop;
 if(hit.high)prop.rotation.z=-.18*Math.sin(a*14)*Math.exp(-2.8*a);
 else{prop.position.x=hit.contactX+.45*(1-Math.exp(-4*a));prop.rotation.z=run.hit==='log'?-1.65*(1-Math.exp(-4*a)):-.29*Math.sin(a*12)*Math.exp(-3*a);}
 if(hit.time>=hit.duration)run.ended=true;
}
