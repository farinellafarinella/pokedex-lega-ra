export const localRomName='Pokemon - Versione Rossa (I).gb';
export const isLocalHost=hostname=>['localhost','127.0.0.1','[::1]'].includes(hostname);
export function validateRom(buffer){
 const bytes=new Uint8Array(buffer);
 if(bytes.length<32768||bytes.length>8*1024*1024)throw Error('Seleziona una ROM Game Boy valida in formato .gb o .gbc.');
 let checksum=0;
 for(let i=0x134;i<=0x14c;i++)checksum=(checksum-bytes[i]-1)&255;
 if(checksum!==bytes[0x14d])throw Error('Il file non contiene un’intestazione Game Boy valida.');
 return new TextDecoder('ascii').decode(bytes.slice(0x134,0x143)).replace(/\0.*$/,'').trim()||'Game Boy';
}
