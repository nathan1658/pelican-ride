import {THREE,V} from './core.js';

// Offsets are world-space so even an interrupted barrel roll throws both actors skyward.
export function ejectionRig(ride,birdGroup,bikeGroup){
 const birdPivot=V(-.18,1.97,0),bikePivot=V(-.03,.84,0),birdCenter=V(),bikeCenter=V(),origin=V();
 const parentQ=new THREE.Quaternion(),inverseQ=new THREE.Quaternion(),spin=new THREE.Quaternion(),base=new THREE.Quaternion(),identity=new THREE.Quaternion();
 const angles=new THREE.Euler(),temp=V(),displacement=V();
 function pose(group,pivot,center,trajectory,hit,isBike){
  center.copy(pivot).applyMatrix4(ride.matrixWorld);
  if(!hit?.age){group.position.set(0,0,0);group.quaternion.identity();return;}
  const righting=THREE.MathUtils.smoothstep(hit.age,0,isBike?1.71:1.46);
  spin.setFromEuler(angles.set(trajectory.roll,trajectory.yaw,trajectory.pitch,'YXZ'));
  base.copy(parentQ).slerp(identity,righting);
  group.quaternion.copy(inverseQ).multiply(spin).multiply(base);
  displacement.set(trajectory.x,trajectory.y,trajectory.z);
  if(isBike)displacement.y+=(.35-center.y)*hit.settle;
  center.add(displacement);
  group.position.copy(displacement.applyQuaternion(inverseQ)).add(pivot).sub(temp.copy(pivot).applyQuaternion(group.quaternion));
 }
 function update(hit){
  ride.updateWorldMatrix(true,false);ride.getWorldQuaternion(parentQ);inverseQ.copy(parentQ).invert();
  pose(birdGroup,birdPivot,birdCenter,hit?.bird,hit,false);pose(bikeGroup,bikePivot,bikeCenter,hit?.bike,hit,true);
  if(hit)origin.set(hit.contactX,hit.originY,hit.contactZ);
 }
 return {update,birdCenter,bikeCenter,origin};
}
