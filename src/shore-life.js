import {THREE,PI,TAU,V,mix,clamp,random,mat,group,mesh,ball,loft,surface} from './core.js';

export function duneHeight(x,z,period){
 const a=TAU*x/period,dist=Math.max(0,-z-1.96);
 const crest=.53+.11*Math.sin(5*a)+.07*Math.sin(13*a+.35);
 const peak=Math.exp(-Math.pow((dist-crest)/.59,2));
 return -.225+peak*(.20+.058*Math.sin(7*a-.4)+.025*Math.sin(17*a))-.045*dist;
}
export function sandBank(parent,map,period){
 map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
 const m=mat(0xc1ac92,.92,0,{map,bumpMap:map,bumpScale:.0037,transparent:true,depthWrite:false,vertexColors:true});
 const g=surface(144,18,(u,v)=>{const x=(u-.5)*period,reach=2.55+.44*Math.sin(u*TAU*3+.7)+.18*Math.sin(u*TAU*8);
  const z=-1.94-v*reach;return [x,duneHeight(x,z,period),z];});
 const coords=g.attributes.position,uv=g.attributes.uv,colors=[];
 for(let i=0;i<coords.count;i++){const v=uv.getY(i),x=coords.getX(i),z=coords.getZ(i);
  const edge=1-THREE.MathUtils.smoothstep(v,.38+.032*Math.sin(x*2.7),.98);
  colors.push(1,1,1,edge);uv.setXY(i,x/(period/17),z/2.7);
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
 const ground=mesh(parent,g,m,false);ground.renderOrder=-2;
}

// A small flock follows a closed, banked flight path parallel to the shore.
export function shorebirds(scene){
 const flock=[],bodyMat=mat(0xb8bab0,.89),wingMat=mat(0xffffff,.88,0,{vertexColors:true,side:THREE.DoubleSide}),beakMat=mat(0xb39563,.76);
 for(let i=0;i<3;i++){
  const gull=group(scene),wings=[];
  loft(gull,[[-.30,0,0,.004,.008],[-.19,.004,0,.039,.054],[-.035,.01,0,.066,.078],[.09,.029,0,.066,.058],[.16,.060,0,.047,.042],[.19,.054,0,.032,.032]],bodyMat,'x',18);
  loft(gull,[[.17,.052,0,.018,.024],[.202,.053,0,.014,.019],[.253,.044,0,.003,.003]],beakMat,'x',8);
  for(const s of [-1,1]){
   const geo=surface(19,6,(u,v)=>{const width=(.15+.07*Math.sin(PI*u))*Math.pow(1-u+.0001,.57),rake=.06+.09*Math.sin(2.6*u)-.27*u*u;
    return [rake-(1-v)*width,.02+.093*Math.sin(PI*u)-.035*u+.017*Math.sin(PI*v)*Math.sin(PI*u),s*(.035+.57*u)];},s<0);
   const positions=geo.attributes.position,uv=geo.attributes.uv,down=positions.clone(),up=positions.clone(),colors=[];
   for(let j=0;j<positions.count;j++){const u=uv.getX(j),c=new THREE.Color(0xa8b0ac).lerp(new THREE.Color(0x454d4a),THREE.MathUtils.smoothstep(u,.54,.94));
    colors.push(c.r,c.g,c.b);const y=positions.getY(j),z=positions.getZ(j);up.setY(j,y+.26*u*u+.099*u);up.setZ(j,z*(1-.17*u));down.setY(j,y-.223*u*u-.063*u);down.setZ(j,z*(1-.10*u));}
   geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.morphAttributes.position=[up,down];
   const wing=mesh(gull,geo,wingMat,false);wings.push(wing);
  }
  gull.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  gull.scale.setScalar([.91,.76,.69][i]);gull.rotation.order='YXZ';flock.push({gull,wings,i});
 }
 return t=>{const a=TAU*t/32;
  for(const {gull,wings,i} of flock){
   const q=a-.58+i*.185,x=-9+12.8*Math.sin(q)-i*.84,z=-34+5.4*Math.cos(q)-i*2.6;
   gull.position.set(x,4.5+i*.71+.64*Math.sin(q*2+.25*i),z);
   gull.rotation.y=-Math.atan2(-5.4*Math.sin(q),12.8*Math.cos(q));gull.rotation.x=-.24-.16*Math.sin(q);gull.rotation.z=.042*Math.cos(q*2);
   const stroke=Math.sin(a*34-i*1.33)*(.18+.82*Math.pow(.5+.5*Math.sin(a*3+.64*i),3));
   for(const wing of wings){wing.morphTargetInfluences[0]=Math.max(stroke,0);wing.morphTargetInfluences[1]=Math.max(-stroke,0);}
  }
 };
}

// Grains are paired on opposite sides of each stem and move with its upper section.
export function seaOats(positions,colors,indices,weights,period){
 const stem=new THREE.Color(0x887748),seed=new THREE.Color(0xbc985d),sunlit=new THREE.Color(0xe4ca8e);
 function ribbon(a,b,c,w,col,level){
  const k=positions.length/3;
  for(const [p,width,weight] of [[a,w*.25,level[0]],[b,w,level[1]],[c,w*.035,level[2]]]){
   for(const sign of [-1,1]){positions.push(p.x,p.y,p.z+sign*width);colors.push(col.r,col.g,col.b);weights.push(weight);}
  }
  indices.push(k,k+2,k+1,k+1,k+2,k+3,k+2,k+4,k+3,k+3,k+4,k+5);
 }
 for(let patch=0;patch<56;patch++){
  const cx=(random()-.5)*period,cz=-2.22-random()*.92;
  const stalkCount=4+Math.floor(random()*4);
  for(let j=0;j<stalkCount;j++){
   const x=cx+(random()-.5)*.34,z=cz+(random()-.5)*.21,y=duneHeight(x,z,period)-.015,h=.30+random()*.38,bend=.07+random()*.21,side=(random()-.5)*.11;
   const point=u=>V(x+bend*u*u,y+h*u-.11*h*u*u*u,z+side*u);
   for(let k=0;k<4;k++){let u=k/4;ribbon(point(u),point(u+.125),point(u+.25),.0032,stem,[u*u,(u+.125)**2,(u+.25)**2]);}
   for(let k=0;k<8;k++){let u=.65+k*.044,dir=k%2?1:-1,a=point(u),len=.022+.021*Math.sin(PI*k/9);const col=seed.clone().lerp(sunlit,random()*.63);
    const b=a.clone().add(V(dir*len*.48,.019,.010*dir)),c=a.clone().add(V(dir*len,.043,.020*dir));ribbon(a,b,c,.008,col,[u*u,u*u,u*u]);
    const awn=c.clone().add(V(dir*.021,.030,.003));ribbon(c,c.clone().lerp(awn,.5),awn,.0013,col,[u*u,u*u,u*u]);}
  }
 }
}
