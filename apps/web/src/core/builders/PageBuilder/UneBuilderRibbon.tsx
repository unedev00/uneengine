import type {ObjectMetadata} from '../../metadata/Definitions/metadata';
import {UNE_RIBBON_GROUPS,UNE_RIBBON_PROPERTIES,type UneBuilderApi,type UneBuilderTab,type UneRibbonProperty} from './uneBuilderPropertyInventory';
import UneExpressionEditor from './UneExpressionEditor';
import './UneBuilderRibbon.css';

const color=(value:unknown)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:'#ffffff';
const number=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
type Position={x:number;y:number;width:number;height:number};
export default function UneBuilderRibbon({tab,api,properties,onChange,objects,position,onPositionChange,layoutMode}:{
 tab:UneBuilderTab;api:UneBuilderApi;properties:Record<string,unknown>;
 onChange:(next:Record<string,unknown>)=>void;objects:readonly ObjectMetadata[];
 position?:Position;onPositionChange?:(next:Position)=>void;layoutMode:string;
}){
 const objectName=typeof properties.objectApiName==='string'?properties.objectApiName:'';
 const set=(id:string,value:unknown)=>onChange({...properties,[id]:value});
 const control=(property:UneRibbonProperty)=>{
  const supported=property.components.includes(api);
  const enabled=supported&&(property.kind!=='position'||layoutMode==='free-canvas'&&Boolean(position&&onPositionChange));
  const v=properties[property.id]??property.default??'';
  const name=property.label;
  let editor;
  const write=(next:unknown)=>{
    if(!enabled)return;
    if(property.kind==='position'&&position&&onPositionChange&&typeof next==='number')
      onPositionChange({...position,[property.id]:next});
    else if(property.kind!=='position')set(property.id,next);
  };
  if(property.kind==='expression')
    editor=<UneExpressionEditor value={String(v??'')} label={name} disabled={!enabled}
      onChange={next=>write(next)} objects={objects} objectApiName={objectName} field={property.field}/>;
  else if(property.kind==='object')
    editor=<select className="une-v2-select" aria-label={name} disabled={!enabled} value={String(v)}
      onChange={e=>write(e.target.value)}>
      <option value="">Choose Object</option>{objects.map(o=><option key={o.apiName} value={o.apiName}>{o.label}</option>)}
    </select>;
  else if(property.kind==='color')
    editor=<div className="une-v2-color"><input type="color" aria-label={name} disabled={!enabled}
       value={color(v)} onChange={e=>write(e.target.value)}/>
       <button type="button" title={'Clear '+name} disabled={!enabled} aria-label={'Clear '+name}
        onClick={()=>write('')}>×</button></div>;
  else if(property.kind==='number'||property.kind==='position')
    editor=<input className="une-v2-number" type="number" aria-label={name} disabled={!enabled}
      min={property.min??(property.kind==='position'?0:0)} max={property.max}
      value={property.kind==='position'?number(position?.[property.id as keyof Position]):v===null||v===''?'':String(v)}
      onChange={e=>{if(e.target.value!==''){const n=Number(e.target.value);if(Number.isFinite(n))write(n);}}}/>;
  else if(property.kind==='boolean')
    editor=<input type="checkbox" aria-label={name} disabled={!enabled}
      checked={v===true} onChange={e=>write(e.target.checked)}/>;
  else if(property.kind==='shadow')
    editor=<div className="une-v2-icon-options" role="group" aria-label={name}>
      {['none','small','medium','large'].map((opt,i)=><button key={opt} type="button" disabled={!enabled}
       title={opt} aria-label={name+' '+opt} aria-pressed={v===opt} onClick={()=>write(opt)}>
        <span style={{boxShadow:i===0?'none':i===1?'1px 1px 2px #64748b':i===2?'2px 3px 5px #64748b':'3px 4px 9px #64748b'}}/>
       </button>)}
    </div>;
  else if(property.kind==='align')
    editor=<div className="une-v2-icon-options" role="group" aria-label={name}>
      {['left','center','right'].map(opt=><button key={opt} type="button" disabled={!enabled}
        title={opt} aria-label={name+' '+opt} aria-pressed={v===opt} onClick={()=>write(opt)}>
         {opt==='left'?'☰':opt==='center'?'≡':'☷'}
       </button>)}
    </div>;
  else if(property.kind==='choice')
    editor=<select className="une-v2-select" disabled={!enabled} aria-label={name} value={String(v)}
      onChange={e=>write(e.target.value)}>
     <option value="">Default</option>{property.choices?.map(opt=><option key={opt} value={opt}>{opt.replaceAll('-',' ')}</option>)}
    </select>;
  return <label key={property.id} className={'une-v2-property'+(!enabled?' is-disabled':'')}
      title={name} data-property={property.id} data-supported={supported?'true':'false'}>
    <span className="une-v2-name">{name}</span>{editor}
  </label>;
 };
 return <div className="une-v2-ribbon" aria-label="UNE application property ribbon"
    data-component={api} data-tab={tab}>
   {UNE_RIBBON_GROUPS[tab].map(group=><section key={group} className="une-v2-group" aria-label={group}>
     <div className="une-v2-controls">
      {UNE_RIBBON_PROPERTIES.filter(prop=>prop.tab===tab&&prop.group===group).map(control)}
     </div>
     <span className="une-v2-caption">{group}</span>
   </section>)}
 </div>;
}
