const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('it-IT').format(value) + ' Pokédollari';
const messages = {
  NOT_AUTHORIZED: 'Accedi con una Scheda Allenatore attiva.',
  REGION_NOT_FOUND: 'Questa destinazione non è disponibile.',
  REGION_NOT_READY: 'Johto è ancora in preparazione. Nessun Pokédollaro è stato speso.',
  INSUFFICIENT_BALANCE: 'Non hai abbastanza Pokédollari per questo biglietto.'
};

export async function mountRegions(host, {client, onBalance = () => {}, isCurrent = () => true}) {
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `<link rel="stylesheet" href="${new URL('./style.css?v=regions-1',import.meta.url)}"><main><h1>Visita una regione</h1><p role="status">Caricamento delle destinazioni…</p></main>`;
  const main = root.querySelector('main');
  let state = null, busy = false, message = '', confirming = null;
  const current = () => host.isConnected && isCurrent();

  function render() {
    if (!current()) return;
    main.innerHTML = `<span class="eyebrow">IL TUO PROSSIMO VIAGGIO</span><h1>Visita una regione</h1>
      <p>Un biglietto aereo sblocca una regione per sempre, insieme ai suoi contenuti e alle future novità.</p>
      <p class="balance">Saldo: <strong>${money(state.balance)}</strong></p>
      <p role="status" aria-live="polite">${escape(message)}</p>
      ${state.regions.map(region => `<article>
        <div class="ticket"><span aria-hidden="true">✈</span><span>KANTO → ${escape(region.name.toUpperCase())}</span></div>
        <span class="badge">${region.unlocked ? 'Regione sbloccata' : region.available ? 'Pronta per il viaggio' : 'In preparazione'}</span>
        <h2>${escape(region.name)}</h2>
        <p>Biglietto aereo · <strong>${money(region.price)}</strong><br>Un solo acquisto, nessuna scadenza.</p>
        ${region.id === 'johto' ? `<h3>Contenuti previsti</h3><ul><li>Starter di Johto: Chikorita, Cyndaquil e Totodile. Il nuovo starter sostituisce quello attuale e riparte dal livello 5.</li><li>Nuovi fossili: Unown, Kabutops e Omastar.</li><li>Nuove funzionalità della regione negli aggiornamenti futuri.</li></ul>` : ''}
        ${region.unlocked ? '<p class="unlocked">Il biglietto è già tuo. Questa regione resta sbloccata sul tuo account.</p><p><a href="#my-starter">Scegli uno starter di Johto →</a></p><p><a href="#fossil-arena">Vai all’Arena Fossili →</a></p>' :
          !region.available ? '<p>I contenuti sono in preparazione. I biglietti non sono ancora in vendita.</p>' :
          confirming === region.id ? `<div class="confirm"><p>Acquistare il biglietto per ${escape(region.name)}? Il saldo diventerà ${money(state.balance-region.price)}.</p><button data-buy="${escape(region.id)}" ${busy ? 'disabled' : ''}>${busy ? 'Acquisto in corso…' : 'Conferma acquisto'}</button><button data-cancel ${busy ? 'disabled' : ''}>Annulla</button></div>` :
          `<button data-confirm="${escape(region.id)}" ${busy || state.balance < region.price ? 'disabled' : ''}>Acquista biglietto · ${money(region.price)}</button>${state.balance < region.price ? `<p>Ti mancano ${money(region.price-state.balance)}.</p>` : ''}`}
      </article>`).join('')}
      <a href="#dashboard">← Torna alla Home</a>`;
  }

  async function load() {
    try {
      const {data,error} = await client.rpc('get_region_travel');
      if (error) throw error;
      if (!current()) return;
      state = data; onBalance(data.balance); render();
    } catch (error) {
      if (!current()) return;
      main.innerHTML = '<h1>Visita una regione</h1><p role="alert">Le destinazioni non sono disponibili al momento. Riprova tra poco.</p><button data-retry>Riprova</button><p><a href="#dashboard">Torna alla Home</a></p>';
      console.error('Caricamento regioni:',error);
    }
  }

  root.addEventListener('click',async event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || busy || !current()) return;
    if (button.hasAttribute('data-retry')) { busy=true; await load(); busy=false; return; }
    if (button.hasAttribute('data-cancel')) { confirming=null; render(); return; }
    if (button.dataset.confirm) { confirming=button.dataset.confirm; message=''; render(); return; }
    if (!button.dataset.buy) return;
    const regionId=button.dataset.buy;
    busy=true; message=''; render();
    try {
      const {data,error}=await client.rpc('buy_region_ticket',{p_region:regionId});
      if (error) throw error;
      if (!current()) return;
      state=data; confirming=null; onBalance(data.balance);
      message='Biglietto acquistato! La regione è sbloccata sul tuo account.';
    } catch (error) {
      message=Object.entries(messages).find(([code])=>error.message?.includes(code))?.[1] || 'Non è stato possibile verificare l’acquisto. Riprova: un biglietto già acquistato non verrà addebitato di nuovo.';
    } finally { busy=false; render(); }
  });
  await load();
}
