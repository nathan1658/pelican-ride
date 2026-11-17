import {THREE,PI,TAU,V,mat,mesh,ball,box,rod,curve,ring,surface,batch} from './core.js';

export function courseProps(){
 const drift=mat(0x927554,.89),end=mat(0xc29f70,.85),rope=mat(0xc9aa78,.94),paint=mat(0xa54c32,.65),cream=mat(0xf0dbac,.75);
 const log=new THREE.Group(),hoop=new THREE.Group(),shell=new THREE.Group();
 // Driftwood hurdles lie across one lane. Pale bark and bands stay readable at a distance.
 rod(log,[-.05,.20,-.59],[.046,.165,.57],.147,drift,.138,14);
 for(const s of [-1,1]){
  rod(log,[s*.046,.184-s*.017,s*.565],[s*.052,.184-s*.017,s*.59],.131,end,.125,14);
  for(const z of [.37,.395,.42])rod(log,[s*.032,.182-s*.013,s*z],[s*.032,.182-s*.013,s*(z+.012)],.149,rope,.149,14);
 }
 for(const side of [-1,1]){
  rod(log,[-.007,.185,side*.22],[.017,.181,side*.31],.149,paint,.147,14);
 }
 const mark=surface(1,2,(u,v)=>[-.80+u*.095-.26*Math.abs(2*v-1),.005,(v-.5)*.9],true);mesh(log,mark,cream,false);
 curve(log,[[.004,.24,-.18],[.076,.32,-.13],[.14,.355,-.10]],.025,drift,12,7);batch(log);
 // A striped boom gives the duck action a measurable head clearance.
 for(const s of [-1,1]){
  box(hoop,[0,1.37,s*.637],[.061,2.74,.062],drift);
  box(hoop,[0,.115,s*.637],[.126,.23,.12],paint);
  for(let j=0;j<3;j++)box(hoop,[0,2.31+j*.12,s*.637],[.063,.06,.065],cream);
 }
 rod(hoop,[0,2.695,-.68],[0,2.695,.68],.047,paint,.047,16);
 for(let i=-3;i<=3;i++)rod(hoop,[0,2.695,i*.19-.04],[0,2.695,i*.19+.035],.048,cream,.048,16);
 batch(hoop);
 // A fluted scallop shell, convex on the front and concave at the hinge.
 const pearl=new THREE.MeshPhysicalMaterial({color:0xffd495,roughness:.32,metalness:.25,clearcoat:.42,iridescence:.18,side:THREE.DoubleSide});
 const amber=mat(0xce8755,.46,.21,{side:THREE.DoubleSide});
 function fan(u,v,back){const a=(v-.5)*2.67;const scallop=1+.032*Math.cos(v*TAU*11);const r=.226*u*scallop;
  return [(back?-.025:.017)+.043*Math.sin(PI*u)-.009*u*Math.cos(v*TAU*11),-.116+r*Math.cos(a),r*Math.sin(a)];}
 mesh(shell,surface(14,72,(u,v)=>fan(u,v,false)),pearl);mesh(shell,surface(9,72,(u,v)=>fan(u,v,true),true),amber);
 for(let k=0;k<=11;k++){const v=k/11;curve(shell,Array.from({length:7},(_,j)=>{const p=fan(.16+.8*j/6,v,false);p[0]+=.0015;return p;}),.0023,cream,10,5);}
 ball(shell,[0,-.113,0],[.027,.025,.047],amber);batch(shell);
 return {log,hoop,shell,...harborEquipment(),...arcadeTokens()};
}

