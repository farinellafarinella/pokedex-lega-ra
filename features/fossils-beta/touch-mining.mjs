// Keep aiming separate from striking on small screens and touch devices.
const frame=document.querySelector('#mining-frame');
const panel=document.createElement('div');
panel.className='touch-mining';panel.hidden=true;
panel.innerHTML=`<p>Tocca una casella per mirare, correggi con le frecce e premi <b>Scava</b>.</p><div class="aim-pad"><button data-step="up" aria-label="Mira in alto">▲</button><button data-step="left" aria-label="Mira a sinistra">◀</button><button class="primary" data-strike>⛏ Scava</button><button data-step="right" aria-label="Mira a destra">▶</button><button data-step="down" aria-label="Mira in basso">▼</button></div><output aria-live="polite"></output>`;
frame.after(panel);
let selected=null,forwarding=false;
const precise=()=>matchMedia('(max-width: 760px), (pointer: coarse)').matches;
function cells(){return [...(frame.contentDocument?.querySelectorAll('#mining-cell')||[])];}
function select(cell){
 selected?.removeAttribute('data-aim');selected=cell;
 selected?.setAttribute('data-aim','');
 const i=cells().indexOf(selected);
 panel.querySelector('output').textContent=i<0?'':`Colonna ${Math.floor(i/10)+1} · Riga ${i%10+1}`;
}
function sync(){panel.hidden=frame.hidden||!precise();if(!panel.hidden&&(!selected?.isConnected))select(cells()[65]);}
frame.addEventListener('load',()=>{
 const doc=frame.contentDocument;
 const style=doc.createElement('style');
 style.textContent='[data-aim]{position:relative;z-index:16}[data-aim]::after{content:"";position:absolute;inset:0;border:6px solid #ffe477;box-shadow:inset 0 0 0 2px #17191f;z-index:30;pointer-events:none}';doc.head.append(style);
 doc.addEventListener('pointerdown',event=>{
 const cell=event.target.closest('#mining-cell');
 if(!cell||forwarding||(!precise()&&event.pointerType!=='touch'))return;
 event.preventDefault();event.stopImmediatePropagation();select(cell);
 },true);
 sync();
});
panel.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||frame.hidden)return;
 const list=cells();if(!selected?.isConnected)select(list[65]);if(!selected)return;
 if(button.hasAttribute('data-strike')){
 forwarding=true;
 try{selected.dispatchEvent(new frame.contentWindow.PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch'}));}finally{forwarding=false;}
 }else{
 const i=list.indexOf(selected),x=Math.floor(i/10),y=i%10;
 const [dx,dy]=({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]})[button.dataset.step];
 select(list[Math.max(0,Math.min(12,x+dx))*10+Math.max(0,Math.min(9,y+dy))]);
 }
});
new MutationObserver(sync).observe(frame,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('resize',sync);
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.channel==='fossil-demo'&&event.data.type==='started'){select(cells()[65]);sync();}});
