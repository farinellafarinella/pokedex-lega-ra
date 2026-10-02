// The supplied atlas uses an opaque grey background. Remove only connected
// background pixels around each explicitly configured frame while rendering.
// Original files and enclosed sprite colours remain unchanged.
const cache=new Map();
export function loadTrainerAtlas(manifest){
 const url=new URL(manifest.image,import.meta.url).href;if(cache.has(url))return cache.get(url);
 const promise=new Promise((resolve,reject)=>{const image=new Image();image.onerror=()=>reject(Error('Spritesheet allenatori non disponibile.'));image.onload=()=>{
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  for(const sprite of Object.values(manifest.sprites))for(const frames of Object.values(sprite))if(Array.isArray(frames))for(const frame of frames){
   const {x,y,w,h}=frame,pixels=ctx.getImageData(x,y,w,h),data=pixels.data,bg=[data[0],data[1],data[2],data[3]],seen=new Set(),queue=[];
   if(bg[3]===0)continue;
   for(let i=0;i<w;i++){queue.push(i,(h-1)*w+i);}for(let j=0;j<h;j++)queue.push(j*w,j*w+w-1);
   for(let n=0;n<queue.length;n++){const i=queue[n];if(seen.has(i))continue;seen.add(i);const offset=i*4;if(data[offset]!==bg[0]||data[offset+1]!==bg[1]||data[offset+2]!==bg[2]||data[offset+3]!==bg[3])continue;data[offset+3]=0;const col=i%w,row=Math.floor(i/w);if(col>0)queue.push(i-1);if(col<w-1)queue.push(i+1);if(row>0)queue.push(i-w);if(row<h-1)queue.push(i+w);}
   ctx.putImageData(pixels,x,y);
  }resolve(canvas);
 };image.src=url;});cache.set(url,promise);promise.catch(()=>cache.delete(url));return promise;
}
