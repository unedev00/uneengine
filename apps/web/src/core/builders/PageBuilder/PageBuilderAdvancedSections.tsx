import type {ReactNode} from 'react';
import type {AdvancedFeature} from './PageBuilderAdvancedRibbon';

/** Inline Page Builder sections: the existing inspector remains the only
 * writer for activation assignments and advanced component properties. */
export default function PageBuilderAdvancedSections({
  section,onSelect,selected,recordPage,appPage,onInspectorHost,children
}:{
  section:AdvancedFeature|null;
  onSelect:(section:AdvancedFeature)=>void;
  selected:boolean;
  recordPage:boolean;
  appPage:boolean;
  onInspectorHost:(element:HTMLDivElement|null)=>void;
  children?:ReactNode;
}){
  return <div className="page-builder-advanced-inline" aria-label="Advanced settings">
    <div className="page-builder-advanced-inline-nav" role="group" aria-label="Advanced sections">
      <button type="button" aria-pressed={section==='assignments'}
        onClick={()=>onSelect('assignments')}>Activation assignments</button>
      <button type="button" disabled={!selected} aria-pressed={section==='properties'}
        onClick={()=>onSelect('properties')}>Advanced properties</button>
      <button type="button" disabled={!selected} aria-pressed={section==='nesting'}
        onClick={()=>onSelect('nesting')}>Component nesting</button>
      <button type="button" disabled={!selected} aria-pressed={section==='responsive'}
        onClick={()=>onSelect('responsive')}>Responsive settings</button>
      {recordPage&&<button type="button" aria-pressed={section==='recordPage'}
        onClick={()=>onSelect('recordPage')}>Record page settings</button>}
    </div>
    <div className="page-builder-advanced-inline-body">
      {(section==='assignments'||section==='properties'||section==='recordPage')&&
        <div className="office-ribbon-inspector-host page-builder-advanced-inline-host"
          ref={onInspectorHost} aria-label={section==='assignments'?'Activation assignments':
            section==='recordPage'?'Record page settings':'Advanced properties'}/>}
      {section==='assignments'&&appPage&&
        <p className="properties-help">App Pages use app navigation; activation assignments apply to Home and Record Pages.</p>}
      {section==='properties'&&!selected&&
        <p className="properties-help">Select a component to edit its advanced properties.</p>}
      {(section==='responsive'||section==='properties'||section==='nesting')&&children}
    </div>
  </div>;
}
