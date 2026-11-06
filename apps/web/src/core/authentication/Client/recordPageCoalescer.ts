type RecordPage<Row>={records:Row[];total:number};
/** Coalesces only same-tick record page reads with the same authenticated
 * object/filter/offset. Never persists data or shares results across sessions.
 */
export function createRecordPageCoalescer<Row>() {
 type Subscriber={limit:number;resolve:(page:RecordPage<Row>)=>void;reject:(error:unknown)=>void};
 type Group={maxLimit:number;load:(limit:number)=>Promise<RecordPage<Row>>;subscribers:Subscriber[]};
 const pending=new Map<string,Group>();
 return function coalesce(
  key:string,limit:number,load:(limit:number)=>Promise<RecordPage<Row>>
 ):Promise<RecordPage<Row>>{
  return new Promise((resolve,reject)=>{
   let group=pending.get(key);
   if(!group){
    group={maxLimit:limit,load,subscribers:[]};
    pending.set(key,group);
    const scheduled=group;
    // Capture more specific limit requests in the same microtask window.
    queueMicrotask(()=>{
     if(pending.get(key)===scheduled)pending.delete(key);
     void scheduled.load(scheduled.maxLimit).then(result=>{
      for(const subscriber of scheduled.subscribers){
       if(!result||!Array.isArray(result.records)||
         !Number.isFinite(result.total))subscriber.reject(Error('Invalid record page'));
       else subscriber.resolve({records:result.records.slice(0,subscriber.limit),total:result.total});
      }
     },error=>{for(const subscriber of scheduled.subscribers)subscriber.reject(error);});
    });
   }
   group.maxLimit=Math.max(group.maxLimit,limit);
   group.subscribers.push({limit,resolve,reject});
  });
 };
}
