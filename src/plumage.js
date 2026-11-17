import {sunDirection} from './daybreak.js';
import {THREE,PI,TAU,V,clamp,mix,random,mat,texture,mesh,surface,ball,curve,rod,batch} from './core.js';

// Each short feather follows the changing cross-section of the breast.
// Its lifted tip picks up light without a painted outline around the feather.
export function breastFeathers(parent,station,birdColor,feather){
 for(let row=0;row<14;row++){
  const count=48,stagger=(row%2)*.48;
  for(let i=0;i<count;i++){
   const phi=TAU*(i+stagger+.26*random())/count;
   const rootY=2.43-row*.060+(random()-.5)*.021;
   const [center,radii]=station(rootY),rootX=center.x+radii.x*Math.cos(phi);
   if(rootY>1.75&&rootY<2.20&&rootX<.012&&Math.abs(Math.sin(phi))>.42)continue;
   const length=.084+.060*random(),width=.079+.040*random();
   const tint=birdColor(rootX,rootY,radii.y*Math.sin(phi)).lerp(new THREE.Color(0xcbc1a8),.025+.067*random());
   const slots=Array.from({length:9},(_,k)=>station(rootY-length*k/8));
   feather(parent,(u,v)=>{
    const [c,r]=slots[Math.round(u*8)];
    const sweep=(.157+.055*Math.cos(phi))*Math.sin(phi)*u*u;
    const span=width*Math.pow(Math.sin(PI*(.005+.989*u)),.57);
    const a=phi+sweep+(v*2-1)*span;
    const lift=.0007+.0032*u*u+.0018*Math.sin(PI*v)*Math.sin(PI*u);
    return [c.x+(r.x+lift)*Math.cos(a),rootY-length*u,(r.y+lift)*Math.sin(a)];
   },tint,8,5,3,i%2===0);
  }
 }
}

