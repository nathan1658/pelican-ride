import {V} from './core.js';

// Phase zero is the forward crank's mid-downstroke. Smooth unilateral loads
// alternate without a discontinuity as either foot crosses a dead center.
function force(phase){const leverage=Math.max(0,Math.cos(phase));return leverage*leverage*(.9+.1*Math.sin(phase));}
function sideLoad(phase){return force(phase)-force(phase+Math.PI);}
export function pedalBalance(phase){
 const right=force(phase),left=force(phase+Math.PI),transfer=sideLoad(phase-.19);
 const compression=force(phase-.29)+force(phase+Math.PI-.29);
 return {
  right,left,transfer,compression,
  hipX:.024*(compression-.44)+.008*Math.sin(phase*2-.46),
  hipY:.0095-.021*compression,
  hipZ:.040*transfer,
  pelvisRoll:.049*transfer,
  pelvisPitch:-.029*(compression-.46)+.009*Math.sin(2*phase-.31),
  pelvisYaw:.018*sideLoad(phase+.09),
  frameRoll:-.013*sideLoad(phase-.30),
  shoulderLoad:sideLoad(phase-.36)
 };
}
const saddleContact=V(-.365,1.555,0);
export function seatRider(bird,load,duck=0,motion=null){
 const lean=motion?.riderLean||0,settle=motion?.landing||0;
 bird.rotation.set(load.pelvisRoll+lean,load.pelvisYaw-.14*lean,load.pelvisPitch-.20*duck-.042*settle,'XYZ');
 bird.position.copy(saddleContact).applyQuaternion(bird.quaternion).multiplyScalar(-1).add(saddleContact);
 bird.position.x+=load.hipX;bird.position.y+=load.hipY-.035*duck+(motion?.seat||0);bird.position.z+=load.hipZ+.23*lean;
 bird.updateMatrix();
}
