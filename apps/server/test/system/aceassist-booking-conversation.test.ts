import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ACEASSIST_BOOKING_DEFAULT_GRAPH,ACEASSIST_BOOKING_FLOW_API}
 from '../../src/app-seeders/aceassist-booking-conversation.js';
import {executeAvailableSlotsNode} from '../../src/system-files/nodes/AvailableSlotsNode.js';

const staff='22222222-2222-4222-8222-222222222222';
const guards={
 overlapGuard:{startField:'StartDateTime',endField:'EndDateTime',
  groupFields:['AssignedTo'],statusField:'Status',excludedStatuses:['Cancelled']},
 availabilityGuard:{startField:'StartDateTime',endField:'EndDateTime',
  staffFields:['AssignedTo'],schedule:{object:'StaffAvailability',staff:'OwnerId',
   active:'Active',weekday:'Weekday',start:'StartTime',end:'EndTime'}}
};

function fixture(input:{enabled?:boolean;shifts?:boolean;occupied?:boolean;mode?:string;
 selectedTime?:string;allowedSlots?:string}={}){
 const variables:Record<string,unknown>={};
 const client={query:async(sql:string)=>{
  if(sql.includes('md_tenant_settings'))return {rows:[{properties:{timezone:'UTC',
   weeklyHours:{thursday:{open:'09:00',close:'10:00',closed:false}}}}],rowCount:1};
  if(sql.includes('FROM md_users'))return {rows:[],rowCount:input.enabled===false?0:1};
  if(sql.includes('COUNT(*)>0 AS configured'))return {
   rows:[{configured:true,covered:true}],rowCount:1};
  if(sql.includes('FROM md_records'))return {rows:[],rowCount:input.occupied?1:0};
  return {rows:[],rowCount:0};
 }};
 const recordQuery={find:async()=>input.shifts===false?[]:[{
  Id:'11111111-1111-4111-8111-111111111111',
  OwnerId:staff,Weekday:'Thursday',StartTime:'09:00:00',EndTime:'10:00:00',Active:true
 }]};
 const config={
  businessCalendarGuard:{startInput:'StartDateTime',endInput:'EndDateTime'},
  ...guards,mode:input.mode??'list',date:'2099-01-01',staffId:staff,
  durationMinutes:30,maximumSlots:10,appointmentObject:'Appointment',
  scheduleObject:'StaffAvailability',outputVariable:'times',
  allowedVariable:'offered',availableVariable:'hasSlots',
  startVariable:'from',endVariable:'to',validVariable:'valid',
  selectedTime:input.selectedTime??'09:00',allowedSlots:input.allowedSlots??'|09:00|'
 };
 const context={node:{id:11,type:'Get Available Slots',config},tenantId:'tenant',
  userId:'actor',client,recordQuery,evaluate:(value:unknown)=>value,
  set:(name:string,value:unknown)=>{variables[name]=value}} as never;
 return {context,variables};
}

test('AceAssist Booking stays draft and listens only to created inbound WhatsApp Communications',()=>{
 assert.equal(ACEASSIST_BOOKING_FLOW_API,'AceAssistBooking');
 assert.equal(ACEASSIST_BOOKING_DEFAULT_GRAPH.status,'Draft');
 const start=ACEASSIST_BOOKING_DEFAULT_GRAPH.startConfig;
 assert.equal(start.object,'Communication');
 assert.equal(start.trigger,'created');
 assert.equal(start.runWhen,'after-save');
 assert.deepEqual(start.entryConditions.map(c=>[c.field,c.value]),[
  ['Channel','WhatsApp'],['Direction','Inbound'],['RelatedObject','InboundWebhookEndpoint']]);
 const nodes=ACEASSIST_BOOKING_DEFAULT_GRAPH.elements;
 assert.ok(nodes.some(x=>x.type==='Get Available Slots'&&x.config.mode==='list'));
 assert.ok(nodes.some(x=>x.type==='Get Available Slots'&&x.config.mode==='validate'));
 assert.ok(nodes.some(x=>x.type==='Create Records'&&x.config.object==='Appointment'
  &&x.config.overlapGuard&&x.config.availabilityGuard));
 assert.ok(nodes.some(x=>x.type==='Create Records'&&x.config.object==='Appointment'
  &&x.config.uniqueInputGuard?.field==='ExternalBookingId'
  &&x.config.fieldValues?.some(v=>v.field==='ExternalBookingId'
    &&v.value==='{!session.BookingToken}')));
 assert.ok(nodes.some(x=>x.id===5&&x.config.fieldValues?.some(v=>
  v.field==='BookingToken'&&v.value==='{!messageId}')));
 assert.ok(nodes.some(x=>x.id===8&&x.config.fieldValues?.some(v=>
  v.field==='BookingToken'&&v.value==='{!messageId}')));

 assert.ok(nodes.some(x=>x.label.includes('Welcome')&&JSON.stringify(x.config).includes('TODAY')));
 assert.ok(nodes.some(x=>x.label.includes('SMS')&&JSON.stringify(x.config).includes('Your Booking is confirmed')));
});

test('slot suggestion fails closed when staff is disabled or has no shifts',async()=>{
 for(const options of [{enabled:false},{shifts:false}]){
  const f=fixture(options);
  await executeAvailableSlotsNode(f.context);
  assert.equal(f.variables.hasSlots,false);
  assert.equal(f.variables.offered,'');
 }
});

test('slot choices include only configured half-hour windows',async()=>{
 const f=fixture();
 await executeAvailableSlotsNode(f.context);
 assert.equal(f.variables.hasSlots,true);
 assert.equal(f.variables.offered,'|09:00|09:30|');
 assert.equal(f.variables.times,'1. 09:00, 2. 09:30');
});

test('customers may select the numbered offered slot',async()=>{
 const f=fixture({mode:'validate',selectedTime:'1',
  allowedSlots:'|09:00|09:30|'});
 await executeAvailableSlotsNode(f.context);
 assert.equal(f.variables.valid,true);
 assert.equal(f.variables.from,'2099-01-01T09:00:00.000Z');
 const invalid=fixture({mode:'validate',selectedTime:'3',
  allowedSlots:'|09:00|09:30|'});
 await executeAvailableSlotsNode(invalid.context);
 assert.equal(invalid.variables.valid,false);
});

test('incoming time must match a previously offered slot',async()=>{
 const f=fixture({mode:'validate',selectedTime:'15:00'});
 await executeAvailableSlotsNode(f.context);
 assert.equal(f.variables.valid,false);
 const valid=fixture({mode:'validate',selectedTime:'09:00'});
 await executeAvailableSlotsNode(valid.context);
 assert.equal(valid.variables.valid,true);
 assert.equal(valid.variables.from,'2099-01-01T09:00:00.000Z');
 assert.equal(valid.variables.to,'2099-01-01T09:30:00.000Z');
});
