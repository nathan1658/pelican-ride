import {THREE,PI,TAU,V,clamp,mat,group,mesh,ball,box,rod,curve,loft,surface,texture,batch} from './core.js';

// Small hardware shares the bicycle's original metal and enamel finishes.
export function touringEquipment(root,rigid,finishes){
 const {enamel,silver,bright,dark,rubber,gold,leather}=finishes;
 const crimson=mat(0x7b231b,.22,.19);
 const lens=new THREE.MeshPhysicalMaterial({color:0xf3e1b7,metalness:.22,roughness:.12,clearcoat:1,clearcoatRoughness:.045,emissive:0xffbc69,emissiveIntensity:.12});
 // A spun-metal dynamo lamp with a stepped bezel, a fluted lens and fork bracket.
 const lampX=.958,lampY=1.452;
 curve(rigid,[[.754,1.306,0],[.793,1.374,0],[.888,1.381,0],[lampX,lampY-.069,0]],.011,silver);
 loft(rigid,[[.848,lampY,0,.014,.014],[.856,lampY,0,.038,.038],[.886,lampY,0,.073,.073],[.94,lampY,0,.089,.089],[.990,lampY,0,.087,.087],[1.01,lampY,0,.080,.080]],enamel);
 for(const [x,radius,material] of [[.986,.089,gold],[.998,.09,bright],[1.01,.087,silver]]){
  rod(rigid,[x,lampY,0],[x+.009,lampY,0],radius,material,radius,48);
 }
 ball(rigid,[1.017,lampY,0],[.021,.075,.075],lens);
 for(let i=-5;i<=5;i++){
  const z=i*.012,length=Math.sqrt(.071*.071-z*z),points=[];
  for(let j=0;j<=10;j++){const y=length*(j/5-1),x=1.017+.021*Math.sqrt(Math.max(0,1-(z*z+y*y)/(.075*.075)));points.push([x,lampY+y,z]);}
  curve(rigid,points,.00125,lens,10,5);
 }
 for(const side of [-1,1]){rod(rigid,[.94,lampY-.004,.066*side],[.94,lampY-.004,.09*side],.012,dark,.012,6);}
 // Thumb-operated brass bell, striker, clamp and cable ferrules.
 const bx=.782,by=1.655,bz=.187;
 rod(rigid,[bx,by-.041,bz],[bx,by+.017,bz],.012,silver);
 loft(rigid,[[bx,by,bz,.044,.044],[bx,by+.006,bz,.047,.047],[bx,by+.022,bz,.043,.043],[bx,by+.041,bz,.029,.029],[bx,by+.048,bz,.012,.012],[bx,by+.05,bz,.003,.003]],gold,'y',23);
 rod(rigid,[bx,by+.047,bz],[bx,by+.055,bz],.007,bright,.006,8);
 curve(rigid,[[bx-.003,by+.005,bz+.031],[bx-.039,by+.003,bz+.040],[bx-.056,by+.015,bz+.024]],.0045,silver);
 ball(rigid,[bx-.058,by+.018,bz+.023],[.014,.008,.012],rubber);
 const pads=mat(0x34352c,.87);
 // Side-pull brakes sit over the wheels, with shoes touching the metal brake tracks.
 for(const [cx,cy] of [[.824,1.247],[-.697,1.190]]){
  for(const side of [-1,1]){
   const shoeX=cx+(cx>0?-.038:.016),shoeY=cy-.068;
   curve(rigid,[[cx,cy+.032,0],[cx-.014,cy+.032,side*.068],[cx-.032,cy-.010,side*.081],[shoeX,shoeY,side*.051]],.0095,silver,20,8);
   box(rigid,[shoeX,shoeY,side*.038],[.059,.020,.017],pads);
   rod(rigid,[shoeX,shoeY,side*.046],[shoeX,shoeY,side*.071],.0105,bright,.0105,6);
  }
  rod(rigid,[cx-.028,cy+.027,0],[cx+.027,cy+.027,0],.0165,bright,.0165,8);
 }
 curve(rigid,[[.854,1.173,.044],[.858,1.227,.065],[.826,1.266,.065]],.0034,silver);
 curve(rigid,[[-.62,1.111,-.052],[-.65,1.159,-.078],[-.70,1.212,-.061]],.0034,silver);
 // A luggage platform gives the canvas bag a visible load path to the rear dropouts.
 for(const s of [-1,1]){
  curve(rigid,[[-.68,1.421,s*.105],[-.90,1.422,s*.152],[-1.25,1.421,s*.152],[-1.304,1.413,s*.103]],.0105,silver);
  rod(rigid,[-1.03,.68,.086*s],[-1.245,1.418,.143*s],.0088,silver);
  rod(rigid,[-1.03,.68,.089*s],[-.827,1.418,.137*s],.0085,silver);
  curve(rigid,[[-.76,1.421,.119*s],[-.635,1.412,.088*s],[-.44,1.366,.046*s]],.007,silver);
 }
 for(const x of [-1.293,-1.11,-.938,-.775])rod(rigid,[x,1.417,-.142],[x,1.417,.142],.0076,bright);
 rod(rigid,[-1.30,1.408,-.016],[-1.30,1.352,-.016],.010,silver);
 ball(rigid,[-1.315,1.348,0],[.014,.029,.041],dark);ball(rigid,[-1.327,1.35,0],[.007,.022,.032],crimson);
 const bag=group(root);bag.position.set(-.988,1.431,0);
 const weave=texture(192,192,(c,w,h)=>{
  c.fillStyle='#c3bdab';c.fillRect(0,0,w,h);
  for(let i=0;i<w;i++){c.fillStyle=i%3===0?'rgba(62,54,32,.20)':'rgba(251,237,200,.22)';c.fillRect(i,0,1,h);}
  for(let j=0;j<h;j++){c.fillStyle=j%3===0?'rgba(48,39,25,.24)':'rgba(236,222,194,.19)';c.fillRect(0,j,w,1);}
 },true);weave.repeat.set(3,3);
 const canvas=mat(0xad9566,.88,0,{map:weave,bumpMap:weave,bumpScale:.00085}),hide=mat(0x79472c,.58),edge=mat(0x4b3727,.7),thread=mat(0xd3ba85,.8);
 // A soft rectangular section with slightly pinched corners and a rounded flap.
 function bagPoint(u,a,out=0){
  const x=(u-.5)*.553,ax=Math.abs(u*2-1);
  const cap=Math.pow(Math.max(0,1-Math.pow(ax,9)),.23),ry=.131*cap,rz=.16*cap;
  const corner=v=>Math.sign(v)*Math.pow(Math.abs(v),.68);
  return [x,.116+(ry+out)*corner(Math.sin(a))-.009*(1-ax*ax),(rz+out)*corner(Math.cos(a))];
 }
 mesh(bag,surface(62,48,(u,v)=>bagPoint(u,v*TAU)),canvas);
 const flap=surface(42,27,(u,v)=>{const p=bagPoint(.024+.952*u,-.24+v*(PI+.65),.0035);p[1]+=.002*Math.cos(u*TAU);return p;});hide.side=THREE.DoubleSide;mesh(bag,flap,hide);
 for(const a of [-.244,PI+.407]){
  curve(bag,Array.from({length:29},(_,i)=>bagPoint(.03+.94*i/28,a,.0044)),.0034,edge,32,6);
  for(let i=0;i<29;i++){const u=.046+.031*i;rod(bag,bagPoint(u,a+.03,.005),bagPoint(u+.016,a+.03,.005),.0013,thread,.0013,4);}
 }
 for(const u of [.244,.753]){
  const strap=surface(5,49,(w,v)=>bagPoint(u+(w-.5)*.064,v*TAU,.007));mesh(bag,strap,edge);
  const x=(u-.5)*.553,z=.172,buckleY=.099;
  for(const dx of [-.022,.022])rod(bag,[x+dx,buckleY-.025,z],[x+dx,buckleY+.025,z],.0033,gold);
  for(const dy of [-.024,.024])rod(bag,[x-.022,buckleY+dy,z],[x+.022,buckleY+dy,z],.0033,gold);
  rod(bag,[x,buckleY-.019,z+.002],[x,buckleY+.011,z+.003],.0023,bright);
  for(const y of [.048,.065])ball(bag,[x,y,.165],[.003,.003,.002],dark);
 }
 curve(bag,[[-.089,.239,0],[-.071,.27,0],[.068,.269,0],[.089,.239,0]],.0077,hide,18,8);
 for(const x of [-.09,.09])ball(bag,[x,.24,0],[.012,.004,.013],gold);
 // A small enamel head badge catches the low sun between the headset cups.
 const badge=ball(rigid,[.689,1.3,.046],[.023,.039,.005],gold);badge.rotation.z=-.25;
 ball(rigid,[.689,1.300,.051],[.017,.028,.0025],enamel).rotation.z=-.25;
 curve(rigid,[[.682,1.286,.054],[.684,1.303,.055],[.694,1.315,.054],[.701,1.315,.053]],.0022,gold,11,5);
 batch(bag);
 return {animate(phase){bag.rotation.x=.009*Math.sin(phase-.8);bag.rotation.z=.005*Math.sin(phase*2-.4);}};
}
