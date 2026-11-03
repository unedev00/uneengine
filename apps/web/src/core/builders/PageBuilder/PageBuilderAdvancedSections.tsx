import {useEffect} from 'react';
import type {AdvancedFeature} from './PageBuilderAdvancedRibbon';

type Option={value:string;label:string};
type Assignment={
  enabled:boolean;assigned:boolean;isDefault:boolean;
  onAdd:()=>void;
};
type Properties={
  selected:boolean;apiName:string;instanceName:string;visible:boolean;
  onInstanceName:(value:string)=>void;
  readOnly:boolean;canReadOnly:boolean;
  onVisible:(value:boolean)=>void;onReadOnly:(value:boolean)=>void;
};
type Nesting={
  accepted:boolean;canChange:boolean;onAccepted:(value:boolean)=>void;
};
type Technical={id:string};
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
      <label className="advanced-fixed-field advanced-instance-name">Component Name
        <input aria-label="Component Name" value={properties.instanceName}
          maxLength={80} disabled={!properties.selected}
          onChange={event=>properties.onInstanceName(event.target.value)}/>
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
      <label className="advanced-fixed-field advanced-component-id">Component ID
        <input value={technical.id} readOnly disabled/>
      </label>
      <span className="advanced-fixed-caption">Technical Details</span>
    </section>
  </div>;
}
