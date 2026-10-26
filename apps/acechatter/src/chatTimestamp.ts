/** Display transport timestamps in the viewer's local timezone.
 * Keep this presentational: database dates remain unchanged and ISO-8601.
 */
export function formatChatTimestamp(value:unknown,timeZone?:string):string{
 const raw=typeof value==='string'?value.trim():value instanceof Date?value.toISOString():'';
 if(!raw)return '';
 const date=new Date(raw);
 if(Number.isNaN(date.getTime()))return raw;
 const parts=new Intl.DateTimeFormat('en-GB',{
  day:'2-digit',month:'short',year:'2-digit',
  hour:'2-digit',minute:'2-digit',hourCycle:'h12',
  ...(timeZone?{timeZone}:{})
 }).formatToParts(date);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 return part('day')+'-'+part('month')+'-'+part('year')+' '+
  part('hour')+':'+part('minute')+' '+part('dayPeriod').toUpperCase();
}
