// Metadata only. Card art is rendered only after the organizer's separate rights review.
export async function loadTCGPrints(ids,{fetcher=fetch,signal}={}){
 if(ids.length<10||ids.length>30||new Set(ids).size!==ids.length||ids.some(id=>!/^[a-zA-Z0-9-]{2,60}$/.test(id)))throw Error('INVALID_CATALOG');
 const cards=[];for(const id of ids){const url='https://api.tcgdex.net/v2/en/cards/'+encodeURIComponent(id);const response=await fetcher(url,{signal});if(!response.ok)throw Error('TCG_PROVIDER_UNAVAILABLE');const c=await response.json();if(!c.id||!c.image||!c.set?.name)throw Error('TCG_IMAGE_MISSING');cards.push({print_id:'tcgdex:'+c.id,name:c.name,set_name:c.set.name,collector_number:c.localId||'',image_url:c.image+'/high.webp',source_url:url});}
 return cards;
}
