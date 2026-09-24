import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const clean=s=>s.replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
const starter=read('features/starter/starter-ui.js');
const data=starter.slice(starter.indexOf('// supabase/functions/starter-game/core/mock-data.mjs'),starter.indexOf('// features/starter/art.mjs'));
const source=`// GENERATED: node scripts/build-bug-edge.mjs. No credentials in this file.
const starterCore=(()=>{\n${clean(read('features/starter/johto.mjs'))}\n${data}\nreturn {createPokemon};})();
const fishingCore=(()=>{const {createPokemon}=starterCore;\n${clean(read('features/fishing/config.mjs'))}\n${clean(read('features/fishing/engine.mjs'))}\nreturn {turn};})();
const bugCore=(()=>{const {createPokemon}=starterCore;const {turn}=fishingCore;\n${clean(read('features/bug-contest/config.mjs'))}\n${clean(read('features/bug-contest/scoring.mjs'))}\n${clean(read('features/bug-contest/engine.mjs'))}\n${clean(read('features/bug-contest/commands.mjs'))}\nreturn {applyCommand};})();\n`;
// Can be parsed by Node as well as Deno; the handler adds the Deno/Supabase transport.
new Function(source);
fs.writeFileSync(new URL('../supabase/functions/bug-contest/index.ts',import.meta.url),source+'\n'+read('supabase/functions/bug-contest/handler.ts'));
console.log('Built standalone bug-contest Edge Function from the existing shared battle engine.');
