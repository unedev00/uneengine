import {useEffect,useRef} from 'react';
import type {FlowDefinitionMetadata} from '../metadata/Definitions/metadata';
type Signal={pageSessionKey?:string;componentId?:string;event?:string;value?:unknown;recordId?:string};
type Props={flows:ReadonlyArray<FlowDefinitionMetadata>;appApiName:string;pageApiName:string;
 onLaunchFlow:(apiName:string,inputs?:Record<string,unknown>)=>void};
const objectValue=(value:unknown):Record<string,unknown>=>
 value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** Existing Flow runtime evaluates every business rule; this host only routes UI events. */
export default function InScreenFlowHost({flows,appApiName,pageApiName,onLaunchFlow}:Props){
 const firstLoad=useRef(new Set<string>()),once=useRef(new Set<string>()),recent=useRef(new Map<string,number>());
 const scope=appApiName+':'+pageApiName;
 useEffect(()=>{
  const active=flows.filter(flow=>flow.flowType==='In-Screen Flow'&&flow.status==='Active'
    &&(!flow.startConfig.targetAppApiName||flow.startConfig.targetAppApiName===appApiName)
    &&(!flow.startConfig.targetPageApiName||flow.startConfig.targetPageApiName===pageApiName));
  if(!active.length)return;
  const launch=(trigger:string,detail:Signal)=>{
   if(detail.pageSessionKey&&detail.pageSessionKey!==scope)return;
   for(const flow of active){
    const settings=flow.startConfig;
    if(String(settings.launchTrigger??'manual')!==trigger)continue;
    if(trigger==='component-event'&&settings.launchEventName&&settings.launchEventName!==detail.event)continue;
    const key=scope+':'+flow.apiName,now=Date.now();
    if(trigger==='page-load'&&firstLoad.current.has(key))continue;
    if(settings.oncePerSession===true&&once.current.has(key))continue;
    if(now-(recent.current.get(key)??0)<Math.max(250,Math.min(3600,Number(settings.cooldownSeconds??0))*1000))continue;
    let sessionKey='';
    try{sessionKey=window.sessionStorage.getItem('metadrive-page-session:'+scope)??'';}catch{ /* optional */ }
    const payload=objectValue(detail.value),record=objectValue(payload.record);
    const candidate=detail.recordId??payload.recordId??record.Id??record.id;
    const values:Record<string,unknown>={appApiName,pageApiName,sessionKey,eventName:detail.event??trigger,
      componentId:detail.componentId??'',recordId:typeof candidate==='string'?candidate:''};
    const inputs:Record<string,unknown>={};
    for(const resource of flow.resources??[])
     if(resource.availableForInput&&Object.prototype.hasOwnProperty.call(values,resource.name)&&values[resource.name]!=='')
      inputs[resource.name]=values[resource.name];
    recent.current.set(key,now);
    if(trigger==='page-load')firstLoad.current.add(key);
    if(settings.oncePerSession===true)once.current.add(key);
    onLaunchFlow(flow.apiName,inputs);
    break; // One shared Screen interview at a time; no competing modal engines.
   }
  };
  const component=(event:Event)=>{const d=(event as CustomEvent<Signal>).detail;if(d)launch('component-event',d);};
  const updated=(event:Event)=>{const d=(event as CustomEvent<Signal>).detail;if(d)launch('page-updated',d);};
  window.addEventListener('metadrive:in-screen-action',component);
  window.addEventListener('metadrive:page-component-interaction',component);
  window.addEventListener('metadrive:page-flow-mutated',updated);
  launch('page-load',{pageSessionKey:scope});
  return()=>{
   window.removeEventListener('metadrive:in-screen-action',component);
   window.removeEventListener('metadrive:page-component-interaction',component);
   window.removeEventListener('metadrive:page-flow-mutated',updated);
  };
 },[flows,scope,appApiName,pageApiName,onLaunchFlow]);
 return null;
}
