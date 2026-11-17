import {bicycleFinishes} from './daybreak.js';
import {THREE,PI,TAU,WHEEL_RADIUS,pedalPitch,V,mix,mat,group,mesh,ball,box,rod,curve,ring,loft,surface,batch} from './core.js';
import {roadRubber,downtubeLettering} from './finishes.js';
import {touringEquipment} from './touring.js';
export function bicycle(root){
 const rigid=group(root),wheelCenters=[-1.03,1.06],wy=.663,wr=WHEEL_RADIUS;
 const {enamel,silver,bright,gold,rim:alloy,wire}=bicycleFinishes();
 const dark=mat(0x222b29,.42,.7),rubber=mat(0x222623,.86),sidewall=mat(0x9e7851,.81),leather=mat(0x683924,.65);
 const wheels=[],tread=roadRubber();
 for(const x of wheelCenters){
  const wheel=group(root);wheel.position.set(x,wy,0);wheels.push(wheel);
  ring(wheel,[0,0,0],.614,.048,tread);
  for(const s of [-1,1]){
   ring(wheel,[0,0,s*.031],.602,.015,sidewall);
   ring(wheel,[0,0,s*.032],.585,.008,rubber);
   ring(wheel,[0,0,s*.012],.577,.011,alloy);
   ring(wheel,[0,0,s*.012],.562,.007,alloy);
   rod(wheel,[0,0,s*.05],[0,0,s*.076],.06,silver,.059,32);
   for(let k=0;k<16;k++){
    let a=(k+s*.25)/16*TAU,b=a+(k%2?.54:-.54);
    const h=[Math.sin(b)*.053,Math.cos(b)*.053,s*.062],rim=[Math.sin(a)*.568,Math.cos(a)*.568,s*.009];
    rod(wheel,h,rim,.0029,wire,.0028,7);
    rod(wheel,[rim[0]*.967,rim[1]*.967,rim[2]],rim,.0042,bright,.004,6);
   }
  }
  rod(wheel,[0,0,-.098],[0,0,.098],.026,silver,.026,24);
  rod(wheel,[0,.527,.002],[0,.564,.002],.0065,dark);
  batch(wheel);
 }
 const bb=[-.075,.565,0],seat=[-.385,1.37,0],head=[.665,1.395,0],lower=[.758,1.095,0];
 rod(rigid,bb,seat,.039,enamel,.036,32);rod(rigid,seat,head,.036,enamel,.037,32);rod(rigid,bb,lower,.045,enamel,.041,36);rod(rigid,lower,head,.051,enamel,.051,32);
 const lerpVec=(a,b,u)=>a.map((x,i)=>mix(x,b[i],u));
 for(const [a,b] of [[seat,head],[bb,lower]]){
  for(const u of [.105,.119,.87,.884])rod(rigid,lerpVec(a,b,u),lerpVec(a,b,u+.006),a===bb?.0458:.0375,gold);
 }
 for(const s of [-1,1]){
  const rear=[wheelCenters[0],wy,.09*s],front=[wheelCenters[1],wy,.09*s];
  rod(rigid,[seat[0],seat[1]-.015,s*.026],rear,.019,enamel,.013);
  rod(rigid,[bb[0],bb[1],s*.07],rear,.025,enamel,.015);
  curve(rigid,[[lower[0],lower[1],s*.055],[.84,.89,.068*s],[.956,.704,.086*s],front],.023,enamel);
  ball(rigid,rear,[.04,.047,.013],silver);ball(rigid,front,[.04,.044,.014],silver);
  for(const x of wheelCenters)rod(rigid,[x,wy,s*.083],[x,wy,s*.115],.024,bright,.021,6);
 }
 rod(rigid,[bb[0],bb[1],-.108],[bb[0],bb[1],.108],.064,silver,.064,24);
 rod(rigid,[-.383,1.35,0],[-.43,1.52,0],.027,silver);
 rod(rigid,[-.397,1.40,0],[-.394,1.385,0],.043,bright);
 for(const s of [-1,1])curve(rigid,[[-.61,1.512,s*.064],[-.50,1.458,s*.042],[-.37,1.465,s*.04],[-.24,1.51,s*.032]],.010,silver);
 loft(rigid,[[-.675,1.544,0,.011,.029],[-.64,1.551,0,.045,.126],[-.54,1.552,0,.052,.142],[-.438,1.541,0,.034,.115],[-.335,1.536,0,.023,.044],[-.208,1.537,0,.022,.04],[-.179,1.535,0,.013,.011]],leather);
 for(const s of [-1,1])ball(rigid,[-.592,1.588,.088*s],[.012,.005,.012],gold);
 for(const u of [0,.09,.95,1]){let q=lerpVec(lower,head,u);rod(rigid,q,[q[0]-.004,q[1]+.015,0],.054,bright);}
 rod(rigid,head,[.617,1.552,0],.025,silver);rod(rigid,[.617,1.55,0],[.787,1.627,0],.026,silver);
 for(const s of [-1,1]){
  curve(rigid,[[.79,1.627,0],[.813,1.626,.16*s],[.772,1.627,.247*s],[.623,1.588,.333*s]],.019,bright);
  curve(rigid,[[.727,1.614,.279*s],[.656,1.596,.319*s],[.593,1.583,.347*s]],.026,leather);
  for(let i=0;i<7;i++) {const u=i/7;const p=[mix(.716,.599,u),mix(1.61,1.585,u),mix(.285,.343,u)*s];rod(rigid,p,[p[0]-.004,p[1]-.001,p[2]+.002*s],.0268,dark,.0268,12);}
  curve(rigid,[[.76,1.60,.258*s],[.751,1.547,.275*s],[.667,1.526,.324*s]],.009,silver);
 }
 curve(rigid,[[.754,1.57,.26],[.946,1.43,.19],[.923,1.25,.076],[.854,1.173,.044]],.0066,rubber);
 curve(rigid,[[.757,1.577,-.258],[.996,1.435,-.126],[.833,1.263,-.083],[.542,1.346,-.026],[-.36,1.326,-.04],[-.62,1.111,-.052]],.006,rubber,52);
 // Rolled metal mudguards with a rounded channel across their width.
 for(const [x,a0,a1] of [[-1.03,.49,3.44],[1.06,-.12,2.35]]){
  const g=surface(58,8,(u,v)=>{const a=mix(a0,a1,u),w=v*2-1,r=.695-.018*w*w;return [x+Math.cos(a)*r,wy+Math.sin(a)*r,w*.052];});const f=mesh(rigid,g,silver);f.material.side=THREE.DoubleSide;
  for(const s of [-1,1]){let a=x<0?2.67:.47;rod(rigid,[x,wy,.096*s],[x+Math.cos(a)*.683,wy+Math.sin(a)*.683,.048*s],.0055,silver);}
 }
 const crank=group(root);crank.position.set(bb[0],bb[1],0);
 function cog(p,x,y,z,r,teeth,m){
  const g=surface(teeth*4,1,(u,v)=>{let i=Math.round(u*teeth*4)%4,rad=v?(r-(i===0||i===3?.007:0)):r-.021;return [x+rad*Math.cos(u*TAU),y+rad*Math.sin(u*TAU),z];});m.side=THREE.DoubleSide;mesh(p,g,m);
 }
 cog(crank,0,0,.113,.177,40,bright);
 ring(crank,[0,0,.111],.135,.008,silver);
 for(let i=0;i<5;i++){let a=i*TAU/5;rod(crank,[.044*Math.cos(a),.044*Math.sin(a),.114],[.154*Math.cos(a+.18),.154*Math.sin(a+.18),.114],.016,silver,.012);ball(crank,[.14*Math.cos(a+.16),.14*Math.sin(a+.16),.127],[.009,.009,.006],dark);}
 for(let i=0;i<5;i++)cog(rigid,-1.03,wy,.083+i*.007,.097-i*.005,22-i,dark);
 // Two external tangents connect chainring and rear sprocket.
 const chainR=.177,rearR=.0885,dx=bb[0]+1.03,dy=bb[1]-wy,baseAngle=Math.atan2(dy,dx),contact=Math.acos((rearR-chainR)/Math.hypot(dx,dy));
 const a=baseAngle+contact,b=baseAngle-contact,point=(x,y,r,t)=>[x+r*Math.cos(t), y+r*Math.sin(t),.121];
 const ft=point(bb[0],bb[1],chainR,a),fb=point(bb[0],bb[1],chainR,b),rt=point(-1.03,wy,rearR,a),rb=point(-1.03,wy,rearR,b);
 const route=[ft,rt];for(let i=1;i<=24;i++)route.push(point(-1.03,wy,rearR,mix(a,b+TAU,i/24)));route.push(fb);for(let i=1;i<=36;i++)route.push(point(bb[0],bb[1],chainR,mix(b,a,i/36)));
 for(let i=1;i<route.length;i++)rod(rigid,route[i-1],route[i],.0081,dark,.0081,7);
 const lengths=[0];
 for(let i=1;i<route.length;i++)lengths.push(lengths[i-1]+Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]));
 const chainLength=lengths.at(-1),linkCount=2*Math.round(chainLength/(TAU*chainR/40)/2),pitch=chainLength/linkCount;
 const links=new THREE.InstancedMesh(new THREE.BoxGeometry(pitch*.78,.011,.0045),silver,linkCount);
 links.instanceMatrix.setUsage(THREE.DynamicDrawUsage);links.frustumCulled=false;root.add(links);
 const linkPose=new THREE.Object3D();
 function advanceChain(angle){
  const offset=(1-(angle/TAU*40)%1)*pitch;
  let k=1;
  for(let i=0;i<linkCount;i++){
   const dist=(i*pitch+offset)%chainLength;
   if(dist<lengths[k-1])k=1;
   while(k<lengths.length-1&&dist>lengths[k])k++;
   const u=(dist-lengths[k-1])/(lengths[k]-lengths[k-1]),a=route[k-1],b=route[k];
   linkPose.position.set(mix(a[0],b[0],u),mix(a[1],b[1],u),.129);
   linkPose.rotation.z=Math.atan2(b[1]-a[1],b[0]-a[0]);linkPose.updateMatrix();links.setMatrixAt(i,linkPose.matrix);
  }
  links.instanceMatrix.needsUpdate=true;
 }
 for(const s of [-1,1]){rod(crank,[0,0,.147*s],[.196*s,0,.155*s],.022,silver,.018);ball(crank,[0,0,.157*s],[.038,.038,.014],bright);}
 downtubeLettering(rigid,bb,lower);
 const kit=touringEquipment(root,rigid,{enamel,silver,bright,dark,rubber,gold,leather});
 batch(crank);batch(rigid);
 const pedals=[];
 for(const s of [-1,1]){
  const p=group(root);pedals.push({p,s});
  rod(p,[0,0,-.07],[0,0,.07],.012,dark);
  box(p,[0,0,0],[.145,.024,.116],silver);
  for(const k of [-1,1]){box(p,[k*.059,.013,0],[.019,.018,.12],rubber);box(p,[0,-.002,.059*k],[.065,.012,.003],gold);}
  batch(p);
 }
 return {animate(phase,dist,impact=null){kit.animate(phase);advanceChain(phase);for(const w of wheels){
  const remainingSpin=impact?impact.rollout*(w.position.x>0&&!impact.high?.045:1):0;
  w.rotation.z=-(dist+remainingSpin)/wr;
 }crank.rotation.z=-phase;for(const {p,s} of pedals){p.position.set(bb[0]+s*.196*Math.cos(phase),bb[1]-s*.196*Math.sin(phase),s*.203);p.rotation.z=pedalPitch(phase,s);}},bb};
}
