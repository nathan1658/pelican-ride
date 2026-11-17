import {THREE,PI,TAU,clamp,mix,surface,texture} from './core.js';
import {panoramaHeading} from './daybreak.js';

// The image's high-water line, sampled at regular bearings. Project a subdivided
// water surface onto those same rays so the run-up meets the photographed sand.
const shore=[.500,.5013,.51172,.51335,.51855,.52799,.53125,.53288,.53711,.54329,.54720,.55208,.55697,.55957,.56413,.5651,.56608,.56641,.56608,.56055,.55501,.54427,.53743,.53158,.52572,.52148,.5166,.50846,.50];
function waterline(u){
 const k=clamp((u-.4125)/.019,0,shore.length-1.00001),i=Math.floor(k);
 return mix(shore[i],shore[i+1],k-i);
}
function foamField(){
 const n=256,tiles=12;
 function hash(x,y,s){let h=Math.imul(x+201,1664525)^Math.imul(y+167,1013904223)^s;h=Math.imul(h^(h>>>16),2246822507);return((h^(h>>>13))>>>0)/4294967296;}
 const mod=(a,n)=>(a%n+n)%n;
 return texture(n,n,(ctx)=>{
  const img=ctx.createImageData(n,n);
  function value(x,y,tiles,seed){
   const ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);
   const h=(i,j)=>hash(mod(i,tiles),mod(j,tiles),seed);
   return mix(mix(h(ix,iy),h(ix+1,iy),a),mix(h(ix,iy+1),h(ix+1,iy+1),a),b);
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const u=x/n,v=y/n,noise=.50*value(u*4,v*4,4,17)+.29*value(u*9,v*9,9,31)+.15*value(u*21,v*21,21,151)+.06*value(u*55,v*55,55,73);
   const a=u*tiles+.32*Math.sin(TAU*v*3),b=v*tiles+.27*Math.sin(TAU*u*2);let near=5,next=5;
   for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
    const gx=Math.floor(a)+i,gy=Math.floor(b)+j;
    const dx=gx+.15+.70*hash(mod(gx,tiles),mod(gy,tiles),37)-a,dy=gy+.15+.70*hash(mod(gx,tiles),mod(gy,tiles),167)-b,dist=Math.hypot(dx,dy);
    if(dist<near){next=near;near=dist;}else if(dist<next)next=dist;
   }
   const k=(y*n+x)*4;img.data[k]=255*noise;img.data[k+1]=255*Math.exp(-9*(next-near));img.data[k+2]=255*value(u*48,v*48,48,213);img.data[k+3]=255;
  }ctx.putImageData(img,0,0);
 },true);
}
export function shoreBreak(scene,pano){
 const g=surface(156,67,(u,v)=>[u,v,0]);
 const rest=[],pos=g.attributes.position;
 for(let i=0;i<pos.count;i++){
  const u=mix(.421,.943,pos.getX(i)),r=mix(.007,1.16,pos.getY(i)),depth=(waterline(u)-.5)*r;
  rest.push(u,.5-depth,r,clamp((waterline(u)-.5)/.020,0,1));
 }
 g.setAttribute('shorepoint',new THREE.Float32BufferAttribute(rest,4));
 const field=foamField();field.colorSpace=THREE.NoColorSpace;
 const phase={value:0};
 const material=new THREE.ShaderMaterial({uniforms:{cycle:phase,seascape:{value:pano},foamField:{value:field}},
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
  vertexShader:`
   attribute vec4 shorepoint;uniform float cycle;
   varying vec2 sourceUV;varying vec2 seaMetres;varying float crossShore;varying float crest;varying float slope;varying float edge;
   void main(){
    sourceUV=shorepoint.xy;float r=shorepoint.z;crossShore=r;edge=shorepoint.w;
    float bearing=(sourceUV.x-${panoramaHeading})*6.2831853,el=(sourceUV.y-.5)*3.14159265;
    vec3 ray=vec3(sin(bearing)*cos(el),sin(el),-cos(bearing)*cos(el));
    vec3 p=ray*(1.72/max(.0007,-ray.y));seaMetres=p.xz;
    float phase=6.2831853*(r*2.65+.59*r*r-5.*cycle+.148*sin(71.*sourceUV.x+6.2831853*cycle)+.070*sin(163.*sourceUV.x-12.56637*cycle)+.030*sin(291.*sourceUV.x+6.2831853*cycle));
    crest=sin(phase);slope=cos(phase);
    float swell=.105*(1.-.32*r)*smoothstep(.08,.47,r)*(1.-smoothstep(.75,1.055,r))*edge;
    p.y+=swell*(crest+.235*sin(2.*phase-.40)+.095*sin(3.*phase-.75));
    p.xz-=normalize(p.xz)*swell*.77*cos(phase);
    vec4 clip=projectionMatrix*mat4(mat3(viewMatrix))*vec4(normalize(p)*155.,1.);gl_Position=vec4(clip.xy,.99998*clip.w,clip.w);
   }`,
  fragmentShader:`
   uniform sampler2D seascape,foamField;uniform float cycle;
   varying vec2 sourceUV;varying vec2 seaMetres;varying float crossShore,crest,slope,edge;
   void main(){
    float r=crossShore,p=6.2831853*cycle;
    vec2 q=seaMetres*vec2(.155,.205)+vec2(sin(p)*.06,-2.*cycle);
    vec2 curl=texture2D(foamField,seaMetres*.048+vec2(.08*cos(p),-.07*sin(p))).rg-.5;
    vec3 field=texture2D(foamField,q+curl*.17).rgb;
    vec3 small=texture2D(foamField,seaMetres*vec2(.49,.68)+vec2(.14*sin(p),-5.*cycle+.11*cos(p))+curl*.24).rgb;
    vec2 uv=sourceUV;float wet=smoothstep(.015,.26,r)*(1.-smoothstep(.91,1.035,r));
    uv+=wet*vec2(.0006*sin(p*5.+r*12.+field.r*3.),.0013*crest+.0007*(field.r-.5));
    vec3 base=texture2D(seascape,uv).rgb;
    float swellZone=smoothstep(.08,.43,r)*(1.-smoothstep(.94,1.03,r));
    base*=1.+swellZone*(.102*slope-.045*crest);
    base+=swellZone*.027*max(0.,crest)*vec3(.37,.88,.84);
    float breakZone=smoothstep(.30,.66,r)*(1.-smoothstep(.90,1.04,r));
    float breaking=smoothstep(.47,.92,crest+(field.r-.5)*.92)*breakZone;
    float capPatch=smoothstep(.26,.69,.72*field.r+.28*small.r);
    float crestFoam=breaking*capPatch*(.17+.35*small.b+.40*field.g);
    float trailing=smoothstep(.05,.78,-slope)*breakZone*(.14*field.g+.13*small.g)*smoothstep(.17,.67,field.r);
    float advance=.995+.050*sin(p*5.-1.2+sin(sourceUV.x*37.)*.74)+.010*(field.r-.5)+.005*sin(sourceUV.x*185.);
    float foamEdge=1.-smoothstep(.003,.024,abs(advance-r));
    float wash=smoothstep(.85,.965,r)*(1.-smoothstep(advance-.04,advance+.009,r));
    float foam=clamp(crestFoam+trailing+wash*(.07+.30*field.g+.16*small.g)+.54*foamEdge*(.17+.58*small.r+.25*field.g),0.,.86);
    vec3 pearl=mix(vec3(.51,.62,.65),vec3(.90,.86,.78),.40+.38*small.r);
    base=mix(base,base*vec3(.77,.84,.87)+vec3(.012,.025,.029),.66*smoothstep(.978,1.06,r));
    vec3 paint=mix(base,pearl,foam);
    float alpha=edge*smoothstep(.008,.12,r)*(1.-smoothstep(advance+.015,advance+.072,r));
    gl_FragColor=vec4(paint,alpha);
    #include <colorspace_fragment>
   }`
 });
 material.forceSinglePass=true;const surf=new THREE.Mesh(g,material);surf.frustumCulled=false;
 // Three renders transparent objects after the opaque world. Far-plane depth
 // keeps the water behind the moving rider, deck, and vegetation.
 surf.renderOrder=-98;surf.layers.enable(2);scene.add(surf);
 return t=>phase.value=(t%32)/32;
}
