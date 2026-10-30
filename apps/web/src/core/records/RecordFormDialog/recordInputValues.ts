/** datetime-local controls show local time; storage/API values remain ISO instants. */
export function recordDateTimeInput(value:unknown):string {
  if(value===null||value===undefined||value==='')return '';
  const date=new Date(String(value));
  if(!Number.isFinite(date.getTime()))return '';
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,19);
}
export function recordDateTimeValue(value:string):string|null {
  if(!value)return null;
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))throw new Error('Enter a valid date and time');
  return date.toISOString();
}
