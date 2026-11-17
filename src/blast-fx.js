import {THREE,PI,TAU,V,clamp,group,surface,texture} from './core.js';
import {blastCloud} from './blast-cloud.js';
import {birdTravel} from './impact.js';

function looseFeather(){
 const geometry=surface(18,6,(u,v)=>{
  const width=.12*Math.pow(Math.sin(PI*u),.68)*(1-.37*u);
  return [(v-.41)*2*width+.069*u*u,u-.5,.055*Math.sin(PI*u)+.023*Math.sin(v*PI)];
 });
 const rgb=[],uv=geometry.attributes.uv;
 for(let i=0;i<uv.count;i++){
  const u=uv.getX(i),v=uv.getY(i),tip=THREE.MathUtils.smoothstep(u,.81+.08*Math.sin(PI*v),1);
  const shade=.87+.095*Math.cos((v-.45)*5)+.035*Math.sin(53*u-8*Math.abs(v-.43));
  rgb.push(shade*(1-.46*tip),shade*.965*(1-.43*tip),shade*.84*(1-.37*tip));
 }geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));return geometry;
}
function pressureRing(root,color){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{fade:{value:0},tint:{value:new THREE.Color(color)}},
  vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 p;uniform float fade;uniform vec3 tint;void main(){float r=length(p),a=atan(p.y,p.x);
   float front=.909+.014*sin(7.*a)+.008*cos(13.*a);float wave=exp(-pow((r-front)/.021,2.))+.23*exp(-pow((r-front+.062)/.047,2.));
   gl_FragColor=vec4(tint,fade*wave);
   #include <colorspace_fragment>
  }`});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);root.add(mesh);mesh.renderOrder=16;return mesh;
}
function wingTrails(root){
 const segments=38,geo=new THREE.BufferGeometry(),positions=new Float32Array(2*(segments+1)*2*3),uv=[],indices=[];
 for(let side=0;side<2;side++)for(let k=0;k<=segments;k++){
  const j=(side*(segments+1)+k)*2;uv.push(k/segments,0,k/segments,1);
  if(k<segments)indices.push(j,j+2,j+1,j+1,j+2,j+3);
 }
 const pos=new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);
 geo.setAttribute('position',pos);geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,
  uniforms:{alpha:{value:0}},vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 st;uniform float alpha;void main(){float edge=1.-abs(2.*st.y-1.);float w=sin(st.x*3.14159);gl_FragColor=vec4(1.,.94,.80,alpha*edge*w);
   #include <colorspace_fragment>
  }`});
 const m=new THREE.Mesh(geo,material);root.add(m);m.frustumCulled=false;m.renderOrder=15;const p=V();
 return (hit,source)=>{
  const a=hit.age;m.visible=a>.30;material.uniforms.alpha.value=.17+.47*THREE.MathUtils.smoothstep(a,1.98,2.72);
  if(!m.visible)return;
  let i=0;
  for(const side of [-1,1])for(let k=0;k<=segments;k++){
   const u=k/segments,emitted=Math.max(0,a-(1-u)*.83),spiral=emitted*5.7+side*.81;
   birdTravel(hit,emitted,p).add(source);
   const distance=(.85+.35*Math.sin(spiral))*side,twist=.43*Math.sin(spiral);
   p.x+=distance*.86*(1.1-.28*u);p.z+=distance*.65;
   p.y+=twist*side-.29-.52*(1-u);const width=(.09+.12*(1-u))*Math.min(1,a);
   pos.setXYZ(i++,p.x,p.y-width,p.z);pos.setXYZ(i++,p.x+.34*width,p.y+width,p.z);
  }
  pos.needsUpdate=true;
 };
}
function distantGlint(root){
 const map=texture(128,128,(ctx,w,h)=>{
  const pixels=ctx.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const u=(x+.5-w/2)/(w/2),v=(y+.5-h/2)/(h/2),r=Math.hypot(u,v);
   const rays=Math.exp(-Math.abs(u)*55-Math.abs(v)*2.6)+Math.exp(-Math.abs(v)*80-Math.abs(u)*3.8);
   const a=clamp(Math.exp(-r*12)*1.1+rays*.84,0,1)*Math.max(0,1-r);
   const j=(y*w+x)*4;pixels.data[j]=255;pixels.data[j+1]=241;pixels.data[j+2]=207;pixels.data[j+3]=Math.round(a*255);
  }ctx.putImageData(pixels,0,0);
 });
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
 root.add(sprite);sprite.renderOrder=20;return sprite;
}
export function blastEffects(scene){
 const root=group(scene);root.visible=false;
 let seed=52013;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const updateCloud=blastCloud(root,rng),updateTrails=wingTrails(root),glint=distantGlint(root),flash=new THREE.PointLight(0xffb864,0,23,2);
 scene.add(flash);const wave=pressureRing(root,0xffe8b8),mist=pressureRing(root,0xffedce);
 wave.rotation.x=-PI/2;mist.rotation.set(-1.34,0,.24);
 function inst(geometry,material,n){
  const m=new THREE.InstancedMesh(geometry,material,n);m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(m);return m;
 }
 const sparks=inst(new THREE.ConeGeometry(1,1,5),new THREE.MeshBasicMaterial({color:0xffac3a,toneMapped:false}),99);
 const cores=inst(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:0xffefb4,toneMapped:false}),99);
 const feathers=inst(looseFeather(),new THREE.MeshStandardMaterial({vertexColors:true,color:0xffffff,roughness:.83,side:THREE.DoubleSide}),72);
 const chips=inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xbc8a59,roughness:.87}),34);
 const dummy=new THREE.Object3D(),up=V(0,1,0),direction=V(),pathPoint=V(),offset=V(),color=new THREE.Color();
 const settings=Array.from({length:205},(_,i)=>{
  const a=TAU*rng(),spread=.22+.78*rng(),v=3+10*rng();
  return {theta:a,x:Math.cos(a)*spread*v,z:Math.sin(a)*spread*v,y:1.9+(1-spread)*9+4.3*rng(),
   rate:3.8+8*rng(),size:.38+.68*rng(),flick:rng(),lag:i<99?rng()*.20:rng()*.33,life:.64+1.28*rng()};
 });
 for(let i=0;i<99;i++){sparks.setColorAt(i,color.setHex(i%4?0xffae49:0xff7b34));}
 for(let i=0;i<72;i++){feathers.setColorAt(i,color.setHex(i%7?0xfff3d9:0x626165));}
 function update(hit,origin,birdCenter){
  root.visible=!!hit&&hit.age>0;if(!root.visible){flash.intensity=0;return;}
  root.position.copy(origin);flash.position.copy(origin);flash.position.y+=.45;const a=hit.age;updateCloud(a,hit.strength,hit.originY);
  flash.intensity=225*(1-Math.exp(-38*a))*Math.exp(-4.30*a)+28*Math.exp(-1.9*a);flash.color.setRGB(1,.40+.27*Math.exp(-2*a),.085);
  const waveT=clamp(a/.98,0,1),mistT=clamp((a-.045)/.78,0,1);
  wave.position.y=.035-origin.y;wave.scale.setScalar(.12+7.15*(1-(1-waveT)**2));wave.material.uniforms.fade.value=.85*(1-waveT)**1.15;
  mist.position.y=.24+.46*mistT;mist.scale.setScalar(.18+5.45*(1-(1-mistT)**2));mist.material.uniforms.fade.value=.45*(1-mistT)**1.1;
  wave.visible=waveT<1;mist.visible=mistT>0&&mistT<1;
  // Store a bird-relative release point for each trailing feather, independent of frame rate.
  birdTravel(hit,a,pathPoint);offset.copy(birdCenter).sub(origin).sub(pathPoint);
  updateTrails(hit,offset);const glimmer=Math.max(0,1-Math.abs((a-3.60)/.22));
  glint.visible=glimmer>0;glint.position.copy(birdCenter).sub(origin);glint.scale.setScalar(2+7.5*glimmer);
  glint.material.opacity=Math.sin(glimmer*PI/2);glint.material.rotation=.31+glimmer*.22;
  let ns=0,nf=0,nc=0;
  settings.forEach((p,i)=>{
   const spark=i<99,feather=i>=99&&i<171,trailing=feather&&i%3!==0;
   const launch=trailing?.045+p.flick*2.90:p.lag,t=a-launch;
   if(t<=0||spark&&t>p.life)return;
   const drag=spark?.65:feather?1.75:1.0,travel=(1-Math.exp(-drag*t))/drag;
   let x=p.x*travel,y=p.y*t-4.45*t*t,z=p.z*travel;
   if(spark){
    if(y+origin.y<.04)return;
    const speed=Math.exp(-drag*t);
    direction.set(p.x*speed,p.y-8.9*t,p.z*speed);
    const length=clamp(direction.length()*.10,.15,1.42)*(1-t/p.life)**.52;
    direction.normalize();dummy.quaternion.setFromUnitVectors(up,direction);
    dummy.position.set(x,y,z).addScaledVector(direction,-length*.5);
    dummy.scale.set(.016+.022*p.size,length,.016+.022*p.size);dummy.updateMatrix();sparks.setMatrixAt(ns,dummy.matrix);
    dummy.position.set(x,y,z);dummy.scale.setScalar(.018+.033*(1-t/p.life));dummy.updateMatrix();cores.setMatrixAt(ns++,dummy.matrix);
   }else if(feather){
    const wind=.64*Math.sin(2.95*t+p.theta);
    if(trailing){
     birdTravel(hit,launch,pathPoint);
     x=offset.x+pathPoint.x+.36*p.x*travel+.9*t;
     y=offset.y+pathPoint.y+.24*p.y*travel-.94*t*t+.22*Math.sin(t*3.4+p.theta);
     z=offset.z+pathPoint.z+.46*p.z*travel-.66*t+wind;
    }else{x=.82*p.x*travel+.58*t;y=.96*p.y*travel-1.03*t*t+.24*Math.sin(t*4.2+p.theta);z=.83*p.z*travel-.64*t+wind;}
    const deck=Math.abs(z+origin.z-.32)<2.30,floor=(deck?.055:-.45)-origin.y;
    y=Math.max(floor,y);dummy.position.set(x,y,z);
    if(y===floor)dummy.rotation.set(.09,p.theta,-PI/2+.06*Math.sin(p.theta));
    else dummy.rotation.set(t*(2.3+p.size)+p.theta,.65*t*p.rate,.99*Math.sin(3*t+p.theta)+p.theta);
    dummy.scale.setScalar((trailing?.58:.73)*p.size);dummy.updateMatrix();feathers.setMatrixAt(nf++,dummy.matrix);
   }else{
    const floor=(Math.abs(origin.z+z-.32)<2.3?.045:-.48)-origin.y;
    y=Math.max(floor,y);dummy.position.set(.76*x,y,.76*z);
    const spin=y===floor?2.3:t*p.rate;dummy.rotation.set(spin+p.theta,spin*.7,spin*1.15);
    dummy.scale.set(.045*p.size,.20*p.size,.04*p.size);dummy.updateMatrix();chips.setMatrixAt(nc++,dummy.matrix);
   }
  });
  sparks.count=cores.count=ns;feathers.count=nf;chips.count=nc;
  for(const mesh of [sparks,cores,feathers,chips])mesh.instanceMatrix.needsUpdate=true;
 }
 return {update};
}
