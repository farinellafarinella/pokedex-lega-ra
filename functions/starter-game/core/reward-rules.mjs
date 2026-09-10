// Provisional policy: daily, Europe/Rome. Kept separate from the battle engine.
export const REWARD_POLICY={period:'daily',limit:3,timeZone:'Europe/Rome',replacement:'choice'};
export function periodKey(now=new Date(),period=REWARD_POLICY.period){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:REWARD_POLICY.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=type=>parts.find(p=>p.type===type).value;
 const date=new Date(`${get('year')}-${get('month')}-${get('day')}T12:00:00Z`);
 if(period==='weekly')date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
 else if(period!=='daily')throw new Error('Periodo premi sconosciuto');
 return date.toISOString().slice(0,10);
}
export function rewardStatus(profile,now=new Date()){
 const period=periodKey(now),used=profile.challenges[period]||0;
 return {period,used,remaining:Math.max(0,REWARD_POLICY.limit-used),eligible:used<REWARD_POLICY.limit};
}
export function reserveChallenge(profile,now=new Date()){
 const status=rewardStatus(profile,now);profile.challenges[status.period]=status.used+1;
 return {...status,number:status.used+1};
}
export function awardFossil(profile,species,battleId){
 const item={id:`fossil-${battleId}`,species};
 if(!profile.inventory.fossil){profile.inventory.fossil=item;return 'received';}
 if(profile.inventory.fossil.species===species)return 'already-owned';
 if(REWARD_POLICY.replacement==='automatic'){profile.inventory.fossil=item;return 'replaced';}
 profile.pendingFossil=item;return 'choice';
}
export function resolveFossil(profile,replace){
 if(!profile.pendingFossil)throw new Error('Nessun fossile da scegliere');
 if(replace)profile.inventory.fossil=profile.pendingFossil;
 profile.pendingFossil=null;return profile.inventory.fossil;
}
