import type {Express} from 'express';
import type {SqlPersistence} from '../system-files/sql-persistence.js';
import type {RbacEngine} from '../system-files/rbac-engine.js';
import {authenticated,wrap} from '../api/ApiAuthenticationGuard.js';
import {ScheduledActionService} from './scheduled-action-service.js';

/** Tenant-scoped controls. Own jobs require a login; cross-user access requires Tenant manage. */
export function registerScheduledActionRoutes(app:Express,db:SqlPersistence,rbac:RbacEngine){
 const scheduled=new ScheduledActionService(db);
 app.get('/api/scheduled-actions',wrap(async(req,res)=>{
  const actor=authenticated(req);
  const manage=await rbac.allowed(actor.tenant_id,actor.user_id,'Tenant','manage');
  res.setHeader('Cache-Control','private, no-store');
  res.json({actions:await scheduled.list(actor.tenant_id,actor.user_id,manage)});
 }));
 for(const decision of ['cancel','complete'] as const){
  app.post('/api/scheduled-actions/:id/'+decision,wrap(async(req,res)=>{
   const actor=authenticated(req);
   const manage=await rbac.allowed(actor.tenant_id,actor.user_id,'Tenant','manage');
   const result=await scheduled.decide(actor.tenant_id,req.params.id,
     actor.user_id,decision,manage);
   res.setHeader('Cache-Control','private, no-store');
   res.json(result);
  }));
 }
}
