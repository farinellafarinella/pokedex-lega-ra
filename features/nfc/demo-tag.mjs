// Public, copyable NTAG215 URL. It can trigger only the isolated demo ledger.
// Opening this link is NOT proof of NFC presence or permission to spend PD.
export function demoTagURL(href){const url=new URL(href);url.search='';url.hash='nfc-demo-tap/ntag215-b';return url.href;}
export async function tapDemoTag(api){return api.demo('tap',150,'success');}
