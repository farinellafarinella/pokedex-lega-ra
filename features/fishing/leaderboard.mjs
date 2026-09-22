async function rpc(client,name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
export async function readLeaderboard(client){return await rpc(client,'get_fishing_game_leaderboard')||[];}
export async function readStatus(client){const rows=await rpc(client,'get_fishing_game_status');if(!rows?.[0])throw Error('NOT_AUTHORIZED');if(!Number.isInteger(rows[0].balls_left)||!Number.isInteger(rows[0].ball_limit))throw Object.assign(Error('UPDATE_REQUIRED'),{code:'PGRST202'});return rows[0];}
export const startFishing=(client,id)=>rpc(client,'start_fishing_game',{p_operation_id:id});
export const finishFishing=(client,id)=>rpc(client,'finish_fishing_game',{p_operation_id:id});
export const throwFishingBall=(client,pending)=>rpc(client,'throw_fishing_ball',{p_entry_id:pending.id,p_throw_id:pending.throwId,p_hp:pending.hp,p_max_hp:pending.maxHp});
export const closeFishingBattle=(client,id,outcome)=>rpc(client,'close_fishing_battle',{p_entry_id:id,p_outcome:outcome});
