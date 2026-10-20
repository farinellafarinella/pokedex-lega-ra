import {createNFCAPI} from './api.mjs';
export function createStaticNFCAPI(client){const {rpc}=createNFCAPI(client);return {
 read:()=>rpc('get_route_nfc_static'),resolve:identifier=>rpc('route_nfc_static_resolve',{p_identifier:identifier}),
 associate:(identifier,replace=false)=>rpc('route_nfc_static_associate',{p_identifier:identifier,p_replace:replace}),block:()=>rpc('route_nfc_static_block'),
 create:(operation,amount)=>rpc('route_nfc_test_create',{p_operation:operation,p_amount:amount}),
 pay:(request,identifier)=>rpc('route_nfc_test_pay',{p_request:request,p_identifier:identifier}),
 receipt:request=>rpc('get_route_nfc_test_request',{p_request:request}),cancel:request=>rpc('route_nfc_test_cancel',{p_request:request}),
 reserve:(identifier,trainer)=>rpc('route_nfc_static_admin',{p_identifier:identifier,p_trainer_code:trainer}),admin:()=>rpc('get_route_nfc_static_admin')
};}
