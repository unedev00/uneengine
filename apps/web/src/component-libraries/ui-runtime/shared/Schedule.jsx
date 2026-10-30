import {records as sourceRecords,title as recordTitle} from "../../shared/Data.jsx";
const dateOnly=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const parseDate=value=>dateOnly(value)?new Date(value+"T12:00:00"):new Date(value);
const iso=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
const dayShift=(date,n)=>{const d=new Date(date);d.setDate(d.getDate()+n);return d};
const inTimeZone=(value,timeZone)=>{
 if(dateOnly(value))return value;
 const date=parseDate(value);
 if(Number.isNaN(date.getTime()))return "";
 try {const parts=new Intl.DateTimeFormat("en-GB",{timeZone:timeZone||undefined,
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return [map.year,map.month,map.day].join("-");
 }catch{return iso(date);}
};
const read=(row,key,fallback)=>typeof key==="string"&&/^[A-Za-z][A-Za-z0-9_]*$/.test(key)?row?.[key]??fallback:fallback;
const fire=(p,event,value)=>p.actionFlows?.[event]&&typeof p.onAction==="function"
 ?Promise.resolve(p.onAction({event,value})).catch(()=>{}):undefined;
export default function UneSchedule(p){
 const viewChoices=["month","week","day","agenda"],initial=viewChoices.includes(p.view)?p.view:"month";
 const initialDate=p.selectedDate||(p.defaultValue&&p.defaultValue!=="today"?p.defaultValue:null);
 const [view,setView]=React.useState(initial),[date,setDate]=React.useState(()=>parseDate(initialDate||iso(new Date())));
 React.useEffect(()=>{if(viewChoices.includes(p.view))setView(p.view)},[p.view]);
 React.useEffect(()=>{if(p.selectedDate&&!Number.isNaN(parseDate(p.selectedDate).getTime()))setDate(parseDate(p.selectedDate));
  else if(p.defaultValue==="today")setDate(new Date());
  else if(p.defaultValue&&!Number.isNaN(parseDate(p.defaultValue).getTime()))setDate(parseDate(p.defaultValue));
 },[p.selectedDate,p.defaultValue]);
 const weekCodes=["sun","mon","tue","wed","thu","fri","sat"];
 const startDay=weekCodes.indexOf(p.firstDay);
 const firstDay=startDay>=0?startDay:p.firstDayOfWeek==="sunday"?0:1;
 const configuredDays=Array.isArray(p.showDays)?p.showDays.filter(day=>weekCodes.includes(day)):null;
 const enabledDays=new Set(configuredDays??(p.showWeekends===false?weekCodes.slice(1,6):weekCodes));
 const activeDayCount=Math.max(1,enabledDays.size);
 const dayEnabled=day=>enabledDays.has(weekCodes[day]);
 const safeColor=value=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value:undefined;
 const selected=Number.isNaN(date.getTime())?new Date():date;
 const dateField=p.dateFieldApiName||p.eventStartFieldApiName||"StartDateTime";
 const titleField=p.titleFieldApiName||"Name",resourceField=p.resourceFieldApiName||"",serviceField=p.serviceFieldApiName||"";
 const events=sourceRecords(p).filter(row=>(!resourceField||!p.resourceValue||String(read(row,resourceField,""))===String(p.resourceValue))
  &&(!serviceField||!p.serviceValue||String(read(row,serviceField,""))===String(p.serviceValue)))
  .map(row=>({row,date:inTimeZone(String(read(row,dateField,"")),p.timeZone),
   title:String(read(row,titleField,recordTitle(row)))})).filter(item=>item.date);
 const start=new Date(selected.getFullYear(),selected.getMonth(),1,12);
 const offset=(start.getDay()-firstDay+7)%7;
 const startWeek=dayShift(selected,-((selected.getDay()-firstDay+7)%7));
 const startMonth=dayShift(start,-offset);
 const days=view==="month"?Array.from({length:42},(_,i)=>dayShift(startMonth,i))
  :view==="week"?Array.from({length:7},(_,i)=>dayShift(startWeek,i))
  :[selected];
 const period=view==="month"?"month":view==="week"?"week":"day";
 const shift=dir=>setDate(current=>{
  const next=new Date(current);if(period==="month")next.setMonth(next.getMonth()+dir);
  else next.setDate(next.getDate()+dir*(period==="week"?7:1));return next;
 });
 const selectDay=(day,items)=>{setDate(day);fire(p,"dateSelect",{date:iso(day),events:items.map(i=>i.row)})};
 const eventClick=item=>fire(p,"eventSelect",{record:item.row,date:item.date});
 return <section className="one-ui one-surface une-calendar" style={{
   padding:12,backgroundColor:safeColor(p.backgroundColor),borderColor:safeColor(p.borderColor),
   borderRadius:Number.isFinite(Number(p.radius))?Math.max(0,Math.min(80,Number(p.radius))):undefined,
   boxShadow:p.shadow==="none"?"none":p.shadow==="small"?"0 1px 3px #0002":p.shadow==="large"?"0 10px 28px #0004":"0 4px 12px #0003"
 }} aria-label={p.label||"Calendar"}>
  <div className="one-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,
    backgroundColor:safeColor(p.calendarHeaderColor)}}>
   <button className="one-btn" type="button" aria-label="Previous period" onClick={()=>shift(-1)}>‹</button>
   <strong style={{color:safeColor(p.calendarMonthTitleColor),
      flex:"1 1 auto",fontSize:Number.isFinite(Number(p.textSize))&&Number(p.textSize)>0?Number(p.textSize):undefined}}>
      {selected.toLocaleString(undefined,{month:"long",year:"numeric"})}
   </strong>
   <button className="one-btn" type="button" aria-label="Next period" onClick={()=>shift(1)}>›</button>
   <button className="one-btn" type="button" onClick={()=>setDate(new Date())}>Today</button>
   <label>View <select className="one-control" value={view} onChange={e=>{
    setView(e.target.value);fire(p,"viewChange",{view:e.target.value});}}>
    {viewChoices.map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}
   </select></label>
  </div>
  {view==="agenda"?<div className="one-stack" style={{flexDirection:"column"}}>
   {events.filter(item=>item.date>=iso(selected)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,100)
     .map((item,i)=><button key={i} type="button" className="one-item"
       onClick={()=>eventClick(item)}>{item.date} · {item.title}</button>)}
   {!events.length&&<p>No appointments</p>}
  </div>:<div className="une-calendar-grid" style={{"--une-calendar-columns":view==="day"?1:activeDayCount}}>
   {view!=="day"&&Array.from({length:7},(_,i)=>(firstDay+i)%7).filter(dayEnabled).map(day=><strong key={day} style={{textAlign:"center",color:safeColor(p.textColor)}}>
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][day]}</strong>)}
   {days.filter(d=>view==="day"||dayEnabled(d.getDay())).map(day=>{
     const found=events.filter(item=>item.date===iso(day));
     return <div className="une-calendar-day" key={iso(day)}>
       <button className="one-btn" type="button" aria-label={"Select "+iso(day)}
        style={{color:safeColor(p.textColor),...(iso(day)===iso(selected)
           ?{backgroundColor:safeColor(p.defaultValueColor)||"var(--une-accent,#2563eb)",color:safeColor(p.selectedDateTextColor)||"#fff"}:{} )}}
        onClick={()=>selectDay(day,found)}>{day.getDate()}</button>
       {found.slice(0,view==="month"?3:20).map((item,i)=><button type="button"
         key={i} className="une-calendar-event" title={item.title} onClick={()=>eventClick(item)}>{item.title}</button>)}
       {found.length>(view==="month"?3:20)&&<small>+{found.length-(view==="month"?3:20)} more</small>}
      </div>})}
  </div>}
 </section>;
}
