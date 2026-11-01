import {responsiveNumberFields,responsiveOptionFields} from '../../metadata/Definitions/metadataAppearanceSchema';
import {layoutSettings,updateLayoutSettings,type LayoutDevice,type LayoutSettingKey} from '../../pages/TemplatePageRuntime/pageComponentLayout';

/** Metadata-schema-driven editor for the existing base/device layoutStyle engine. */
export default function PageBuilderAdvancedResponsive({properties,device,onChange}:{
  properties:Record<string,unknown>;device:'Base'|LayoutDevice;
  onChange:(properties:Record<string,unknown>)=>void;
}){
  // Base appearance is already editable in Design / Layout; only show device overrides here.
  const effective=layoutSettings(properties,device==='Base'?'Desktop':device);
  const deviceDimensions=responsiveNumberFields.filter(field=>
    ['width','height','padding','margin','gap'].includes(field.key));
  const deviceArrangement=responsiveOptionFields.filter(field=>
    ['alignItems','justifyContent','overflowY'].includes(field.key));
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
  if(device==='Base')return <div className="page-builder-advanced-responsive" aria-label="Custom base layout guidance">
    <p className="properties-help">Custom base dimensions and appearance are edited in Layout and Design.
      Choose a Desktop, Tablet or Mobile layout to edit its device-specific overrides.</p>
  </div>;
  return <div className="page-builder-advanced-responsive" aria-label={device+' responsive component layout'}>
    <p className="properties-help">Only {device} layout overrides appear here.
      Colours, borders, typography and base dimensions remain in Design / Layout.
      Reset an override to inherit the shared value.</p>
    <div className="page-builder-advanced-responsive-grid">
      {deviceDimensions.map(field=>{
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
      {deviceArrangement.map(field=><label key={field.key} className="form-label">{field.label}
        <span className="page-builder-advanced-responsive-field">
          <select className="form-control" value={String(effective[field.key]??'')}
            onChange={event=>set(field.key,event.target.value||null)}>
            <option value="">Use default</option>
            {field.options.map(value=><option key={value} value={value}>{value}</option>)}
          </select>{reset(field.key)}
        </span>
      </label>)}
      <label className="checkbox-row"><input type="checkbox"
        checked={effective.hidden===true} onChange={event=>set('hidden',event.target.checked)}/>
        Hide this component in the selected device layout</label>
    </div>
  </div>;
}
