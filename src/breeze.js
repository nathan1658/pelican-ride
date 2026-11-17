import {THREE,TAU} from './core.js';

// A traveling pressure wave moves from the shoulder to the exposed vanes.
// Vertex u follows each feather from anchored root to flexible tip.
export function windFeathers(object,clock,side,strength){
 for(const part of object.children){
  if(!part.isMesh||!part.material.alphaTest)continue;
  function windShader(material,shaded){
   material.onBeforeCompile=shader=>{
    shader.uniforms.windCycle=clock;
    shader.vertexShader='uniform float windCycle;\n'+shader.vertexShader;
    const parameters=`
     float freeTip=smoothstep(.13,1.,uv.x);
     float a=windCycle*7.+position.x*7.4-position.y*3.1;
     float b=windCycle*13.+position.x*14.1+position.z*5.8;
     float gust=(.56+.30*sin(2.*windCycle+position.x)*cos(windCycle-1.))*(sin(a)+.30*sin(b));
    `;
    shader.vertexShader=shader.vertexShader.replace('#include <morphtarget_vertex>',`#include <morphtarget_vertex>
     ${parameters}
     transformed+=freeTip*gust*${strength.toFixed(6)}*vec3(-.16,.79,${(side*.68).toFixed(4)});`);
    if(shaded)shader.vertexShader=shader.vertexShader.replace('#include <morphnormal_vertex>',`#include <morphnormal_vertex>
     objectNormal.x-=smoothstep(.13,1.,uv.x)*${(strength*3.9).toFixed(6)}*cos(windCycle*7.+position.x*7.4-position.y*3.1);`);
   };
   material.customProgramCacheKey=()=>['sea-breeze',side,strength,shaded].join('/');return material;
  }
  part.material=windShader(part.material.clone(),true);
  part.customDepthMaterial=windShader(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:part.material.map,alphaTest:part.material.alphaTest,side:THREE.DoubleSide}),false);
 }
}

export function breathing(t,phase,compression){
 const cycle=TAU*t/32;
 // Eight slow breaths per film loop. A small recovery accent follows pedal unloading.
 const respiratory=.5+.5*Math.sin(cycle*8+.16*Math.sin(phase*2-.4));
 return (respiratory-.5)*(.74+.26*(1-compression));
}
