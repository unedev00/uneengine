const fire=(p,event,value)=>{
 if(event==="change"&&typeof p.onChange==="function"&&!p.actionFlows?.change)p.onChange(value);
 if(p.actionFlows?.[event]&&typeof p.onAction==="function")
  return Promise.resolve(p.onAction({event,value})).catch(()=>{});
};
const prop=(row,key,alternative)=>row?.[key]??row?.[alternative];
const count=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):0;
export default function OptionGroups(p){
 const groups=Array.isArray(p.groups)&&p.groups.length?p.groups:Array.isArray(p.items)?p.items:[];
 const [values,setValues]=React.useState({});
 React.useEffect(()=>setValues({}),[p.groups,p.items]);
 const result=groups.flatMap((group,i)=>{
   const id=String(prop(group,p.groupIdFieldApiName||"id","Id")??i);
   const selected=values[id]??[];
   return selected.map(choiceId=>({groupId:id,choiceId}));
 });
 const options=group=>Array.isArray(prop(group,p.choicesFieldApiName||"choices","Choices"))?
   prop(group,p.choicesFieldApiName||"choices","Choices"):[];
 const valid=groups.every((group,i)=>{
   const id=String(prop(group,p.groupIdFieldApiName||"id","Id")??i),selected=values[id]??[];
   const min=count(group.minChoices??group.MinimumChoices??(group.required?1:0));
   const max=count(group.maxChoices??group.MaximumChoices);
   return selected.length>=min&&(!max||selected.length<=max);
 });
 const choose=(group,i,choice,j)=>{
   const groupId=String(prop(group,p.groupIdFieldApiName||"id","Id")??i);
   const choiceId=String(prop(choice,p.choiceIdFieldApiName||"id","Id")??j);
   const multiple=group.multiple===true||count(group.maxChoices??group.MaximumChoices)>1;
   const original=values[groupId]??[];
   const next=multiple?(original.includes(choiceId)?original.filter(x=>x!==choiceId):[...original,choiceId]):[choiceId];
   const max=count(group.maxChoices??group.MaximumChoices);
   if(max&&next.length>max)return;
   const changed={...values,[groupId]:next};
   setValues(changed);
   const selections=Object.entries(changed).flatMap(([groupId,ids])=>ids.map(choiceId=>({groupId,choiceId})));
   fire(p,"change",{selections});
 };
 return <section className="one-ui one-surface" style={{padding:16}}>
  {groups.map((group,i)=>{
    const id=String(prop(group,p.groupIdFieldApiName||"id","Id")??i);
    const label=String(prop(group,p.groupLabelFieldApiName||"label","Name")??"Choose an option");
    const min=count(group.minChoices??group.MinimumChoices??(group.required?1:0));
    const max=count(group.maxChoices??group.MaximumChoices);
    const multi=group.multiple===true||max>1;
    return <fieldset key={id} className="une-option-group" style={{padding:12,marginBottom:10,border:"1px solid var(--une-border)",borderRadius:12}}>
     <legend><strong>{label}</strong>{min>0?" *":""}</legend>
     <div className="one-stack" style={{gap:8,flexDirection:"column"}}>
      {options(group).map((choice,j)=>{
       const choiceId=String(prop(choice,p.choiceIdFieldApiName||"id","Id")??j);
       const title=String(prop(choice,p.choiceLabelFieldApiName||"label","Name")??choiceId);
       const selected=(values[id]??[]).includes(choiceId);
       return <label key={choiceId} className="one-item" style={{padding:10,display:"flex",alignItems:"center",gap:10}}>
         <input type={multi?"checkbox":"radio"} name={"une-choice-"+id}
          checked={selected} onChange={()=>choose(group,i,choice,j)}/>
         <span>{title}{choice.description&&<small style={{display:"block"}}>{choice.description}</small>}</span>
       </label>
      })}
     </div></fieldset>;
  })}
  {!groups.length&&<p className="one-muted" role="status">No options available.</p>}
  <button className="one-btn one-btn--primary" type="button" disabled={!valid||!groups.length}
   onClick={()=>fire(p,"confirm",{selections:result})}>{p.confirmLabel||"Continue"}</button>
 </section>;
}
