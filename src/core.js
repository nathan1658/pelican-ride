import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export {THREE};
export const PI = Math.PI, TAU = PI * 2;
export const WHEEL_RADIUS=.662, LOOP_DISTANCE=32*TAU*WHEEL_RADIUS;
export const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
export const clamp = THREE.MathUtils.clamp;
let seed=732479;
export function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
export const mix=(a,b,t)=>a+(b-a)*t;
export const mat=(color,roughness=.65,metalness=0,options={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...options});
export function group(parent){const g=new THREE.Group();parent.add(g);return g;}
export function mesh(parent,geom,material,shadow=true){const m=new THREE.Mesh(geom,material);parent.add(m);m.castShadow=shadow;m.receiveShadow=true;return m;}
export function ball(p,center,scale,m){const o=mesh(p,new THREE.SphereGeometry(1,32,22),m);o.position.set(...center);o.scale.set(...scale);return o;}
export function box(p,center,size,m){const o=mesh(p,new THREE.BoxGeometry(...size),m);o.position.set(...center);return o;}
export function rod(p,a,b,r,m,r2=r,n=14){const v=V(...a),w=V(...b),d=w.clone().sub(v);const o=mesh(p,new THREE.CylinderGeometry(r2,r,d.length(),n),m);o.position.copy(v).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;}
export function curve(p,points,r,m,n=32,sides=8){const c=new THREE.CatmullRomCurve3(points.map(a=>V(...a)));return mesh(p,new THREE.TubeGeometry(c,n,r,sides,false),m);}
export function ring(p,center,radius,r,m,a=TAU){const o=mesh(p,new THREE.TorusGeometry(radius,r,12,Math.max(32,Math.ceil(144*a/TAU)),a),m);o.position.set(...center);return o;}
export function surface(nu,nv,fn,reverse=false){
 const pos=[],uv=[],idx=[];
 for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){
  const u=i/nu,v=j/nv;pos.push(...fn(u,v));uv.push(u,v);
  if(i<nu&&j<nv){const a=i*(nv+1)+j,b=a+nv+1;if(reverse)idx.push(a,a+1,b,b,a+1,b+1);else idx.push(a,b,a+1,b,b+1,a+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
// Smooth station lofts give the body, throat and bill independent profiles.
export function loft(p,sections,m,axis='x',n=64){
 const centers=new THREE.CatmullRomCurve3(sections.map(s=>V(s[0],s[1],s[2])),false,'catmullrom',.4);
 const radii=new THREE.CatmullRomCurve3(sections.map(s=>V(s[3],s[4],0)),false,'catmullrom',.35);
 const g=surface(n,40,(u,v)=>{const c=centers.getPoint(u),r=radii.getPoint(u),a=v*TAU;
  if(axis==='x')return [c.x,c.y+Math.max(.0005,r.x)*Math.cos(a),c.z+Math.max(.0005,r.y)*Math.sin(a)];
  return [c.x+Math.max(.0005,r.x)*Math.cos(a),c.y,c.z+Math.max(.0005,r.y)*Math.sin(a)];},axis==='x');
 // Average normals across the angular seam.
 const normals=g.attributes.normal;
 for(let i=0;i<=n;i++){let j=i*41;let t=V().fromBufferAttribute(normals,j).add(V().fromBufferAttribute(normals,j+40)).normalize();normals.setXYZ(j,t.x,t.y,t.z);normals.setXYZ(j+40,t.x,t.y,t.z);}
 return mesh(p,g,m);
}
export function texture(w,h,draw,repeat=false){
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
 if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Bake rigid parts into one draw call per material. Moving parts keep their pivots.
export function batch(g){
 const sets=new Map();
 for(const child of [...g.children]){
  if(!child.isMesh || Array.isArray(child.material))continue;
  child.updateMatrix();const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(child.matrix);
  if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
  for(const key of Object.keys(geo.attributes))if(!['position','normal','uv','color'].includes(key))geo.deleteAttribute(key);
  if(!sets.has(child.material))sets.set(child.material,[]);sets.get(child.material).push(geo);g.remove(child);child.geometry.dispose();
 }
 for(const [m,gs] of sets){const joined=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());mesh(g,joined,m);}
}

export function pedalPitch(phase,side){
 return -.105*side*Math.sin(phase+.26)-.027*Math.sin(phase*2+.17);
}
