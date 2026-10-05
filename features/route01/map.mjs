import {loadTrainerAtlas} from './assets.mjs?v=2';
export class RouteMap{
 constructor(canvas,{map,sprites,onInteract,blocked=()=>false,onNear=()=>{},userId}){
  Object.assign(this,{canvas,map,sprites,onInteract,blocked,onNear,userId});this.position={...map.entry};this.direction='down';this.keys=new Set();this.time=0;this.frame=0;this.destroyed=false;this.listeners=[];
  this.background=new Image();this.background.src=new URL('../../Route/map.png',import.meta.url);this.atlas=null;loadTrainerAtlas(sprites).then(atlas=>{this.atlas=atlas;}).catch(()=>{});
  this.listen(window,'keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||this.blocked())return;const key=this.key(e.key);if(key){e.preventDefault();this.keys.add(key);}if(e.key==='e'||e.key==='E'||e.key==='Enter'){e.preventDefault();if(!e.repeat)this.interact();}});
  this.listen(window,'keyup',e=>{const key=this.key(e.key);if(key){e.preventDefault();this.keys.delete(key);}});
  this.listen(window,'blur',()=>this.stop());this.listen(document,'visibilitychange',()=>this.stop());this.listen(window,'orientationchange',()=>this.stop());
  this.observer=new ResizeObserver(()=>{this.stop();this.resize();});this.observer.observe(canvas);this.resize();this.loop=stamp=>{if(this.destroyed)return;this.tick(Math.min(.04,(stamp-this.time)/1000||0));this.time=stamp;this.draw();this.raf=requestAnimationFrame(this.loop);};this.raf=requestAnimationFrame(this.loop);
 }
 listen(target,type,fn){target.addEventListener(type,fn);this.listeners.push(()=>target.removeEventListener(type,fn));}
 key(key){return {ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[key];}
 resize(){const r=this.canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.dpr=dpr;}
 controls(root){for(const b of root.querySelectorAll('[data-direction]')){const dir=b.dataset.direction;this.listen(b,'pointerdown',e=>{e.preventDefault();if(this.blocked())return;b.setPointerCapture(e.pointerId);this.keys.add(dir);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])this.listen(b,ev,()=>this.keys.delete(dir));}}
 stop(){this.keys.clear();this.walking=false;this.frame=0;}
 setState(state){this.state=state;this.map=state.config.map;this.solid=new Set(this.map.blocked);this.sprite=state.sprite;}
 canWalk(x,y){if(x<8||y<24||x>this.map.width-8||y>this.map.height-8)return false;for(const [dx,dy] of [[-4,-3],[4,-3],[-4,3],[4,3]])if(this.solid?.has(Math.floor((y+dy)/16)*25+Math.floor((x+dx)/16)))return false;return !this.map.stations.some(p=>Math.hypot(p.x-x,p.y-y)<11);}
 tick(dt){
  if(this.blocked()||!this.state){this.stop();return;}const dir=[...this.keys].at(-1);this.walking=false;
  if(dir){this.direction=dir;const [dx,dy]={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir],speed=76*dt,x=this.position.x+dx*speed,y=this.position.y+dy*speed;if(this.canWalk(x,y)){this.position={x,y};this.walking=true;this.frame+=speed/7;}}
  if(!this.walking)this.frame=0;
  const nearest=this.map.stations.map((p,i)=>({i,d:Math.hypot(p.x-this.position.x,p.y-this.position.y)})).sort((a,b)=>a.d-b.d)[0];const near=nearest?.d<36?nearest.i+1:null;if(near!==this.near){this.near=near;this.onNear(near);}
 }
 interact(){if(this.near&&!this.blocked()){this.stop();this.onInteract(this.near);}}
 trainer(ctx,sprite,x,y,direction='down',frame=0){const def=this.sprites.sprites[sprite]||this.sprites.sprites[this.sprites.default],rect=def[direction][frame%def[direction].length];if(this.atlas)ctx.drawImage(this.atlas,rect.x,rect.y,rect.w,rect.h,Math.round(x-16),Math.round(y-27),rect.w,rect.h);}
 draw(){
  const ctx=this.canvas.getContext('2d');ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#152f20';ctx.fillRect(0,0,this.width,this.height);if(!this.state)return;
  const scale=Math.max(2,Math.ceil(this.width/this.map.width),Math.ceil(this.height/this.map.height)),viewW=this.width/scale,viewH=this.height/scale,cx=Math.max(0,Math.min(this.map.width-viewW,this.position.x-viewW/2)),cy=Math.max(0,Math.min(this.map.height-viewH,this.position.y-viewH/2));this.camera={x:cx,y:cy,scale};ctx.scale(scale,scale);ctx.translate(-Math.round(cx*scale)/scale,-Math.round(cy*scale)/scale);
  if(this.background.complete&&this.background.naturalWidth)ctx.drawImage(this.background,0,0,this.map.width,this.map.height);
  for(const [i,p] of this.map.stations.entries()){const s=this.state.stations[i];this.trainer(ctx,s.sprite||s.rules.bot_sprite,p.x,p.y,'down',1);ctx.fillStyle=s.owner_id?'#a10d29':'#172331';ctx.fillRect(p.x-5,p.y-37,10,9);ctx.fillStyle='#fff';ctx.font='8px monospace';ctx.fillText(String(i+1),p.x-3,p.y-30);}
  this.trainer(ctx,this.sprite,this.position.x,this.position.y,this.direction,this.walking?[1,0,1,2][Math.floor(this.frame)%4]:1);
 }
 destroy(){this.destroyed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.listeners.forEach(off=>off());this.stop();}
}
