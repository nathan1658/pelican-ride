import {THREE,PI,mix,texture} from './core.js';

// Four feather tracts share one albedo atlas and one independent relief atlas.
// Length runs along u. Every row has its own curved shaft and barb spacing.
const rows=4,W=768,H=224;
const patterns=[
 {barbs:114,axis:.425,sweep:.135,split:12,contrast:.31},
 {barbs:91,axis:.466,sweep:.153,split:8,contrast:.24},
 {barbs:62,axis:.495,sweep:.203,split:5,contrast:.17},
 {barbs:48,axis:.514,sweep:.255,split:4,contrast:.12}
];
function makeAtlas(relief){
 return texture(W,H*rows,(ctx)=>{
  for(let row=0;row<rows;row++){
   const p=patterns[row];let seed=1329+row*981;
   const rng=()=>{seed=Math.imul(seed,1664525)+1013904223|0;return (seed>>>0)/4294967296;};
   ctx.save();ctx.translate(0,(rows-row-1)*H);ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
   const axis=u=>H*(p.axis+.033*Math.sin(u*PI+row*.73)+.028*u);
   const base=ctx.createLinearGradient(0,0,0,H);
   if(relief){base.addColorStop(0,'#636363');base.addColorStop(.47,'#898989');base.addColorStop(.55,'#858585');base.addColorStop(1,'#636363');}
   else{
    base.addColorStop(0,row===3?'#dcd8cc':'#bcb9ac');base.addColorStop(.065,row===3?'#ebe8dc':'#e0decd');base.addColorStop(.36,'#f4f1e7');
    base.addColorStop(.52,'#e0dcd0');base.addColorStop(.89,'#e9e6d9');base.addColorStop(1,row===3?'#dfdbce':'#c4c1b6');
   }
   ctx.fillStyle=base;ctx.fillRect(0,0,W,H);
   for(let n=-20;n<=p.barbs+4;n++){
    const u=(n+.31*rng())/p.barbs;
    for(const side of [-1,1]){
     const rootX=u*W,rootY=axis(u),tipY=side<0?-2:H+2;
     const span=W*p.sweep*(.76+.36*Math.sin(PI*u))*(side<0?.83:1.07)*(1+.105*rng());
     const stroke=(dx,width,ink)=>{
      ctx.lineWidth=width;ctx.strokeStyle=ink;ctx.beginPath();ctx.moveTo(rootX+dx,rootY);
      ctx.bezierCurveTo(rootX+dx+span*.15,mix(rootY,tipY,.27),rootX+dx+span*.60,mix(rootY,tipY,.80),rootX+dx+span,tipY);ctx.stroke();
     };
     const opacity=p.contrast*(.57+.47*rng());
     stroke(0,1.2+rng()*.85,relief?'rgba(54,54,54,.60)':'rgba(72,71,65,'+opacity+')');
     stroke(1.6,.7+rng()*.35,relief?'rgba(221,221,221,.79)':'rgba(255,255,246,.63)');
    }
   }
   // A tapered rachis has a lit shoulder and shaded groove on opposite edges.
   function shaft(offset,width,ink){
    ctx.fillStyle=ink;ctx.beginPath();
    for(let j=0;j<=32;j++){let u=j/32,r=(1-u)*width+.15;let x=u*W,y=axis(u)+r+offset*(1-u);j?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    for(let j=32;j>=0;j--){let u=j/32;ctx.lineTo(u*W,axis(u)-(1-u)*width+offset*(1-u));}ctx.closePath();ctx.fill();
   }
   const shaftWidth=row<2?2.15:1.05;
   shaft(.85,shaftWidth*1.52,relief?'#676767':'rgba(98,90,74,.45)');shaft(0,shaftWidth,relief?'#dfdfdf':'#f4edd9');shaft(-.64,shaftWidth*.37,relief?'#f2f2f2':'#fffaf0');
   // Open small splits at the distal edge. The color and shadow passes use the same cutout.
   if(!relief){
    ctx.globalCompositeOperation='destination-out';ctx.fillStyle='black';
    for(let i=0;i<p.split;i++){const u=.44+.53*rng(),side=i%2?-1:1,edge=side<0?0:H,depth=H*(.036+.14*rng()),x=u*W;
     ctx.beginPath();ctx.moveTo(x,edge);ctx.lineTo(x+1.6+rng()*1.5,edge);ctx.quadraticCurveTo(x-4,edge-side*depth*.46,x-W*p.sweep*.19,edge-side*depth);ctx.closePath();ctx.fill();}
   }
   ctx.restore();
  }
 });
}
export function featherMaterial(){
 const albedo=makeAtlas(false),relief=makeAtlas(true);relief.colorSpace=THREE.NoColorSpace;
 return new THREE.MeshPhysicalMaterial({color:0xffffff,map:albedo,bumpMap:relief,bumpScale:.0015,roughness:.76,
  sheen:.43,sheenColor:0x94866d,sheenRoughness:.69,alphaTest:.46,vertexColors:true,side:THREE.DoubleSide});
}
export function setFeatherUVs(geometry,row,flip=false){
 const uv=geometry.attributes.uv;
 for(let i=0;i<uv.count;i++){
  const v=flip?1-uv.getY(i):uv.getY(i);
  uv.setY(i,(row+.012+v*.976)/rows);
 }
}
export function thighPlumage(parent,feather,tint){
 const profile=[[0,.102,.10],[.12,.108,.093],[.34,.088,.079],[.49,.052,.050],[.56,.037,.034]];
 function radius(y){const j=profile.findIndex(p=>p[0]>=y);
  if(j<0)return [.031,.030];const b=profile[j],a=profile[Math.max(0,j-1)],f=(y-a[0])/(b[0]-a[0]||1);return[mix(a[1],b[1],f),mix(a[2],b[2],f)];
 }
 for(let row=0;row<5;row++)for(let i=0;i<14;i++){
  const root=.082+.085*row+.009*Math.sin(i*2.23),angle=2*PI*(i+.43*row)/14;
  const len=.118+.014*Math.sin(i*1.73+row),width=.278+.045*Math.cos(i+row);
  const c=tint.clone().multiplyScalar(.87+.1*(.5+.5*Math.cos(angle))+.026*Math.sin(i*2));
  feather(parent,(u,v)=>{
   const y=root+len*u,theta=angle+(2*v-1)*width*Math.pow(Math.sin(PI*(.007+.987*u)),.62)+.07*u;
   const [rx,rz]=radius(y),lift=.002+.0034*u*u+.0021*Math.sin(PI*v);
   return [(rx+lift)*Math.cos(theta),y,(rz+lift)*Math.sin(theta)];
  },c,9,5,3,i%2===0);
 }
}
