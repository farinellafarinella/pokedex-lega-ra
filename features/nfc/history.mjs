import {dateTime} from './transactions.mjs';
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function historyView(entries,{profileId,demo=false}={}){return '<section class="panel"><h2>Storico '+(demo?'demo':'NFC')+'</h2>'+(entries.length?'<ul class="history">'+entries.map(t=>'<li><strong>'+(!demo&&t.sender_id===profileId?'−':'+')+escapeHTML(t.amount)+' PD</strong><span>'+escapeHTML(dateTime(t.completedAt||t.created_at))+'</span></li>').join('')+'</ul>':'<p>Nessun movimento.</p>')+'</section>';}
