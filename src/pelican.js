import {windFeathers,breathing} from './breeze.js';
import {THREE,PI,TAU,pedalPitch,V,clamp,mix,random,mat,group,mesh,ball,rod,curve,surface,loft,texture,batch} from './core.js';

import {breastFeathers,hingeWing,wingPose,gularTexture,warmMembrane,webbedFoot} from './plumage.js';

import {featherMaterial,setFeatherUVs,thighPlumage} from './feather-vane.js';
import {seatRider} from './pedal-balance.js';

function fleecyTexture(){
 return texture(512,512,(c,w,h)=>{
  c.fillStyle='#f6f3e9';c.fillRect(0,0,w,h);
  for(let i=0;i<39000;i++){
   const x=random()*w,y=random()*h,l=2+random()*15,tilt=Math.sin(y*.024)*2;
   c.strokeStyle=random()>.48?'rgba(105,97,77,.13)':'rgba(255,255,255,.52)';c.lineWidth=.32+random()*.85;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+l*.55,y+tilt,x+l,y+tilt+random()*1.8);c.stroke();
  }
 },true);
}
function paintGeometry(geo,fn){
 const pos=geo.attributes.position,uv=geo.attributes.uv,rgb=[];
 for(let i=0;i<pos.count;i++){const c=fn(pos.getX(i),pos.getY(i),pos.getZ(i),uv.getX(i),uv.getY(i));rgb.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
}
const color=h=>new THREE.Color(h);
export function pelican(root){
 const bird=group(root),torso=group(bird),head=group(bird),wings=[],blinkers=[];
 const down=fleecyTexture();down.repeat.set(3,3);
 const plumage=mat(0xffffff,.84,0,{map:down,vertexColors:true,bumpMap:down,bumpScale:.003});
 // A single continuous loft carries the breast through the S-shaped neck and crown.
 const anatomy=[
  [-.19,1.45,0,.025,.025],[-.21,1.50,0,.39,.19],[-.235,1.62,0,.58,.285],[-.275,1.79,0,.715,.345],[-.27,1.96,0,.77,.365],[-.21,2.10,0,.673,.334],[-.081,2.205,0,.529,.262],[.157,2.30,0,.327,.22],[.302,2.40,0,.204,.178],[.302,2.54,0,.155,.154],[.262,2.67,0,.138,.141],[.255,2.765,0,.144,.134],
  [.289,2.817,0,.162,.128],[.323,2.858,0,.204,.133],[.358,2.905,0,.258,.150],[.381,2.953,0,.282,.163],[.389,2.993,0,.281,.164],[.384,3.035,0,.254,.152],[.376,3.079,0,.215,.128],[.369,3.116,0,.150,.090],[.364,3.137,0,.080,.049],[.361,3.146,0,.003,.003]
 ];
 const body=loft(torso,anatomy,plumage,'y',230);
 const coords=new THREE.CatmullRomCurve3(anatomy.map(s=>V(s[0],s[1],s[2])),false,'catmullrom',.4);
 const rad=new THREE.CatmullRomCurve3(anatomy.map(s=>V(s[3],s[4],0)),false,'catmullrom',.35);
 function station(y){let lo=0,hi=1;for(let k=0;k<15;k++){let u=(lo+hi)/2;if(coords.getPoint(u).y<y)lo=u;else hi=u;}const t=(lo+hi)/2;return [coords.getPoint(t),rad.getPoint(t)];}
 function faceZ(x,y){const [c,r]=station(y);return r.y*Math.sqrt(Math.max(.001,1-Math.pow((x-c.x)/r.x,2)));}
 function birdColor(x,y,z){
  const c=color(0xf4eddb).lerp(color(0xbfb49e),clamp((1.88-y)*1.4+Math.max(-x,0)*.19,0,.66));
  c.lerp(color(0xe4c78e),clamp((y-2.77)*2.45,0,.78)*clamp(.9+(x-.38)*1.7,0,1));
  c.lerp(color(0xc8b991),clamp((y-2.24)*1.3,0,.40)*clamp((.26-x)*5,0,.9));
  const mask=Math.pow((x-.585)/.167,2)+Math.pow((y-2.963+(x-.57)*.075)/.07,2);
  c.lerp(color(0xc9957d),1-THREE.MathUtils.smoothstep(mask,.58,1.22));
  return c;
 }
 paintGeometry(body.geometry,birdColor);
 const vaneMat=featherMaterial(),windClock={value:0};
 function feather(parent,fn,tint,n=17,m=8,row=2,mirror=false){
  const g=surface(n,m,fn);paintGeometry(g,(x,y,z,u,v)=>tint.clone().multiplyScalar(.90+.10*Math.sin(PI*u*.85)+.035*(1-Math.abs(v*2-1))));
  setFeatherUVs(g,row,mirror);return mesh(parent,g,vaneMat);
 }
 // Long rectrices meet at the rump and spread into a tapered fan.
 const tail=group(bird);
 for(let i=0;i<15;i++){
  const k=(i-7)/7;
  feather(tail,(u,v)=>{const w=(v*2-1)*.058*Math.pow(Math.sin(PI*(.008+.982*u)),.64);
    return [mix(-.67,-1.34+.15*Math.abs(k),u),1.89+.038*u+.045*Math.sin(PI*u)-.041*k*k+.005*Math.cos((v-.5)*PI),mix(k*.103,k*.197,u)+w];},color(i%3===0?0xaca897:0xc8c4b2),20,8,1,i%2===0);
 }
 batch(tail);
 const tailPivot=V(-.68,1.92,0);tail.position.copy(tailPivot);
 for(const part of tail.children)part.geometry.translate(-tailPivot.x,-tailPivot.y,-tailPivot.z);
 for(const s of [-1,1]){
  const wing=group(bird);wings.push({wing,s});
  // The domed wing surface narrows to a single point at the primary tips.
  function cover(u,v,offset=0){
   const width=Math.pow(Math.max(.00001,Math.sin(PI*u)),.66);
   const cy=2.011-.126*u+.036*Math.sin(PI*u);
   return [.300-1.62*u,cy+v*width*(.288-.08*u),s*(.086+.282*width*Math.sqrt(Math.max(0,1-v*v*.82))+.048*(1-u)+offset)];
  }
  // A closed underwing gives the shoulder and wrist volume from the chase camera.
  // The inner vanes meet the outer coverts at both edges of the folded wing.
  function inside(u,v,inset=0){
   const p=cover(u,v,-.012),bulk=.227*Math.pow(Math.max(.00001,Math.sin(PI*u)),.82)*Math.sqrt(Math.max(0,1-v*v));
   p[2]-=s*(bulk+inset);return p;
  }
  const foundation=surface(54,40,(u,q)=>{
   const a=q*TAU,v=Math.sin(a);return Math.cos(a)>=0?cover(u,v,-.012):inside(u,v);
  },s>0);
  paintGeometry(foundation,(x,y,z,u,v)=>color(0xd0cdbc).lerp(color(0x48504f),THREE.MathUtils.smoothstep(u,.54,.90)).multiplyScalar(.81+.16*Math.max(0,Math.cos(TAU*v))));
  const wingBase=mat(0xffffff,.84,0,{side:THREE.DoubleSide,map:down,vertexColors:true});mesh(wing,foundation,wingBase);
  for(let row=0;row<2;row++)for(let i=0;i<12;i++){
   const j=i/11,from=.09+.44*j,to=from+.20+.066*Math.sin(j*PI),startV=.62-.51*row,endV=-.14-.48*row+.16*j;
   feather(wing,(t,k)=>{
    const v=mix(startV,endV,t)+(2*k-1)*.165*Math.pow(Math.sin(PI*(.007+.987*t)),.63);
    return inside(mix(from,to,t),v,.003+.004*Math.sin(PI*k)+.003*row);
   },color(0xc5bfad).lerp(color(0xece5ce),.28+.27*j+.08*Math.sin(i*3.3)),14,6,2,s>0);
  }
  function strip(ua,ub,va,vb,width,offset,tint,order,extension=0,tile=2){
   feather(wing,(t,k)=>{
    const u=mix(ua,ub,t),span=width*Math.pow(Math.sin(PI*(.003+.996*t)),.60)*(.75+.38*t);
    const v=clamp(mix(va,vb,t)+(.045*Math.sin(PI*t))+(k*2-1)*span,-1.035,1.035);
    const shaft=.0031*Math.exp(-Math.pow((k-.47)/.10,2))*(1-t);
    const rise=offset+.006*Math.sin(PI*k)+.0046*Math.sin(PI*t)+shaft+order*.00033;
    const pt=cover(u,v,rise);pt[0]-=extension*t*t;pt[1]-=extension*.09*t;return pt;
   },tint,24,10,tile,s<0);
  }
  // Long, asymmetric primaries keep independent tips beyond the folded wing.
  for(let i=0;i<10;i++){
   const order=i/9,root=cover(.29+.042*order,-.83+order*1.51,.003);
   const tip=[-1.195-.355*order+.016*Math.sin(i*2.3),1.805+.130*order+.007*Math.sin(1.7*i),s*(.189-.067*order)];
   const tint=color(0x333c42).lerp(color(0x686d68),.10+.52*order+.06*Math.sin(i*2.6));
   const primary=feather(wing,(t,v)=>{
    const width=(.056+.017*order)*Math.pow(Math.sin(PI*(.004+.995*t)),.53)*(.72+.31*t);
    const across=(v-.42)*(v<.42?1.72:2.15)*width,arch=Math.sin(PI*t);
    const ridge=.0045*Math.exp(-Math.pow((v-.425)/.068,2))*(1-.84*t);
    return [mix(root[0],tip[0],t)+across*.24,mix(root[1],tip[1],t)+.036*arch+across,
     mix(root[2],tip[2],t)+s*(.083*arch+.011*Math.sin(PI*v)*arch+ridge+.012*(1-v)*t)];
   },tint,35,12,0,s<0);primary.userData.primary=order;
  }
  for(let i=0;i<13;i++){let j=i/12;strip(.17+.055*j,.60+.248*j,-.866+j*1.56,-.94+j*1.76,.184,.013,color(0xb2b1a1).lerp(color(0xf0ead9),j*.54+random()*.22),i,.035+.043*Math.sin(j*PI),1);}
  // Coverts grow in diagonal tracts. Their rounded ends overlap the bases
  // of the longer flight feathers, with the smallest feathers at the shoulder.
  for(let row=0;row<3;row++){
   const count=[15,14,12][row];
   for(let i=0;i<count;i++){
    const j=i/(count-1),jitter=.014*Math.sin(2.38*i+.7*row),root=.030+.515*j+jitter;
    const length=.255-.055*row+.08*Math.sin(PI*j)+.022*Math.cos(i*3.1+row);
    const upper=.05+.34*j+.27*row+.035*Math.cos(i*1.6);
    const lower=-.87+.40*j+.319*row+.055*Math.sin(i*1.72+row);
    const tint=color(0xbbb8a7).lerp(color(0xfff5df),.36+.31*j+.08*row+.08*Math.cos(i*3.08));
    strip(root,root+length,upper,lower,.187+.022*row,.022+row*.008,tint,i,.018+.018*j,2);
   }
  }
  // Scapulars drape across the coverts from the upper back.
  for(let i=0;i<12;i++){
   const j=i/11,root=.046+.51*j+.015*Math.sin(2.13*i);
   strip(root,root+.185+.098*Math.sin(PI*j)+.037*j,.90+.07*Math.cos(1.7*i),
    -.01+.57*j+.056*Math.sin(i*2.23),.183+.022*j,.048+.005*j,
    color(0xcac5b5).lerp(color(0xfff2d9),.32+.37*j+.08*Math.sin(i*2.1)),i,.037+.040*j,1);
  }
  const fingers=[];let vertex=0;
  for(const part of wing.children){
   if(part.material!==vaneMat)continue;
   const end=vertex+part.geometry.index.count;
   if(part.userData.primary!==undefined)fingers.push({start:vertex,end,order:part.userData.primary});
   vertex=end;
  }
  batch(wing);hingeWing(wing,s,fingers);windFeathers(wing,windClock,s,.026);
 }
 // Fine overlapping contour feathers follow the changing neck cross-section.
 for(let row=0;row<9;row++)for(let i=0;i<34;i++){
  let phi=TAU*(i+row*.44+random()*.22)/34,rootY=2.91-row*.058+random()*.012,length=.076+random()*.041;
  let slots=[];
  for(let k=0;k<=10;k++)slots.push(station(rootY-length*k/10));
  feather(torso,(t,v)=>{let [c,r]=slots[Math.round(t*10)],a=phi+(v*2-1)*.112*Math.pow(Math.sin(PI*(.004+.992*t)),.55)+.05*t*Math.sin(phi);
   let offset=.0018+.0023*Math.sin(PI*v)+.0014*t;
   return [c.x+(r.x+offset)*Math.cos(a),rootY-length*t,(r.y+offset)*Math.sin(a)];
  },birdColor(.3+.14*Math.cos(phi),rootY,0).multiplyScalar(.998+random()*.013),10,6,3,i%2===0);
 }
 breastFeathers(torso,station,birdColor,feather);
 // Short crown feathers comb back from the forehead, leaving the bare orbital skin exposed.
 for(let row=0;row<6;row++)for(let i=0;i<33;i++){
  const phi=TAU*(i+.47*row+.08*Math.sin(2*i))/33,y0=3.137-.023*row+.004*Math.sin(i*2.1);
  const [c,r]=station(y0),x0=c.x+r.x*Math.cos(phi);
  if(x0>.443&&y0<3.062)continue;
  const len=.040+.013*Math.sin(i*1.4+row),span=.119+.016*Math.sin(i+2*row);
  const slices=Array.from({length:9},(_,j)=>station(y0-len*j/8));
  feather(head,(u,v)=>{
   const [c,r]=slices[Math.round(8*u)],a=phi+.24*Math.sin(phi)*u+(2*v-1)*span*Math.pow(Math.sin(PI*(.006+.988*u)),.57);
   const lift=.0008+.0019*u*u+.0011*Math.sin(PI*v);
   return [c.x+(r.x+lift)*Math.cos(a),y0-len*u,(r.y+lift)*Math.sin(a)];
  },birdColor(x0,y0,0).lerp(color(0xe2c88f),.085+.045*Math.sin(phi)),8,5,3,i%2===0);
 }
 for(let i=0;i<43;i++){
  const phi=PI+(random()-.5)*1.95,rootY=2.99+random()*.055,len=.105+random()*.085;
  const [c,r]=station(rootY),x=c.x+r.x*Math.cos(phi),z=r.y*Math.sin(phi);
  feather(head,(u,v)=>{const width=(v*2-1)*.010*Math.pow(Math.sin(PI*(.01+.98*u)),.63);
   return [x-.058*u+.012*u*u+width*Math.cos(phi+PI/2),rootY-len*u,z+.018*u*Math.sin(phi)+width*Math.sin(phi+PI/2)];},color(0xe2cc9f).lerp(color(0xf2e7ce),random()*.8),12,5);
 }
 const pouchTexture=gularTexture();
 const pouchMat=warmMembrane(mat(0xffffff,.62,0,{map:pouchTexture,vertexColors:true,side:THREE.DoubleSide,bumpMap:pouchTexture,bumpScale:.0012}));
 const lipY=x=>2.929-(x-.62)*.146;
 const shape=new THREE.CatmullRomCurve3([[.385,.026,.023],[.45,.173,.10],[.555,.248,.139],[.724,.277,.151],[.941,.227,.15],[1.195,.154,.124],[1.423,.089,.09],[1.59,.035,.053],[1.649,.014,.023]].map(v=>V(...v)),false,'catmullrom',.38);
 const pouch=surface(66,42,(u,v)=>{let r=shape.getPoint(u),a=PI*v,k=Math.sin(a);return [r.x,lipY(r.x)-.004-r.y*Math.pow(k,.78),r.z*Math.cos(a)*(1+.075*k)];},true);
 paintGeometry(pouch,(x,y,z,u,v)=>{let c=color(0xf7bc5a).lerp(color(0xdf8a43),Math.pow(Math.sin(v*PI),.88)*.7).lerp(color(0xdf9b75),clamp((.39-u)*1.85,0,.64));return c;});
 mesh(head,pouch,pouchMat);
 const billMat=mat(0xffffff,.45,0,{map:pouchTexture,vertexColors:true,bumpMap:pouchTexture,bumpScale:.001});
 const upper=loft(head,[[.515,2.941,0,.045,.097],[.602,2.961,0,.063,.137],[.749,2.951,0,.057,.151],[.932,2.922,0,.047,.147],[1.204,2.874,0,.034,.122],[1.456,2.832,0,.026,.086],[1.595,2.805,0,.017,.051],[1.659,2.787,0,.011,.022],[1.673,2.776,0,.007,.008]],billMat);
 paintGeometry(upper.geometry,(x,y,z,u)=>color(0xf6dca7).lerp(color(0xdba598),clamp((.48-u)*1.1,0,.42)).lerp(color(0xf8e3ac),clamp(1-Math.abs(z)*11,0,.5)));
 const crease=mat(0x967044,.63),nail=mat(0xcc7539,.49);
 for(const s of [-1,1]){
  curve(head,Array.from({length:24},(_,i)=>{let r=shape.getPoint(.16+.83*i/23);return[r.x,lipY(r.x)-.003,s*r.z];}),.0039,crease,36,6);
 }
 loft(head,[[1.607,2.801,0,.011,.025],[1.642,2.793,0,.016,.027],[1.667,2.779,0,.018,.019],[1.674,2.763,0,.014,.010],[1.67,2.752,0,.004,.004]],nail);
 const lid=mat(0xbd9273,.60),iris=mat(0xa89963,.31),pupil=mat(0x131912,.14),glint=new THREE.MeshBasicMaterial({color:0xfffae3});
 for(const s of [-1,1]){
  const ex=.509,ey=2.984,ez=faceZ(ex,ey);
  const eye=group(head);eye.position.set(ex,ey,s*(ez+.0008));eye.rotation.y=s*.255;blinkers.push(eye);
  ball(eye,[0,0,.0008*s],[.034,.026,.006],lid);ball(eye,[.001,.001,.0032*s],[.024,.0216,.0069],iris);ball(eye,[.002,.001,.0089*s],[.0134,.0144,.0032],pupil);ball(eye,[-.002,.006,.0117*s],[.0033,.0033,.0014],glint);
  curve(eye,[[-.029,.004,.003*s],[-.017,.019,.006*s],[.003,.024,.006*s],[.021,.015,.005*s],[.031,.002,.003*s]],.0026,lid,18,6);batch(eye);
  ball(head,[.669,2.988,s*.128],[.021,.005,.0045],crease).rotation.z=-.13;
 }
 batch(torso);batch(head);windFeathers(tail,windClock,0,.022);windFeathers(head,windClock,0,.0022);
 // Bend the neck gradually at its base. The bill and eyes follow the crown rigidly.
 const flex={value:0},turn={value:0},level={value:0},inhale={value:0},tuck={value:0},bendCode=`
  float angle=neckFlex*smoothstep(2.22,2.83,position.y);
  mat2 bend=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
  float yaw=neckTurn*smoothstep(2.38,2.835,position.y);
  mat2 swivel=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw));
  float roll=neckLevel*(.35*smoothstep(1.68,2.19,position.y)+.65*smoothstep(2.19,2.836,position.y));
  mat2 steady=mat2(cos(roll),sin(roll),-sin(roll),cos(roll));
 `;
 function deform(material,shaded,feathered=false){
  material.onBeforeCompile=shader=>{
   shader.uniforms.chestBreath=inhale;shader.uniforms.neckTuck=tuck;shader.uniforms.windCycle=windClock;shader.uniforms.neckFlex=flex;shader.uniforms.neckTurn=turn;shader.uniforms.neckLevel=level;shader.vertexShader='uniform float neckLevel,neckTurn,neckFlex,chestBreath,neckTuck,windCycle;\n'+shader.vertexShader;
   if(shaded)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n'+bendCode+'objectNormal.xy=bend*objectNormal.xy;objectNormal.xz=swivel*objectNormal.xz;objectNormal.yz=steady*objectNormal.yz;');
   const tissue=`
    float chest=smoothstep(1.50,1.89,position.y)*(1.-smoothstep(2.10,2.43,position.y));
    transformed.x+=chest*chestBreath*.031*smoothstep(-.25,.42,position.x);
    transformed.y+=chest*chestBreath*.009;transformed.z*=1.+chest*chestBreath*.049;
    transformed.xy+=vec2(.142,-.49)*neckTuck*smoothstep(1.92,2.833,position.y);
    ${feathered?'transformed.z+=sign(position.z)*.0022*smoothstep(.18,1.,uv.x)*sin(7.*windCycle+7.4*position.x-position.y*3.1);':''}
   `;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+(shaded?'':bendCode)+'transformed.xy=bend*(transformed.xy-vec2(.29,2.24))+vec2(.29,2.24);transformed.xz=swivel*(transformed.xz-vec2(.29,0.))+vec2(.29,0.);transformed.yz=steady*(transformed.yz-vec2(2.24,0.))+vec2(2.24,0.);'+tissue);
  };
  material.customProgramCacheKey=()=>['neck',shaded,feathered].join('/');return material;
 }
 const bentDepth=deform(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),false);
 const featherDepth=deform(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:vaneMat.map,alphaTest:vaneMat.alphaTest,side:THREE.DoubleSide}),false,true);
 for(const part of torso.children){part.customDepthMaterial=part.material===vaneMat?featherDepth:bentDepth;part.material=deform(part.material.clone(),true,part.material===vaneMat);}

 const leg=mat(0xd69a59,.71),legDark=mat(0xb68251,.76),toe=mat(0xbc8d62,.65),nails=mat(0x776f57,.62),thighMat=mat(0xe8e1ca,.86,0,{map:down});
 const legs=[];head.rotation.order='XYZ';const neckPivot=V(.29,2.24,0);
 for(const s of [-1,1]){
  const thigh=group(root),shin=group(root),foot=group(root);
  loft(thigh,[[0,0,0,.102,.1],[0,.12,0,.108,.093],[0,.34,0,.088,.079],[0,.49,0,.052,.050],[0,.56,0,.037,.034]],thighMat,'y',24);
  thighPlumage(thigh,feather,color(0xe9e4d3));
  rod(thigh,[0,.40,0],[0,.59,0],.04,leg,.03,18);
  ball(shin,[0,.012,0],[.042,.048,.038],leg);
  rod(shin,[0,0,0],[0,.605,0],.032,leg,.024,18);
  for(let i=1;i<25;i++){let y=i*.024;const r=mix(.032,.024,y/.605);rod(shin,[0,y,0],[0,y+.0022,0],r*1.018,legDark,r*1.02,14);}
  webbedFoot(foot,{leg,toe,nails});
  batch(thigh);batch(shin);legs.push({thigh,shin,foot,s});
 }
 const Y=V(0,1,0),flyingFoot=new THREE.Quaternion(),footEuler=new THREE.Euler(),freeFoot=V();
 function segment(g,a,b,len){const d=b.clone().sub(a);g.position.copy(a);g.scale.y=d.length()/len;g.quaternion.setFromUnitVectors(Y,d.normalize());}
 return {animate(t,phase,load,duck=0,motion=null){
  seatRider(bird,load,duck,motion);tuck.value=duck;inhale.value=breathing(t,phase,load.compression);windClock.value=TAU*(t%32)/32;
  tail.rotation.z=-.019*Math.sin(phase*2-.65)-.012*load.compression;
  tail.rotation.y=-.026*load.shoulderLoad+(motion?.heading||0)*.44;
  tail.rotation.z+=(motion?.wing||0)*.115;
  const bend=.019*Math.sin(phase-.37)+.018*Math.sin(TAU*t/16+.7);
  const wind=t*TAU/32,glance=Math.pow(.5+.5*Math.cos(wind-1.67),14),lookAhead=Math.pow(.5+.5*Math.cos(wind-4.55),19);
  flex.value=bend+.040*glance-.033*lookAhead-.70*load.pelvisPitch-.23*(motion?.crash?.flinch||0);
  level.value=-.84*load.pelvisRoll-.34*load.frameRoll-.49*(motion?.bank||0)-.68*(motion?.riderLean||0);
  turn.value=.025*Math.sin(wind*2)-.237*glance+.132*lookAhead;
  turn.value-=.65*load.pelvisYaw;head.rotation.set(level.value,turn.value,flex.value,'XYZ');
  head.position.copy(neckPivot).applyQuaternion(head.quaternion).multiplyScalar(-1).add(neckPivot);
  head.position.x+=.142*duck;head.position.y-=.49*duck;
  for(const {wing,s} of wings){wingPose(wing,s,t,phase,load,motion);wing.position.z=s*(.198+.004*inhale.value);}
  const blink=(t+2.4)%5.78;const naturalBlink=blink<.17?Math.max(.065,Math.abs(blink-.085)/.085):1;
  const flinch=motion?.crash?.flinch||0;blinkers.forEach(o=>o.scale.y=Math.max(.06,naturalBlink-1.65*flinch));
  for(const {thigh,shin,foot,s} of legs){
   const px=-.075+s*.196*Math.cos(phase),py=.565-s*.196*Math.sin(phase);
   foot.rotation.set(0,0,pedalPitch(phase,s));
   foot.position.set(-.016,.047,s*.007).applyQuaternion(foot.quaternion).add(V(px,py,s*.203));
   const thrown=motion?.crash,release=thrown?.release||0;
   if(release>0){
    // The webs leave the pedal axles, kick out, then trail together under the tail in the glide.
    const age=thrown.age,kick=Math.sin(age*7.9+s*.85)*Math.exp(-1.9*age);
    freeFoot.set(-.78+.23*kick,1.19+.145*s*kick,s*(.29+.14*Math.exp(-1.6*age)));
    foot.position.lerp(freeFoot,release);
    flyingFoot.setFromEuler(footEuler.set(s*.24*Math.sin(age*4),s*.15,-.84+.44*kick));
    foot.quaternion.slerp(flyingFoot,release);
   }
   const pressure=mix(.10+.90*(s===1?load.right:load.left),.05,release);
   for(const part of foot.children)part.morphTargetInfluences[0]=pressure;
   const h=V(-.214,1.614,s*.183).applyMatrix4(bird.matrix),end=V(-.073,.035,0).applyQuaternion(foot.quaternion).add(foot.position),d=end.clone().sub(h),length=d.length(),dir=d.normalize(),L1=.59,L2=.605;
   const a=clamp((L1*L1-L2*L2+length*length)/(2*length),0,L1),height=Math.sqrt(Math.max(0,L1*L1-a*a));
   const pole=V(-1,0,s*.082);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
   const joint=h.clone().addScaledVector(dir,a).addScaledVector(pole,height);
   segment(thigh,h,joint,L1);segment(shin,joint,end,L2);
  }
 }};
}
