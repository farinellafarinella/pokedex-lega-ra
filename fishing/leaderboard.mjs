async function rpc(client,name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
export async function readLeaderboard(client){return await rpc(client,'get_fishing_game_leaderboard')||[];}
export async function readStatus(client){const rows=await rpc(client,'get_fishing_game_status');if(!rows?.[0])throw Error('NOT_AUTHORIZED');return rows[0];}
export const startFishing=(client,id)=>rpc(client,'start_fishing_game',{p_operation_id:id});
export const finishFishing=(client,id)=>rpc(client,'finish_fishing_game',{p_operation_id:id});
