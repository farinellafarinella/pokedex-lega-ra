// Emerald international save format: pret/pokeemerald include/save.h, global.h, src/save.c.
export const emeraldSaveLayout={size:0x20000,sectorSize:0x1000,dataSize:0xf80,signature:0x08012025,flags:0x1270,badgeFlag:0x867,
 sizes:[0xf2c,0xf80,0xf80,0xf80,0xf08,0xf80,0xf80,0xf80,0xf80,0xf80,0xf80,0xf80,0xf80,0x7d0]};
export function emeraldChecksum(bytes,size){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let sum=0;for(let i=0;i<size;i+=4)sum=(sum+v.getUint32(i,true))>>>0;return ((sum>>>16)+(sum&65535))&65535;}
function sector(value,id){const v=new DataView(value.buffer,value.byteOffset,value.byteLength),l=emeraldSaveLayout;
 if(value.length!==l.sectorSize||v.getUint16(0xff4,true)!==id||v.getUint32(0xff8,true)!==l.signature)throw Error('SAVE_INVALID');
 if(v.getUint16(0xff6,true)!==emeraldChecksum(value,l.sizes[id]))throw Error('SAVE_CHECKSUM');
 return v.getUint32(0xffc,true);
}
export function validateEmeraldProof(value){
 const bytes=value instanceof Uint8Array?value:new Uint8Array(value),l=emeraldSaveLayout;
 if(bytes.length!==3*l.sectorSize)throw Error('SAVE_SIZE');
 const sections=[0,1,2].map(i=>bytes.subarray(i*l.sectorSize,(i+1)*l.sectorSize));
 const counts=sections.map((s,i)=>sector(s,i));if(counts.some(c=>c!==counts[0]))throw Error('SAVE_INVALID');
 if(sections[0][0]===255||sections[0][0]===0||!sections[0].slice(0,8).includes(255)||sections[0][8]>1)throw Error('SAVE_INVALID');
 const party=new DataView(sections[1].buffer,sections[1].byteOffset,sections[1].byteLength),count=party.getUint32(0x234,true);
 if(count<1||count>6)throw Error('SAVE_INVALID');
 for(let i=0;i<count;i++){const level=sections[1][0x238+i*100+84];if(level<1||level>100)throw Error('SAVE_INVALID');}
 let badges=0;for(let i=0;i<8;i++){const flag=l.badgeFlag+i,offset=l.flags+(flag>>3)-l.dataSize;if(sections[2][offset]&(1<<(flag&7)))badges|=1<<i;}
 return {bytes,badges};
}
export function emeraldProofFromSave(value){
 const bytes=value instanceof Uint8Array?value:new Uint8Array(value),l=emeraldSaveLayout;
 if(bytes.length!==l.size&&bytes.length!==l.size+16)throw Error('SAVE_SIZE');
 const slots=[];
 for(let slot=0;slot<2;slot++){
  try{const sections=new Map();let counter;
   for(let i=0;i<14;i++){
    const s=bytes.subarray((slot*14+i)*l.sectorSize,(slot*14+i+1)*l.sectorSize),v=new DataView(s.buffer,s.byteOffset,s.byteLength),id=v.getUint16(0xff4,true);
    if(id>13||sections.has(id))throw Error('SAVE_INVALID');const c=sector(s,id);if(counter!==undefined&&counter!==c)throw Error('SAVE_INVALID');counter=c;sections.set(id,s);
   }
   const proof=new Uint8Array(3*l.sectorSize);for(let id=0;id<3;id++)proof.set(sections.get(id),id*l.sectorSize);
   slots.push({counter,proof:validateEmeraldProof(proof)});
  }catch{}
 }
 if(!slots.length)throw Error('SAVE_CHECKSUM');
 if(slots.length===2&&((slots[1].counter-slots[0].counter)>>>0)<0x80000000)return slots[1].proof;
 return slots[0].proof;
}
export function decodeEmeraldProof(text){
 if(typeof text!=='string'||text.length!==16384||!/^[A-Za-z0-9+/]+$/.test(text))throw Error('SAVE_SIZE');
 return validateEmeraldProof(Uint8Array.from(atob(text),c=>c.charCodeAt(0)));
}
