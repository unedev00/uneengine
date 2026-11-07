type RecordPage<Row>={records:Row[];total:number};
/** Share identical authorised reads for the duration of a network request.
 * A smaller page may join an in-flight larger page. A larger request must
 * start separately so no caller receives an incomplete record window.
 * The caller owns the authenticated query/offset and mutation generation key.
 * Never store settled results or reuse them after a write.
 */
export function createRecordPageCoalescer<Row>() {
 type Subscriber={limit:number;resolve:(page:RecordPage<Row>)=>void;reject:(error:unknown)=>void};
 type Group={maxLimit:number;load:(limit:number)=>Promise<RecordPage<Row>>;subscribers:Subscriber[]};
 type Running={limit:number;promise:Promise<RecordPage<Row>>};
 const pending=new Map<string,Group>();
 const inFlight=new Map<string,Running>();
 const project=(result:RecordPage<Row>,limit:number):RecordPage<Row>=>{
  if(!result||!Array.isArray(result.records)||!Number.isFinite(result.total))
   throw Error('Invalid record page');
  return {records:result.records.slice(0,limit),total:result.total};
 };
 return function coalesce(
  key:string,limit:number,load:(limit:number)=>Promise<RecordPage<Row>>
 ):Promise<RecordPage<Row>>{
  const running=inFlight.get(key);
  if(running&&running.limit>=limit)
   return running.promise.then(result=>project(result,limit));
  return new Promise((resolve,reject)=>{
   let group=pending.get(key);
   if(!group){
    group={maxLimit:limit,load,subscribers:[]};
    pending.set(key,group);
    const scheduled=group;
    // Preserve same-microtask batching, then retain the resulting request until
    // settlement for later subscribers that require no more rows.
    queueMicrotask(()=>{
     if(pending.get(key)===scheduled)pending.delete(key);
     const promise=Promise.resolve().then(()=>scheduled.load(scheduled.maxLimit));
     const current:Running={limit:scheduled.maxLimit,promise};
     inFlight.set(key,current);
     void promise.then(result=>{
      for(const subscriber of scheduled.subscribers){
       try{subscriber.resolve(project(result,subscriber.limit));}
       catch(error){subscriber.reject(error);}
      }
     },error=>{for(const subscriber of scheduled.subscribers)subscriber.reject(error);})
     .finally(()=>{if(inFlight.get(key)===current)inFlight.delete(key);});
    });
   }
   group.maxLimit=Math.max(group.maxLimit,limit);
   group.subscribers.push({limit,resolve,reject});
  });
 };
}