// The leading edge of each wing stays in the shoulder socket as its primaries flex.
export function hingeWing(wing,side,fingers){
 const shoulder=V(.144,2.042,side*.198);
 wing.position.copy(shoulder);
 for(const part of wing.children){
  const geo=part.geometry;geo.translate(-shoulder.x,-shoulder.y,-shoulder.z);
  const rest=geo.attributes.position,target=rest.clone(),pinions=rest.clone(),deployed=rest.clone(),uv=geo.attributes.uv;
  let fingerIndex=0;
  for(let i=0;i<rest.count;i++){
   const x=rest.getX(i),y=rest.getY(i),z=rest.getZ(i);
   const flexibility=THREE.MathUtils.smoothstep(-x,.34,1.70);
   // The wrist unfolds and the primaries separate into a broader flight surface.
   deployed.setXYZ(i,x-.50*flexibility,y+(y+.095)*1.48*flexibility-.062*flexibility,z+side*.078*Math.sin(PI*flexibility));
   if(part.material.alphaTest>0&&fingerIndex<fingers.length){
    while(fingerIndex<fingers.length&&i>=fingers[fingerIndex].end)fingerIndex++;
    const finger=fingers[fingerIndex];
    if(finger&&i>=finger.start){
     const u=uv.getX(i)**2;
     deployed.setX(i,deployed.getX(i)-(.19+.19*Math.sin(PI*finger.order))*u);
     deployed.setY(i,deployed.getY(i)+.79*(finger.order-.50)*u);
     deployed.setZ(i,deployed.getZ(i)+side*.075*Math.sin(PI*finger.order)*u);
    }
   }
   const fan=.050*Math.sin(11*y+2.1);
   target.setXYZ(i,x+.012*flexibility,y+(.064+fan)*flexibility,z+side*.095*flexibility);
   if(part.material.alphaTest>0&&uv.getY(i)<.25){
    const tip=uv.getX(i)**3,spread=THREE.MathUtils.clamp((y+.27)/.22,0,1);
    pinions.setXYZ(i,x+.006*tip,y+tip*(.034*spread-.019),z+side*tip*(.010+.044*spread));
   }
  }
  geo.morphAttributes.position=[target,pinions,deployed];
  // Carry the vane normals through the bend so its highlight follows the tip.
  const normals=geo.attributes.normal,flexNormals=normals.clone();
  for(let i=0;i<rest.count;i++){
   const q=THREE.MathUtils.clamp((-rest.getX(i)-.34)/1.36,0,1),slope=-6*q*(1-q)/1.36;
   const ny=normals.getY(i),nz=normals.getZ(i),fan=.050*Math.sin(11*rest.getY(i)+2.1);
   const nx=normals.getX(i)-slope*((.064+fan)*ny+side*.095*nz);
   const normalized=1/(Math.hypot(nx,ny,nz)||1);flexNormals.setXYZ(i,nx*normalized,ny*normalized,nz*normalized);
  }
  geo.morphAttributes.normal=[flexNormals,normals.clone(),normals.clone()];part.updateMorphTargets();
 }
}
const flightPose=new THREE.Quaternion(),flapRotation=new THREE.Quaternion(),wingEuler=new THREE.Euler(),forward=V(1,0,0);
export function wingPose(wing,s,t,phase,load,motion=null){
 const wind=TAU*t/32;
 const correction=Math.pow(.5+.5*Math.cos(wind-1.88),14);
 const second=Math.pow(.5+.5*Math.cos(wind-4.56),25);
 const balance=.042*Math.max(0,-s*load.shoulderLoad);
 const lift=.27*correction+.12*second+balance;
 wing.rotation.set(s*.009*Math.sin(phase+.7)-.43*load.pelvisRoll,s*(.033+.013*Math.sin(phase-.2)+lift),-.012*Math.sin(phase+.42)-lift*.30);
 const spread=motion?.wing||0;
 if(spread>.0001){
  const flying=motion.mode==='flight'||!!motion.crash?.age,rolling=!!motion.trick;
  const eject=motion.crash?.age||0;
  const stroke=eject?Math.sin(9.6*eject+s*.32)*(.35*Math.exp(-.86*eject)+.12):flying?Math.sin(t*4.7+.32*Math.sin(t*1.45))*(rolling?.09:.27):.12;
  const downstroke=eject?-.61*Math.exp(-((eject-2.13)**2)/.016):0;
  const dihedral=.16+.025*motion.vy+stroke+downstroke+.13*motion.landing;
  // Rotate the span out at the shoulder and lay the feather vanes into the airflow.
  wingEuler.set(s*1.22,s*(1.25+.08*Math.cos(t*4.7)*Number(flying)),0,'YXZ');
  flightPose.setFromEuler(wingEuler);
  flapRotation.setFromAxisAngle(forward,-s*dihedral-.49*motion.bank);
  wing.quaternion.slerp(flightPose.premultiply(flapRotation),spread);
 }
 const flutter=.28+.20*Math.sin(3*wind-s*.25)+.21*Math.sin(phase-.8)+.31*correction;
 const release=.19+.29*(.5-.5*s*Math.cos(phase-.61))+.32*correction;
 for(const part of wing.children){part.morphTargetInfluences[0]=flutter;part.morphTargetInfluences[1]=release+spread*.32;part.morphTargetInfluences[2]=spread;}
}

export function gularTexture(){
 return texture(768,384,(c,w,h)=>{
  const g=c.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#f8eacc');g.addColorStop(.48,'#f6d4a4');g.addColorStop(1,'#f8eacc');c.fillStyle=g;c.fillRect(0,0,w,h);
  for(let i=0;i<520;i++){
   const x=random()*w,side=i%2?1:-1,start=side>0?0:h;
   const length=(.07+.42*random())*h,skew=(.008+.06*random())*w,bend=(random()-.42)*.04*w;
   c.strokeStyle='rgba(136,87,55,'+(.035+random()*.14)+')';c.lineWidth=.43+random()*.8;
   c.beginPath();c.moveTo(x,start);c.bezierCurveTo(x+bend,start+side*length*.3,x+skew*.17,start+side*length*.8,x+skew,start+side*length);c.stroke();
   if(i%5===0){c.lineWidth=.45;c.beginPath();c.moveTo(x+skew*.2,start+side*length*.7);c.quadraticCurveTo(x+skew*.61,start+side*length*.78,x+skew+6,start+side*length*.83);c.stroke();}
  }
  for(let i=0;i<21000;i++){
   c.fillStyle=i%3?'rgba(255,243,203,.19)':'rgba(142,84,47,.14)';c.fillRect(random()*w,random()*h,.45+random()*.7,.45+random()*1.3);
  }
 });
}
export function warmMembrane(material){
 material.onBeforeCompile=shader=>{
  shader.uniforms.coastSun={value:sunDirection};shader.fragmentShader='uniform vec3 coastSun;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 viewDir=normalize(vViewPosition);
   vec3 lightDir=normalize(mat3(viewMatrix)*coastSun);
   float edge=pow(1.-clamp(abs(dot(normal,viewDir)),0.,1.),2.4);
   float scatter=.10+.37*max(0.,-dot(viewDir,lightDir));
   outgoingLight+=diffuseColor.rgb*vec3(1.,.52,.14)*edge*scatter;
   #include <opaque_fragment>`);
 };
 return material;
}

