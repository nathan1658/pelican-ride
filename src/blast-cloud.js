import {THREE,V,clamp} from './core.js';

// A ray-marched density field lets the fire and smoke keep their volume during camera orbits.
export function blastCloud(parent,rng){
 const size=32,bytes=new Uint8Array(size**3);
 for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(256*rng());
 const noise=new THREE.Data3DTexture(bytes,size,size,size);
 noise.format=THREE.RedFormat;noise.minFilter=noise.magFilter=THREE.LinearFilter;
 noise.wrapS=noise.wrapT=noise.wrapR=THREE.RepeatWrapping;noise.unpackAlignment=1;noise.needsUpdate=true;
 const shapes=[
  [0,.10,0,1.54],[-1.1,.40,.58,1.26],[.92,.35,.54,1.37],[.13,-.17,-1.07,1.22],
  [-.60,1.25,-.40,1.39],[.55,1.50,.31,1.24],[1.50,.06,-.37,.84],[-1.32,-.09,-.49,.90],[.02,2.13,-.18,.89]
 ];
 const lobes=shapes.map(()=>new THREE.Vector4()),low=V(),high=V(),eye=V(),clip=new THREE.Matrix4();
 const uniforms={field:{value:noise},clock:{value:0},lobes:{value:lobes},low:{value:low},high:{value:high},eye:{value:eye},clip:{value:clip},floorY:{value:0}};
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,uniforms,
 vertexShader:`varying vec3 localPos;void main(){localPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`
 precision highp sampler3D;
 uniform sampler3D field;uniform float clock,floorY;uniform vec4 lobes[9];uniform vec3 low,high,eye;uniform mat4 clip;
 varying vec3 localPos;
 float n(vec3 p){return texture(field,(p+.5)/32.).r;}
 float turbulence(vec3 p){return n(p)*.50+n(p*2.07+3.21)*.28+n(p*4.31-6.15)*.15+n(p*8.73+9.77)*.07;}
 float body(vec3 p){
  float d=-30.;
  for(int i=0;i<9;i++){float f=lobes[i].w-length(p-lobes[i].xyz);float h=max(.0,.33-abs(d-f))/.33;d=max(d,f)+h*h*.0825;}
  return d;
 }
 void main(){
  vec3 ray=normalize(localPos-eye),inv=sign(ray)/max(abs(ray),vec3(.00001));
  vec3 nearT=(low-eye)*inv,farT=(high-eye)*inv,tn=min(nearT,farT),tf=max(nearT,farT);
  float entry=max(0.,max(tn.x,max(tn.y,tn.z))),exitT=min(tf.x,min(tf.y,tf.z));if(exitT<=entry)discard;
  float stride=(exitT-entry)/46.,jitter=fract(dot(gl_FragCoord.xy,vec2(.75487766,.5698403)));
  vec3 p=eye+ray*(entry+stride*jitter),col=vec3(0.);float alpha=0.,first=-1.;
  float cooling=smoothstep(.40,2.12,clock),scale=1./(.55+.48*(1.-exp(-5.*clock))+.09*clock);
  float fade=1.-smoothstep(2.15,3.65,clock);
  for(int i=0;i<46;i++,p+=ray*stride){
   float base=body(p);if(base<-.84||p.y<floorY)continue;
   vec3 q=p*scale-vec3(.16*clock,clock*.99,-clock*.46);
   float billow=turbulence(q*2.2+vec3(n(q*1.1+1.4),n(q*1.2-3.7),n(q*1.3+7.1))*.97);
   float density=smoothstep(-.05,.51,base+1.72*(billow-.53))*fade;
   if(density<.007)continue;
   float curl=turbulence(q*3.8+vec3(5.3,-.39*clock,7.2));
   float core=clamp(1.-length(p-lobes[0].xyz)/max(.2,lobes[0].w*1.6),0.,1.);
   float heat=clamp(.64+.30*core+.29*exp(-14.*clock)-1.08*cooling-.034*p.y+2.68*(billow-.52)+1.42*(curl-.52)+.13*base,0.,1.);
   float hot=smoothstep(.40,.99,heat),ember=smoothstep(.24,.70,heat),light=clamp(.60+.69*(base-body(p+vec3(-.36,.49,-.33))),.19,1.13);
   vec3 soot=mix(vec3(.043,.037,.043),vec3(.33,.30,.29),light*.75)*(.70+.51*billow);
   vec3 fire=mix(vec3(.94,.040,.002),vec3(4.2,.92,.027),hot)+vec3(2.15,1.79,.68)*pow(heat,10.);
   vec3 lit=mix(soot,fire,ember)*(.76+.32*light);
   float da=1.-exp(-density*stride*(1.8+.70*ember));if(first<0.&&da>.026)first=entry+(float(i)+jitter)*stride;
   col+=(1.-alpha)*da*lit;alpha+=(1.-alpha)*da;if(alpha>.985)break;
  }
  if(alpha<.012)discard;vec4 ndc=clip*vec4(eye+ray*max(entry,first),1.);gl_FragDepth=clamp(.5+.5*ndc.z/ndc.w,.0,1.);
  gl_FragColor=vec4(col/max(.001,alpha),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const geo=new THREE.BoxGeometry(15,16,15).translate(0,4,0);
 const volume=new THREE.Mesh(geo,material);volume.renderOrder=14;parent.add(volume);
 const origin=V();
 volume.onBeforeRender=(_renderer,_scene,camera)=>{
  volume.getWorldPosition(origin);camera.getWorldPosition(eye).sub(origin);
  clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(volume.matrixWorld);
 };
 return (age,strength,originY)=>{
  const opening=1-Math.exp(-6.4*age),rise=age*(1.13+.16*age);
  uniforms.clock.value=age;uniforms.floorY.value=.007-originY;volume.visible=age>0&&age<3.64;
  low.set(99,99,99);high.set(-99,-99,-99);
  shapes.forEach(([x,y,z,r],i)=>{
   const bloom=opening*strength*1.18,expansion=bloom*(1+.082*age),lift=(.40+y)*bloom+rise*(.70+.23*y);
   const l=lobes[i];l.set(x*expansion+.21*age,lift,z*expansion-.40*age,r*(.06+expansion)+.080*age);
   const extent=l.w+.85;low.x=Math.min(low.x,l.x-extent);low.y=Math.min(low.y,l.y-extent);low.z=Math.min(low.z,l.z-extent);
   high.x=Math.max(high.x,l.x+extent);high.y=Math.max(high.y,l.y+extent);high.z=Math.max(high.z,l.z+extent);
  });
  low.y=Math.max(low.y,.007-originY);
 };
}
