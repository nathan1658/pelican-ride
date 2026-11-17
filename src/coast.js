import {shoreBreak} from './surf.js';
import {panoramaHeading} from './daybreak.js';
import {THREE,PI,TAU,LOOP_DISTANCE,V,mix,clamp,random,mat,group,mesh,box,rod,texture,surface,batch} from './core.js';

import {Reflector} from 'three/addons/objects/Reflector.js';
import {duneHeight,sandBank,shorebirds,seaOats} from './shore-life.js';

function makeTimber(){
 const h=1024,w=1024,n=16;
 return texture(w,h,(ctx)=>{
  const pixels=ctx.createImageData(w,h);
  const hash=(i,j)=>{let k=Math.imul(i+3919,1597334677)^Math.imul(j+619,381201581);k=Math.imul(k^(k>>>16),2246822519);return ((k^(k>>>13))>>>0)/4294967296;};
  const smooth=(i,j)=>{const x=Math.floor(i),y=Math.floor(j);let a=i-x,b=j-y;a=a*a*(3-2*a);b=b*b*(3-2*b);return mix(mix(hash(x,y),hash(x+1,y),a),mix(hash(x,y+1),hash(x+1,y+1),a),b);};
  for(let x=0;x<w;x++)for(let y=0;y<h;y++){
   const board=x>>6,across=x%64,edge=Math.min(across,63-across),grain=across+2.8*Math.sin(y/151+board*4.3)+1.7*Math.sin(y/58+board*.7),k=(y*w+x)*4;
   const age=hash(board,27)*20,figure=smooth(grain*.095+124*board,y*.003)*13+smooth(grain*.33+board*95,y*.008)*15;
   const fiber=(smooth(grain*1.4,y*.021)-.52)*18+(random()-.5)*8+Math.sin(grain*2.21+.43*Math.sin(y*.026))*.9;
   const dark=edge===0?-54:edge===1?-13:edge===2?9:0;
   const val=96+age+figure+fiber+dark;pixels.data[k]=val*1.09+13;pixels.data[k+1]=val*1.03+8;pixels.data[k+2]=val*.96+3;pixels.data[k+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  for(let b=0;b<n;b++){
   for(let j=0;j<4;j++){
    let x=b*64+8+random()*47,y=random()*h;ctx.save();ctx.translate(x,y);ctx.strokeStyle='rgba(64,55,44,.18)';ctx.lineWidth=.7;
    const s=1.5+random()*1.5;for(let i=1;i<=3;i++){ctx.beginPath();ctx.ellipse(0,0,s*i,5*s*i,.01,0,TAU);ctx.stroke();}ctx.restore();
   }
   for(const y of [59,75,494,510,948,964]){const x=b*64+(y%2?15:49);ctx.fillStyle='rgba(59,55,48,.67)';ctx.beginPath();ctx.arc(x,y,1.65,0,TAU);ctx.fill();ctx.fillStyle='rgba(204,200,178,.85)';ctx.fillRect(x-.7,y-.8,1.4,.7);}
  }
 },true);
}
export function coast(scene,assets){
 const beltLength=LOOP_DISTANCE/3,boardPeriod=LOOP_DISTANCE/42;
 const skyMaterial=new THREE.ShaderMaterial({depthWrite:false,depthTest:false,side:THREE.DoubleSide,
  uniforms:{panorama:{value:assets.pano},clock:{value:0}},
  vertexShader:`varying vec3 direction;void main(){vec3 ray=vec3(position.x/projectionMatrix[0][0],position.y/projectionMatrix[1][1],-1.);direction=transpose(mat3(viewMatrix))*ray;gl_Position=vec4(position.xy,.99998,1.);}`,
  fragmentShader:`uniform sampler2D panorama;uniform float clock;varying vec3 direction;
  void main(){
   vec3 d=normalize(direction);vec2 uv=vec2(fract(${panoramaHeading.toFixed(6)}+atan(d.x,-d.z)/6.2831853),.5+asin(clamp(d.y,-1.,1.))/3.14159265);
   vec2 dx=dFdx(uv),dy=dFdy(uv);dx.x-=round(dx.x);dy.x-=round(dy.x);
   vec3 col=textureGrad(panorama,uv,dx,dy).rgb;float glare=smoothstep(.47,.96,col.g)*smoothstep(.20,.69,col.r-col.b);col.g*=1.-.09*glare;col.b+=.37*glare*(col.r-col.b);col=mix(vec3(dot(col,vec3(.2126,.7152,.0722))),col,1.025);gl_FragColor=vec4(col,1.);
   #include <colorspace_fragment>
  }`
 });
 const sky=new THREE.Mesh(new THREE.PlaneGeometry(2,2),skyMaterial);sky.frustumCulled=false;sky.renderOrder=-100;sky.layers.enable(2);scene.add(sky);
 const swell=shoreBreak(scene,assets.pano);
 const wood=makeTimber();
 const woodMat=new THREE.MeshPhysicalMaterial({color:0xbfb7a6,roughness:.73,map:wood,bumpMap:wood,bumpScale:.007,clearcoat:.23,clearcoatRoughness:.33});
 // The damp planks share one low-resolution planar reflection. Only the rider
 // and sky enter this pass, keeping foliage and the shadow map out of it.
 let reflection=null;
 if(assets.reflect){
  reflection=new Reflector(new THREE.PlaneGeometry(640,4.62),{textureWidth:400,textureHeight:240,clipBias:.001,multisample:0});
  reflection.rotation.x=-PI/2;reflection.position.set(0,-.001,.33);reflection.renderOrder=-90;
  reflection.camera.layers.set(2);reflection.material.colorWrite=false;reflection.material.depthWrite=false;reflection.material.depthTest=false;
  scene.add(reflection);
 }
 const boardShift={value:0},laneGuides={value:0};
 woodMat.onBeforeCompile=shader=>{
  shader.uniforms.boardShift=boardShift;shader.vertexShader='varying vec2 timberCoords;uniform float boardShift;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntimberCoords=vec2(position.x+boardShift,position.z);');
  shader.uniforms.laneGuides=laneGuides;shader.fragmentShader='uniform float laneGuides;varying vec2 timberCoords;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float q=timberCoords.x*6.2831853/${LOOP_DISTANCE.toFixed(8)};
   float salt=.48+.21*sin(q*23.+timberCoords.y*1.9)+.16*sin(q*47.-timberCoords.y*5.2)+.065*sin(q*119.+timberCoords.y*9.);
   float damp=smoothstep(.46,.76,salt)*(.33+.67*smoothstep(.6,2.5,abs(timberCoords.y)));
   roughnessFactor=mix(roughnessFactor,.27,damp);diffuseColor.rgb*=1.-.20*damp;
   float margin=abs(abs(timberCoords.y-.32)-.695);float aa=max(.002,fwidth(timberCoords.y)*.68);
   float seam=(1.-smoothstep(.014-aa,.014+aa,margin))*(1.-smoothstep(.30,.33,abs(fract((timberCoords.x+.17)/${(LOOP_DISTANCE/56).toFixed(6)})-.50)));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.54,.38),laneGuides*seam*.64);`);
  if(reflection){
   shader.uniforms.wetView=reflection.material.uniforms.tDiffuse;
   shader.uniforms.wetMatrix=reflection.material.uniforms.textureMatrix;
   shader.vertexShader='varying vec4 wetCoords;uniform mat4 wetMatrix;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nwetCoords=wetMatrix*vec4(position.x,.33-position.z,0.,1.);');
   shader.fragmentShader='varying vec4 wetCoords;uniform sampler2D wetView;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    vec2 uvWet=wetCoords.xy/wetCoords.w;
    uvWet.y+=.0017*sin(timberCoords.y*52.+timberCoords.x*83.)+.0007*sin(timberCoords.y*211.);
    vec2 blur=vec2(.003,.006)*(1.25-.55*damp);
    vec3 reflected=.36*texture2D(wetView,uvWet).rgb;
    reflected+=.16*(texture2D(wetView,uvWet+blur).rgb+texture2D(wetView,uvWet-blur).rgb+texture2D(wetView,uvWet+vec2(blur.x,-blur.y)).rgb+texture2D(wetView,uvWet+vec2(-blur.x,blur.y)).rgb);
    float fresnel=.10+.43*pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);
    outgoingLight=mix(outgoingLight,reflected,fresnel*damp*.83);
    #include <opaque_fragment>`);
  }
 };

 const board=mesh(scene,surface(1,1,(u,v)=>[mix(-320,320,u),0,mix(-1.98,2.64,v)],true),woodMat,false);
 const uv=board.geometry.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*640/boardPeriod);
 const fascia=mat(0x85765e,.92);box(scene,[0,-.089,-1.972],[640,.173,.06],fascia);box(scene,[0,-.089,2.64],[640,.173,.06],fascia);
 // Low dune plants mark the edge of the moving boardwalk.
 const belt=group(scene),positions=[],colors=[],indices=[],weights=[];
 sandBank(belt,assets.sand,beltLength);const fly=shorebirds(scene);
 const shades=['#454b2b','#687047','#798052','#a29a64','#c6b581','#a0986c'].map(c=>new THREE.Color(c));
 function blade(x,y,z,h,w,bx,bz,c){
  const base=positions.length/3,angle=random()*TAU,nx=Math.cos(angle)*w,nz=Math.sin(angle)*w;
  for(let j=0;j<5;j++){let u=j/4,ww=(1-Math.pow(u,1.4))*.9+.015,xx=x+bx*u*u,zz=z+bz*u*u,yy=y+h*(u-.14*u*u*u);
   for(const k of [-1,1]){weights.push(u*u*.9);positions.push(xx+k*ww*nx,yy,zz+k*ww*nz);colors.push(c.r*(.62+.38*u),c.g*(.66+.34*u),c.b*(.62+.38*u));}
   if(j<4){let i=base+j*2;indices.push(i,i+2,i+1,i+1,i+2,i+3);}
  }
 }
 for(let patch=0;patch<145;patch++){
  const x=(random()-.5)*beltLength,z=patch%6===0?2.76+random()*.49:-2.16-random()*1.38;
  const size=.28+random()*.70,y=z<0?duneHeight(x,z,beltLength):-.215;
  for(let tu=0;tu<7;tu++){let ax=x+(random()-.5)*size,az=z+(random()-.5)*size*.65,s=.6+random()*.6;
   for(let k=0;k<14;k++){let a=random()*TAU,r=random()*.13;blade(ax+Math.cos(a)*r,y-.023,az+Math.sin(a)*r,(.16+random()*.38)*size*s,.004+random()*.008,Math.cos(a)*(.06+random()*.19)+.05,Math.sin(a)*(.07+random()*.17),shades[Math.floor(random()*shades.length)]);}
  }
 }
 seaOats(positions,colors,indices,weights,beltLength);
 const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('windWeight',new THREE.Float32BufferAttribute(weights,1));grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));grassGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));grassGeo.setIndex(indices);grassGeo.computeVertexNormals();
 const grassMat=mat(0xffffff,.94,0,{vertexColors:true,side:THREE.DoubleSide});const breeze={value:0};
 grassMat.onBeforeCompile=shader=>{
  shader.uniforms.breeze=breeze;shader.vertexShader='uniform float breeze;attribute float windWeight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float gust=sin(position.x*.87+position.z*.5+breeze*5.)*.67+sin(position.x*2.32-breeze*8.)*.33;
   transformed.x+=windWeight*(.014+.043*gust);transformed.z+=windWeight*.022*sin(position.z+position.x*.4+breeze*3.);`);
 };
 const grass=mesh(belt,grassGeo,grassMat,false);grass.receiveShadow=false;
 const postGrain=wood.clone();postGrain.repeat.set(.045,.42);postGrain.rotation=PI*.5;postGrain.needsUpdate=true;
 const fences=group(belt),postMat=mat(0xb1a593,.87,0,{map:postGrain,bumpMap:postGrain,bumpScale:.0028}),wireMat=mat(0x57584e,.67,.46);
 for(let i=0;i<10;i++){
  const x=(i-5)*beltLength/10+.45,z=-2.15;
  const post=box(fences,[x,.072,z],[.085,.596,.092],postMat);post.rotation.z=.012*Math.sin(i*34);
  for(const y of [.12,.29]){rod(fences,[x,y,z+.039],[x,y,z+.053],.013,wireMat,.012,8);let q=[x,y,z];rod(fences,q,[x+beltLength/20,y-.031,z],.0042,wireMat,.0042,6);rod(fences,[x+beltLength/20,y-.031,z],[x+beltLength/10,y,z],.0042,wireMat,.0042,6);}
 }
 batch(fences);
 const sections=[{mesh:belt,offset:0}];
 for(let offset=-6;offset<=6;offset++){if(!offset)continue;const section=(Math.abs(offset)<=1?belt:fences).clone(true);scene.add(section);sections.push({mesh:section,offset});}
 const ambientShadow=texture(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,0,64,64,62);g.addColorStop(0,'rgba(32,28,22,.48)');g.addColorStop(.46,'rgba(31,29,21,.24)');g.addColorStop(1,'rgba(35,30,25,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
 const contacts=[];
 function shadow(x,w,h,opacity){const s=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:ambientShadow,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));s.rotation.x=-PI/2;s.position.set(x,.003,0);scene.add(s);contacts.push({s,opacity,restX:x});}
 shadow(-.12,3.26,.93,.63);shadow(-1.03,.46,.19,1);shadow(1.06,.46,.19,1);
 return {animate(t,d,lane=0,height=0,playingCourse=false,offsetX=0){
  laneGuides.value=playingCourse?1:0;
  swell(t);fly(t);breeze.value=t*TAU/32;boardShift.value=d%LOOP_DISTANCE;wood.offset.x=(d/boardPeriod)%1;
  const x=((d+beltLength*.5)%beltLength)-beltLength*.5;
  for(const section of sections)section.mesh.position.x=section.offset*beltLength-x;
  for(const {s,opacity,restX} of contacts){s.position.x=restX+offsetX;s.position.z=lane;s.material.opacity=opacity/(1+height*4.6);s.scale.set(1+.33*height,1+.65*height,1);}
 }};
}