export function webbedFoot(foot,materials){
 const {leg,toe,nails}=materials;
 const membrane=mat(0xffffff,.64,0,{vertexColors:true,side:THREE.DoubleSide});
 const tendons=mat(0xc38b54,.68),skin=mat(0xdb9f62,.69);
 const heel=V(-.073,.035,0);
 const toes=[V(-.013,-.024,-.079),V(.131,-.043,-.100),V(.172,-.052,-.01),V(.144,-.04,.093)];
 const axes=toes.map((tip,i)=>new THREE.CatmullRomCurve3([heel, V(mix(heel.x,tip.x,.31),.003,mix(heel.z,tip.z,.31)),V(mix(heel.x,tip.x,.73),-.018+(i===0?-.005:.003),mix(heel.z,tip.z,.71)),tip],false,'catmullrom',.42));
 ball(foot,heel.toArray(),[.046,.029,.041],leg);
 for(let j=0;j<3;j++){
  const left=axes[j],right=axes[j+1];
  const g=surface(17,10,(u,v)=>{
   const webLength=1-.17*Math.sin(PI*v);
   const a=left.getPoint(u*webLength),b=right.getPoint(u*webLength);
   const pt=a.lerp(b,v);pt.y+=.006*Math.sin(PI*u)-.0075*Math.sin(PI*v)*u;
   return pt.toArray();
  });
  const uv=g.attributes.uv,colors=[],base=new THREE.Color(0xe9ad66),rim=new THREE.Color(0xa36a42);
  for(let k=0;k<uv.count;k++){const u=uv.getX(k),v=uv.getY(k);const c=base.clone().lerp(rim,.16*Math.pow(u,3)+.25*Math.pow(Math.abs(2*v-1),4));colors.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));mesh(foot,g,membrane);
  for(const v of [.27,.54,.75]){
   const path=[];for(let k=0;k<7;k++){const u=.18+k*.097,a=left.getPoint(u),b=right.getPoint(u);a.lerp(b,v);a.y+=.0013-.004*Math.sin(PI*v)*u;path.push(a.toArray());}
   curve(foot,path,.00095,tendons,8,4);
  }
 }
 for(const axis of axes){
  const stations=[0,.21,.43,.66,.84,1];
  for(let k=1;k<stations.length;k++){
   const a=axis.getPoint(stations[k-1]),b=axis.getPoint(stations[k]),r=.012-.006*stations[k-1];
   rod(foot,a.toArray(),b.toArray(),r,toe,r-.0011,10);
   ball(foot,b.toArray(),[r*1.25,r*.83,r*1.07],skin);
  }
  const tip=axis.getPoint(1),p=tip.toArray();
  rod(foot,p,[tip.x+.011,tip.y-.003,tip.z*1.018],.0068,nails,.0043,8);
  rod(foot,[tip.x+.011,tip.y-.003,tip.z*1.018],[tip.x+.017,tip.y-.012,tip.z*1.018],.0043,nails,.0005,8);
 }
 batch(foot);
 for(const obj of foot.children){
  const a=obj.geometry.attributes.position,b=a.clone();
  for(let i=0;i<a.count;i++){let x=a.getX(i),z=a.getZ(i),w=THREE.MathUtils.smoothstep(x,.067,.17);b.setXYZ(i,x-.005*w,a.getY(i)-.020*w,z*(1+.095*w));}
  obj.geometry.morphAttributes.position=[b];obj.updateMorphTargets();
 }
}
