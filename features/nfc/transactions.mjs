export const validAmount=value=>Number.isSafeInteger(Number(value))&&Number(value)>=1&&Number(value)<=1000;
export function requestStorage(userId,storage=globalThis.localStorage){
 const key='route:nfc:pending:'+userId;
 return {read(){try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}},save(value){storage.setItem(key,JSON.stringify(value));return value;},clear(){storage.removeItem(key);}};
}
export const dateTime=value=>value?new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'medium'}).format(new Date(value)):'—';
