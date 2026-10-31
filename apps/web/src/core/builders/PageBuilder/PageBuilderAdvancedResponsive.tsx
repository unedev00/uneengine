import {responsiveNumberFields,responsiveOptionFields,responsiveColorFields} from '../../metadata/Definitions/metadataAppearanceSchema';
import {layoutSettings,updateLayoutSettings,type LayoutDevice,type LayoutSettingKey} from '../../pages/TemplatePageRuntime/pageComponentLayout';

/** Metadata-schema-driven editor for the existing base/device layoutStyle engine. */
export default function PageBuilderAdvancedResponsive({properties,device,onChange}:{
  properties:Record<string,unknown>;device:'Base'|LayoutDevice;
  onChange:(properties:Record<string,unknown>)=>void;
}){
  const effective=layoutSettings(properties,device==='Base'?'Desktop':device);
  const own=device==='Base'?properties.layoutStyle
    :(properties.layoutResponsive&&typeof properties.layoutResponsive==='object'
      ?(properties.layoutResponsive as Record<string,unknown>)[device]:undefined);
  const overrides=own&&typeof own==='object'&&!Array.isArray(own)?own as Record<string,unknown>:{};
  const set=(key:LayoutSettingKey,value:string|number|boolean|null)=>
    onChange(updateLayoutSettings(properties,device,key,value));
  const reset=(key:LayoutSettingKey)=><button type="button" className="btn btn-small"
    aria-label={'Reset '+key+' for '+device} title="Use inherited/default setting"
    disabled={!Object.prototype.hasOwnProperty.call(overrides,key)}
    onClick={()=>set(key,null)}>Reset</button>;
  return <div className="page-builder-advanced-responsive" aria-label={device+' responsive component layout'}>
    <p className="properties-help">Edit the selected block for {device==='Base'?'the Custom layout base':device+'.'} 
      Changes use the shared layout metadata engine and keep other device settings unchanged.</p>
    <div className="page-builder-advanced-responsive-grid">
      {responsiveNumberFields.map(field=>{
        const value=effective[field.key];
        return <label key={field.key} className="form-label">{field.label}
          <span className="page-builder-advanced-responsive-field">
            <input className="form-control" type="number" min={field.min} max={field.max}
              value={typeof value==='number'?value:''}
              onChange={event=>{
                if(event.target.value===''){set(field.key,null);return;}
                const next=Number(event.target.value);
                if(Number.isFinite(next)&&next>=field.min&&next<=field.max)set(field.key,next);
              }}/>
            {reset(field.key)}
          </span>
        </label>;
      })}
      {responsiveOptionFields.map(field=><label key={field.key} className="form-label">{field.label}
        <span className="page-builder-advanced-responsive-field">
          <select className="form-control" value={String(effective[field.key]??'')}
            onChange={event=>set(field.key,event.target.value||null)}>
            <option value="">Use default</option>
            {field.options.map(value=><option key={value} value={value}>{value}</option>)}
          </select>{reset(field.key)}
        </span>
      </label>)}
      {responsiveColorFields.map(field=><label key={field.key} className="form-label">{field.label}
        <span className="page-builder-advanced-responsive-field">
          <input className="form-control" type="color"
            value={typeof effective[field.key]==='string'&&/^#[0-9a-f]{6}$/i.test(effective[field.key] as string)
              ?String(effective[field.key]):'#ffffff'}
            onChange={event=>set(field.key,event.target.value)}/>
          {reset(field.key)}
        </span>
      </label>)}
      <label className="checkbox-row"><input type="checkbox"
        checked={effective.hidden===true} onChange={event=>set('hidden',event.target.checked)}/>
        Hide this component in the selected device layout</label>
    </div>
  </div>;
}
