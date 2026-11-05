import type {Express} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import type {RecordEngine} from '../system-files/record-engine.js';
import type {FlowRuntime} from '../system-files/flow-runtime.js';
import {PageRuntime} from '../system-files/page-runtime.js';
import {FormulaActionExecutor,type ActionVariables} from '../system-files/formula-action-executor.js';
import {ScheduledActionService} from '../system-support/scheduled-action-service.js';
import {authenticated,wrap,api} from './ApiAuthenticationGuard.js';

const name=/^[A-Za-z][A-Za-z0-9_]{0,79}$/;
function variablesOf(state:unknown,event:unknown):ActionVariables{
 const variables:ActionVariables={};
 const add=(prefix:string,source:unknown)=>{
  if(!source||typeof source!=='object'||Array.isArray(source))return;
  const entries=Object.entries(source);
  if(entries.length>128)throw Error('Too many action inputs');
  for(const [key,value] of entries){
   if(!name.test(key))continue;
   if(value===null||typeof value==='boolean'||
      typeof value==='string'&&value.length<=4096||
      typeof value==='number'&&Number.isFinite(value))
    variables[prefix+key]=value;
  }
 };
 add('$state.',state);add('$event.',event);
 return variables;
}

/** Only formulas already published on an authorised Page may be triggered. */
export function registerActionFormulaApiController(app:Express,db:SqlPersistence,
 rbac:RbacEngine,records:RecordEngine,flows:FlowRuntime){
 const pages=new PageRuntime(db);
 const executor=new FormulaActionExecutor(records,flows,new ScheduledActionService(db));
 app.post('/api/action-formulas/execute',wrap(async(req,res)=>{
  const actor=authenticated(req),body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid action request');
  const pageApi=body.pageApiName,componentId=body.componentId,event=body.event;
  const sessionId=body.sessionId;
  if(typeof pageApi!=='string'||!api.test(pageApi)
    ||typeof componentId!=='string'||componentId.length<1||componentId.length>128
    ||typeof event!=='string'||!name.test(event)
    ||typeof sessionId!=='string'||!/^[A-Za-z0-9_:.-]{1,200}$/.test(sessionId))
   throw Error('Invalid action source');
  await rbac.require(actor.tenant_id,actor.user_id,'PageDefinition','read');
  const page=await pages.metadata(actor.tenant_id,pageApi);
  if(page.status!=='Active')throw Error('Action Page is not published');
  const component=page.components.find(item=>item.id===componentId);
  if(!component)throw Error('Action component does not exist');
  const properties=component.properties&&typeof component.properties==='object'&&!Array.isArray(component.properties)
    ?component.properties as Record<string,unknown>:{};
  const bindings=properties.actionFlows;
  if(!bindings||typeof bindings!=='object'||Array.isArray(bindings))
   throw Error('No action bindings on this component');
  const binding=(bindings as Record<string,unknown>)[event];
  if(!binding||typeof binding!=='object'||Array.isArray(binding)
    ||(binding as Record<string,unknown>).actionType!=='Formula')
   throw Error('No published Formula for this event');
  const formula=(binding as Record<string,unknown>).formula;
  if(typeof formula!=='string'||formula.length>4000)throw Error('Invalid published formula');
  const result=await executor.execute(formula,{
   tenantId:actor.tenant_id,userId:actor.user_id,sessionId,pageApi
  },variablesOf(body.state,body.payload));
  res.setHeader('Cache-Control','private, no-store');
  res.status(result.scheduledActionId?202:200)
   .json({completed:result.completed,recordChanged:result.recordChanged,
     scheduledActionId:result.scheduledActionId??null});
 }));
}