function harborEquipment(){
 const wood=mat(0x976444,.78),grain=mat(0xc09669,.83),dark=mat(0x343e39,.64,.25),rope=mat(0xd8b47a,.91);
 const rust=mat(0xbb4c29,.62),white=mat(0xf0e1ba,.69),teal=mat(0x2c6962,.60,.22);
 const pot=new THREE.Group(),buoy=new THREE.Group(),net=new THREE.Group(),ramp=new THREE.Group();
 // A lobster pot with a curved wire cage, bait door, runners and corner floats.
 for(const z of [-.42,.42])box(pot,[0,.071,z],[1.02,.14,.085],wood);
 for(let j=0;j<6;j++){
  const x=-.42+j*.168;
  const arc=Array.from({length:11},(_,k)=>[x,.18+.76*Math.sin(PI*k/10),.49*Math.cos(PI*k/10)]);
  curve(pot,arc,.019,j===0||j===5?teal:dark,16,5);
 }
 for(let j=0;j<13;j++){
  const a=PI*j/12,y=.18+.76*Math.sin(a),z=.49*Math.cos(a);
  rod(pot,[-.43,y,z],[.43,y,z],.011,dark,.011,5);
 }
 for(const x of [-.41,.41]){
  for(let j=-3;j<=3;j++){const z=j*.12;rod(pot,[x,.17,z],[x,.18+.75*Math.sqrt(1-(z/.49)**2),z],.012,dark,.012,5);}
  rod(pot,[x,.19,-.49],[x,.19,.49],.027,teal);
  box(pot,[x,.47,0],[.049,.19,.37],rust);box(pot,[x,.47,0],[.051,.045,.37],white);
 }
 for(const z of [-.43,.43]){ball(pot,[.28,.59,z],[.075,.11,.07],rust);rod(pot,[-.44,.19,z],[.44,.19,z],.027,wood);}
 batch(pot);
 // A pair of mooring buoys in a low timber cradle.
 for(const x of [-.25,.25])box(buoy,[x,.07,0],[.14,.14,.96],wood);
 for(const s of [-1,1]){
  const h=s<0?1:.74,z=.23*s;
  ball(buoy,[0,.36*h+.10,z],[.263,.365*h,.232],rust);
  rod(buoy,[0,.55*h,z],[0,.84*h,z],.168,white,.092);
  rod(buoy,[0,.835*h,z],[0,1.02*h,z],.091,teal,.047);
  rod(buoy,[0,1*h,z],[0,1.12*h,z],.023,dark);
 }
 curve(buoy,[[-.24,.13,-.44],[-.34,.22,-.21],[-.35,.13,0],[-.26,.19,.23],[-.23,.12,.43]],.029,rope,20,6);batch(buoy);
 // Rolled fishing net on a tall gantry; its lower orange floats mark head clearance.
 for(const s of [-1,1]){
  box(net,[0,1.68,s*.65],[.075,3.36,.065],teal);
  box(net,[0,.12,s*.65],[.21,.24,.14],dark);
  box(net,[0,2.53,s*.65],[.079,.25,.072],white);
 }
 rod(net,[0,3.34,-.69],[0,3.34,.69],.045,grain);
 for(let j=-8;j<=8;j++){
  for(const dir of [-1,1]){
   const z=j*.17,z0=Math.max(-.63,Math.min(.63,z)),z1=Math.max(-.63,Math.min(.63,z+dir*.46));
   if(Math.abs(z1-z0)<.015)continue;
   const t0=Math.abs((z0-z)/.46),t1=Math.abs((z1-z)/.46);
   rod(net,[0,3.27-.65*t0,z0],[0,3.27-.65*t1,z1],.011,rope,.011,5);
  }
 }
 curve(net,[[0,2.73,-.65],[0,2.64,-.31],[0,2.615,0],[0,2.64,.31],[0,2.73,.65]],.021,rope,20,6);
 for(let j=-3;j<=3;j++)ball(net,[0,2.618+.091*(j/3)**2,j*.19],[.046,.049,.067],j%2?rust:white);
 batch(net);
 for(const s of [-1,1]){
  box(ramp,[.58,.25,s*.44],[.15,.5,.10],teal);
  const beam=box(ramp,[0,.24,s*.46],[1.59,.096,.11],wood);beam.rotation.z=.30;
 }
 for(let i=0;i<10;i++){
  const x=-.76+i*.161,o=box(ramp,[x,.055+.31*(x+.76),0],[.16,.075,1.04],i%3?grain:wood);o.rotation.z=.30;
 }
 for(const s of [-1,1])rod(ramp,[-.32,.246,s*.33],[-.06,.326,s*.06],.029,white);
 batch(ramp);return {pot,buoy,net,ramp};
}
function arcadeTokens(){
 const enamel=(color,light)=>new THREE.MeshStandardMaterial({color,emissive:light,emissiveIntensity:.41,metalness:.36,roughness:.31,side:THREE.DoubleSide});
 const mint=enamel(0x76f7dc,0x298e83),coral=enamel(0xff8b68,0xdb432d),gold=enamel(0xffdb71,0xcb7b20);
 const pearl=enamel(0xfff2ca,0xc1a46c),ink=mat(0x274b4d,.36,.24,{side:THREE.DoubleSide});
 function seal(material){
  const g=new THREE.Group();
  rod(g,[-.044,0,0],[.044,0,0],.302,ink,.302,40);
  const rim=ring(g,[0,0,0],.315,.030,material);rim.rotation.y=PI/2;
  const outer=ring(g,[0,0,0],.386,.009,material);outer.rotation.y=PI/2;
  for(let i=0;i<4;i++){const a=TAU*i/4;ball(g,[0,.383*Math.sin(a),.383*Math.cos(a)],[.023,.023,.023],pearl);}
  return g;
 }
 function line(g,points,m,width,face){curve(g,points.map(([z,y])=>[face*.058,y,z]),width,m,Math.max(12,points.length*4),7);}
 const shield=seal(mint),magnet=seal(coral),gust=seal(gold),gate=new THREE.Group();
 for(const face of [-1,1]){
  line(shield,[[-.162,.137],[0,.202],[.162,.137],[.12,-.068],[0,-.204],[-.12,-.068],[-.162,.137]],mint,.023,face);
  line(shield,[[-.078,.009],[-.019,-.046],[.088,.074]],pearl,.022,face);
  line(magnet,[[-.131,.141],[-.131,-.042],[-.087,-.132],[0,-.157],[.087,-.132],[.131,-.042],[.131,.141]],coral,.042,face);
  for(const s of [-1,1])line(magnet,[[s*.131,.068],[s*.131,.147]],pearl,.043,face);
  for(let k=0;k<2;k++)line(gust,[[-.169+k*.167,-.151],[-.046+k*.167,.002],[-.169+k*.167,.151]],gold,.032,face);
 }
 // The open centre is a forgiving aerial line. Sleeve bands make depth and scale legible.
 const rim=ring(gate,[0,0,0],1.47,.051,gold);rim.rotation.y=PI/2;
 for(let k=0;k<8;k++){
  const a=TAU*k/8,b=a+.12;
  rod(gate,[0,1.47*Math.sin(a),1.47*Math.cos(a)],[0,1.47*Math.sin(b),1.47*Math.cos(b)],.059,k%2?pearl:coral,.059,8);
 }
 for(const s of [-1,1]){
  mesh(gate,surface(8,1,(u,v)=>[u*.63,-1.04-.37*u+v*.14,s*(1.04+.12*u)]),coral,false);
 }
 for(const g of [shield,magnet,gust,gate])batch(g);
 return {shield,magnet,gust,gate};
}
