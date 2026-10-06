import {RouteMap} from '../route01/map.mjs';

import terrain from './terrain.mjs';

export function safariTerrain(area='meadow'){return {...terrain,area};}
export class SafariMap extends RouteMap{
 constructor(canvas,{area,sprites,sprite,position,onGrass,blocked}){
  const map=safariTerrain(area);
  super(canvas,{map,sprites,onInteract:()=>{},blocked});
  this.background.src=new URL('../../SafariZone_South.png',import.meta.url);
  this.grass=new Set(map.grass);this.onGrass=onGrass;this.grassDistance=0;
  this.setState({config:{map},stations:[],sprite:sprite||sprites.default});
  if(position&&Number.isFinite(position.x)&&Number.isFinite(position.y)&&this.canWalk(position.x,position.y))this.position={...position};
 }
 inGrass(position=this.position){return this.grass.has(Math.floor(position.y/16)*this.map.columns+Math.floor(position.x/16));}
 canWalk(x,y){
  if(x<8||y<24||x>this.map.width-8||y>this.map.height-8)return false;
  for(const [dx,dy] of [[-4,-3],[4,-3],[-4,3],[4,3]])if(this.solid?.has(Math.floor((y+dy)/16)*this.map.columns+Math.floor((x+dx)/16)))return false;
  return true;
 }
 tick(dt){
  if(!this.canvas.isConnected){this.destroy();return;}
  const previous={...this.position};super.tick(dt);
  if(this.walking&&this.inGrass()){
   this.grassDistance+=Math.hypot(this.position.x-previous.x,this.position.y-previous.y);
   if(this.grassDistance>=32){this.grassDistance=0;this.stop();this.onGrass();}
  }else if(!this.inGrass())this.grassDistance=0;
 }
 draw(){
  const ctx=this.canvas.getContext('2d');ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#173c2d';ctx.fillRect(0,0,this.width,this.height);if(!this.state)return;
  const scale=Math.max(2,Math.ceil(this.width/this.map.width),Math.ceil(this.height/this.map.height)),vw=this.width/scale,vh=this.height/scale;
  const cx=Math.max(0,Math.min(this.map.width-vw,this.position.x-vw/2)),cy=Math.max(0,Math.min(this.map.height-vh,this.position.y-vh/2));this.camera={x:cx,y:cy,scale};ctx.scale(scale,scale);ctx.translate(-Math.round(cx),-Math.round(cy));
  if(this.background.complete&&this.background.naturalWidth)ctx.drawImage(this.background,0,0,this.map.width,this.map.height);
  this.trainer(ctx,this.sprite,this.position.x,this.position.y,this.direction,this.walking?[1,0,1,2][Math.floor(this.frame)%4]:1);
  if(this.inGrass()){ctx.fillStyle='#18a46a';for(const dx of [-7,1,6])ctx.fillRect(Math.round(this.position.x+dx),Math.round(this.position.y-3),2,5);}
 }

}
let manifest;
export async function mountSafariMap(canvas,options){
 if(!manifest){const response=await fetch(new URL('../route01/sprites.json',import.meta.url));if(!response.ok)throw Error('Sprite Safari non disponibili.');manifest=await response.json();}
 if(!canvas.isConnected)return null;
 return new SafariMap(canvas,{...options,sprites:manifest});
}
