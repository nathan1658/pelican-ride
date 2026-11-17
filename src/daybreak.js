import {THREE,PI,TAU,V,texture,mat} from './core.js';

// Measured centroid of the solar disc in the embedded 1024-by-512 lighting map.
export const panoramaHeading=.676;
const discU=.6000154,discV=.4888767,altitude=(.5-discV)*PI,azimuth=(discU-panoramaHeading)*TAU;
export const sunDirection=V(Math.sin(azimuth)*Math.cos(altitude),Math.sin(altitude),-Math.cos(azimuth)*Math.cos(altitude));

// Keep the warm aureole in the reflection map. The direct light below supplies
// the compact disc, allowing the bike's own geometry to occlude its highlight.
export function prepareSunriseMap(hdr){
 const {data,width,height}=hdr,read=hdr.type===THREE.HalfFloatType?THREE.DataUtils.fromHalfFloat:x=>x;
 const write=hdr.type===THREE.HalfFloatType?THREE.DataUtils.toHalfFloat:x=>x;
 const cx=discU*width-.5,cy=discV*height-.5,r=width/360*.84;
 const at=(x,y,k)=>read(data[(y*width+x)*4+k]);
 const x0=Math.floor(cx-r-1),x1=Math.ceil(cx+r+1);
 for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)for(let x=x0+1;x<x1;x++){
  const distance=Math.hypot(x-cx,y-cy);if(distance>r)continue;
  const weight=1-THREE.MathUtils.smoothstep(distance,.62*r,r),u=(x-x0)/(x1-x0);
  for(let k=0;k<3;k++){const neighbor=THREE.MathUtils.lerp(at(x0,y,k),at(x1,y,k),u);const index=(y*width+x)*4+k;data[index]=write(THREE.MathUtils.lerp(at(x,y,k),neighbor,weight));}
 }
 // Grade the photographed horizon in linear radiance before convolution.
 // Rough brass integrates a broad copper glow; chrome retains a thin bright edge.
 const skyBand=.060,waterBand=.032,halfWidth=.56;
 const bandTop=Math.max(0,Math.floor(height*(.5-.23/PI))),bandBottom=Math.min(height,Math.ceil(height*(.5+.12/PI)));
 for(let y=bandTop;y<bandBottom;y++){
  const elevation=(.5-(y+.5)/height)*PI,band=elevation>=0?skyBand:waterBand;
  const vertical=Math.exp(-.5*((elevation-.027)/band)**2);
  for(let x=Math.floor(cx-width*.22);x<Math.ceil(cx+width*.22);x++){
   const azimuthOffset=((x+.5)/width-discU)*TAU;
   const glow=vertical*Math.exp(-.5*(azimuthOffset/halfWidth)**2),i=(y*width+x)*4;
   const luminousHaze=.88*glow;
   data[i]=write(read(data[i])*(1+.20*glow)+luminousHaze);
   data[i+1]=write(read(data[i+1])*(1+.045*glow)+luminousHaze*.53);
   data[i+2]=write(read(data[i+2])*(1-.06*glow)+luminousHaze*.19);
  }
 }

}
export function lightCoast(scene){
 // equirectUv's zero direction differs by a quarter turn from the sky dome.
 scene.environmentRotation.y=(panoramaHeading-.25)*TAU;scene.environmentIntensity=.99;
 scene.add(new THREE.HemisphereLight(0xe6edfb,0xc7a17f,.47));
 const target=V(0,1.16,0),sun=new THREE.DirectionalLight(0xffcd91,2.52);
 sun.target.position.copy(target);sun.position.copy(target).addScaledVector(sunDirection,11);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-4.3,right:4.3,top:2.95,bottom:-2.8,near:.5,far:23});
 sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.0035;sun.shadow.bias=-.00009;sun.shadow.radius=2.2;
 scene.add(sun,sun.target);
 return (height,lane,x=0)=>{
  sun.target.position.set(target.x+x,target.y+height,target.z+lane);
  sun.position.copy(sun.target.position).addScaledVector(sunDirection,11);
 };
}
export function bicycleFinishes(){
 // Rolled aluminium, drawn wire, and spun brass reflect the same sky with
 // different highlight widths. Fine machining marks affect roughness alone.
 const brush=texture(256,128,(c,w,h)=>{
  const px=c.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const line=.46*Math.sin(2*PI*y*41/h+.24*Math.sin(TAU*x/w))+.31*Math.sin(TAU*y*27/h)+.16*Math.cos(TAU*y*53/h-TAU*x/w);
   const n=Math.round(205+22*line);const i=4*(y*w+x);px.data[i]=n;px.data[i+1]=n;px.data[i+2]=n;px.data[i+3]=255;
  }c.putImageData(px,0,0);
 },true);brush.colorSpace=THREE.NoColorSpace;brush.anisotropy=8;
 const enamel=new THREE.MeshPhysicalMaterial({color:0x236761,roughness:.33,metalness:.37,clearcoat:1,clearcoatRoughness:.112,ior:1.49});
 const silver=mat(0xcad1d0,.335,.94,{roughnessMap:brush});
 const bright=mat(0xe3e5df,.157,.96);
 const gold=mat(0xd7b47b,.345,.91,{roughnessMap:brush});
 const rim=new THREE.MeshPhysicalMaterial({color:0xd9dbd5,roughness:.33,roughnessMap:brush,metalness:.95,anisotropy:.28,anisotropyRotation:0});
 const wire=mat(0xbac5c8,.225,.95);
 return{enamel,silver,bright,gold,rim,wire};
}
