import {THREE,PI,TAU,V,mix,mat,texture,surface,mesh,rod} from './core.js';

// The fine herringbone is a height map, so it catches the sun as the wheel turns.
export function roadRubber(){
 const relief=texture(256,256,(c,w,h)=>{
  c.fillStyle='#606060';c.fillRect(0,0,w,h);
  for(let i=-2;i<7;i++){
   const x=i*64;c.lineCap='round';
   for(const s of [-1,1]){
    for(const center of [0,h]){
     c.lineWidth=11;c.strokeStyle='#b7b7b7';c.beginPath();c.moveTo(x+6,center+s*4);c.quadraticCurveTo(x+18,center+s*21,x+39,center+s*44);c.stroke();
     c.lineWidth=6;c.strokeStyle='#8e8e8e';c.beginPath();c.moveTo(x+34,center+s*38);c.lineTo(x+48,center+s*56);c.stroke();
    }
   }
  }
 },true);
 relief.colorSpace=THREE.NoColorSpace;relief.repeat.set(32,1);relief.anisotropy=8;
 return mat(0x202321,.77,0,{bumpMap:relief,bumpScale:.0018});
}
export function downtubeLettering(frame,bottom,top){
 const label=texture(768,96,(c,w,h)=>{
  c.clearRect(0,0,w,h);c.fillStyle='#efd6a1';c.font='italic 600 62px Georgia,serif';c.textBaseline='middle';
  const letters='Pelican';let width=0;for(const l of letters)width+=c.measureText(l).width+6;
  let x=(w-width)/2;for(const l of letters){c.fillText(l,x,49);x+=c.measureText(l).width+6;}
  for(const s of [-1,1]){c.beginPath();c.moveTo(w/2+s*(width*.5+20),47);c.lineTo(w/2+s*(width*.5+85),48);c.lineTo(w/2+s*(width*.5+20),50);c.fill();}
 });
 const foil=mat(0xffedc5,.39,.26,{map:label,alphaTest:.33,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
 const a=V(...bottom),b=V(...top),axis=b.clone().sub(a).normalize(),up=V(-axis.y,axis.x,0);
 for(const side of [-1,1]){
  const geometry=surface(26,8,(u,v)=>{
   const t=mix(.16,.84,side>0?u:1-u),angle=(v-.5)*1.38,r=mix(.045,.041,t)+.0008;
   const p=a.clone().lerp(b,t).addScaledVector(up,r*Math.sin(angle));p.z+=side*r*Math.cos(angle);return p.toArray();
  });
  mesh(frame,geometry,foil);
 }
}
