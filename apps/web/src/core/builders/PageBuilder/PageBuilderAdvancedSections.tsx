import {useEffect,useState} from 'react';
import type {AdvancedFeature} from './PageBuilderAdvancedRibbon';

type Option={value:string;label:string};
type Assignment={
  enabled:boolean;assigned:boolean;isDefault:boolean;
  onAdd:()=>void;
};
type Properties={
  selected:boolean;apiName:string;instanceName:string;visible:boolean;
  onInstanceName:(value:string)=>void;
  validateInstanceName:(value:string)=>string|null;
  readOnly:boolean;canReadOnly:boolean;
  onVisible:(value:boolean)=>void;onReadOnly:(value:boolean)=>void;
};
type Nesting={
  accepted:boolean;canChange:boolean;onAccepted:(value:boolean)=>void;
};
type Technical={selected:boolean;editable:boolean};
type Props={
  section:AdvancedFeature|null;onInspectorHost:(node:HTMLDivElement|null)=>void;
  assignment:Assignment;properties:Properties;nesting:Nesting;technical:Technical;
};

/** Advanced contains only component controls and a link to page activation.
 * Page device eligibility belongs to Edit Page; component columns and custom
 * viewport breakpoints retain their dedicated metadata editors. */
export default function PageBuilderAdvancedSections({
  onInspectorHost,assignment,properties,nesting,technical
}:Props){
  // The former Advanced editor portalled the entire inspector into the ribbon.
  // Never leave a stale portal attached after switching from another tab.
  useEffect(()=>onInspectorHost(null),[onInspectorHost]);
  const [nameDraft,setNameDraft]=useState(properties.instanceName);
  useEffect(()=>setNameDraft(properties.instanceName),[properties.instanceName]);
  const [nameTouched,setNameTouched]=useState(false);
  useEffect(()=>setNameTouched(false),[properties.instanceName]);
  const nameError=technical.selected&&nameDraft!==properties.instanceName
    ?properties.validateInstanceName(nameDraft):null;
  const commitComponentName=()=>{
    if(!technical.editable||nameDraft===properties.instanceName)return;
    setNameTouched(true);
    if(nameError)return;
    properties.onInstanceName(nameDraft.trim());
  };
  return <div className="page-builder-advanced-inline" aria-label="Advanced ribbon fixed sections">
    {assignment.enabled&&<section className="advanced-fixed-group advanced-activation" aria-label="Activation Assignments">
      <div className="advanced-fixed-field advanced-assigned">
        <label><input type="checkbox" checked={assignment.assigned} readOnly disabled
          title="Shows whether the page has activation assignments"/>Assigned</label>
        <button type="button" disabled={!assignment.enabled} onClick={assignment.onAdd}
          title="Edit activation assignments in Page Properties" aria-label="Edit activation assignments">Edit</button>
      </div>
      <label className="advanced-fixed-field advanced-default">Default
        <input type="checkbox" checked={assignment.isDefault} readOnly disabled
          title="Default assignment status is edited in Page Properties"/>
      </label>
      <span className="advanced-fixed-caption">Activation Assignments</span>
    </section>}
    <section className="advanced-fixed-group advanced-properties" aria-label="Advanced Properties">
      <label className="advanced-fixed-field advanced-api-name">API Name
        <input value={properties.apiName} readOnly disabled title="Component API identity is immutable"/>
      </label>
      <label className="advanced-fixed-field advanced-visible">Visible
        <input type="checkbox" checked={properties.visible} disabled={!properties.selected}
          onChange={event=>properties.onVisible(event.target.checked)}/>
      </label>
      <label className="advanced-fixed-field advanced-readonly">Readonly
        <input type="checkbox" checked={properties.readOnly} disabled={!properties.canReadOnly}
          onChange={event=>properties.onReadOnly(event.target.checked)}/>
      </label>
      <span className="advanced-fixed-caption">Advanced Properties</span>
    </section>
    <section className="advanced-fixed-group advanced-nesting" aria-label="Component Nesting">
      <label className="advanced-fixed-field advanced-accept">Accept nested components
        <input type="checkbox" checked={nesting.accepted}
          disabled={!nesting.canChange} onChange={event=>nesting.onAccepted(event.target.checked)}/>
      </label>
      <span className="advanced-fixed-caption">Component Nesting</span>
    </section>
    <section className="advanced-fixed-group advanced-technical" aria-label="Technical Details">
      <label className="advanced-fixed-field advanced-component-id">Component Name
        <input aria-label="Component Name" value={nameDraft} maxLength={80}
          disabled={!technical.editable} spellCheck={false}
          aria-invalid={!!nameError} aria-describedby={nameError?'component-name-validation':undefined}
          title="Unique editable component name used for Page Builder CSV import/export. Internal IDs remain unchanged."
          onChange={event=>{setNameDraft(event.target.value);setNameTouched(true);}}
          onBlur={commitComponentName}
          onKeyDown={event=>{
            if(event.key==='Enter'){event.preventDefault();commitComponentName();}
            if(event.key==='Escape'){event.preventDefault();setNameDraft(properties.instanceName);setNameTouched(false);}
          }}/>
      </label>
      {nameError&&nameTouched&&<span id="component-name-validation" role="alert"
        className="advanced-component-id-error">{nameError}</span>}
      <span className="advanced-fixed-caption">Technical Details</span>
    </section>
  </div>;
}
