import {useEffect} from 'react';
import type {AdvancedFeature} from './PageBuilderAdvancedRibbon';

type Option={value:string;label:string};
type Assignment={
  enabled:boolean;assigned:boolean;isDefault:boolean;role:string;app:string;
  roles:Option[];apps:Option[];
  onRole:(value:string)=>void;onApp:(value:string)=>void;
  onDefault:(value:boolean)=>void;onAdd:()=>void;
};
type Responsive={
  desktop:boolean;tablet:boolean;mobile:boolean;canAssign:boolean;
  breakpoint:number;canBreakpoint:boolean;columns:number;canColumns:boolean;
  onDevice:(factor:'Desktop'|'Tablet'|'Phone')=>void;
  onBreakpoint:(value:number)=>void;onColumns:(value:number)=>void;
};
type Properties={
  selected:boolean;apiName:string;cssClass:string;visible:boolean;
  readOnly:boolean;canReadOnly:boolean;
  onVisible:(value:boolean)=>void;onReadOnly:(value:boolean)=>void;
};
type Nesting={
  selected:boolean;accepted:boolean;canChange:boolean;parentId:string;
  parents:Option[];onAccepted:(value:boolean)=>void;onParent:(value:string)=>void;
};
type Technical={id:string;objectName:string;renderMode:string};
type Props={
  section:AdvancedFeature|null;onInspectorHost:(node:HTMLDivElement|null)=>void;
  assignment:Assignment;responsive:Responsive;properties:Properties;
  nesting:Nesting;technical:Technical;
};

/** All five Advanced groups are permanent. Applicability disables controls
 * instead of changing the ribbon structure. The shared Page Builder handlers
 * remain responsible for mutations and permissions. */
export default function PageBuilderAdvancedSections({
  onInspectorHost,assignment,responsive,properties,nesting,technical
}:Props){
  // The former Advanced editor portalled the entire inspector into the ribbon.
  // Never leave a stale portal attached after switching from another tab.
  useEffect(()=>onInspectorHost(null),[onInspectorHost]);
  return <div className="page-builder-advanced-inline" aria-label="Advanced ribbon fixed sections">
    <section className="advanced-fixed-group advanced-activation" aria-label="Activation Assignments">
      <div className="advanced-fixed-field advanced-assigned">
        <label><input type="checkbox" checked={assignment.assigned} readOnly disabled
          title="Shows whether the page has activation assignments"/>Assigned</label>
        <button type="button" disabled={!assignment.enabled} onClick={assignment.onAdd}
          title="Add an activation assignment with selected settings" aria-label="Add activation assignment">+</button>
      </div>
      <label className="advanced-fixed-field advanced-default">Default
        <input type="checkbox" checked={assignment.isDefault} disabled={!assignment.enabled}
          onChange={event=>assignment.onDefault(event.target.checked)}/>
      </label>
      <label className="advanced-fixed-field advanced-role">Role
        <select value={assignment.role} disabled={!assignment.enabled}
          onChange={event=>assignment.onRole(event.target.value)}>
          <option value="">All profiles</option>
          {assignment.roles.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="advanced-fixed-field advanced-app">App
        <select value={assignment.app} disabled={!assignment.enabled}
          onChange={event=>assignment.onApp(event.target.value)}>
          <option value="">Select app…</option>
          {assignment.apps.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <span className="advanced-fixed-caption">Activation Assignments</span>
    </section>
    <section className="advanced-fixed-group advanced-responsive" aria-label="Responsive Settings">
      {(['Desktop','Tablet','Phone'] as const).map((factor,index)=>
        <label key={factor} className={'advanced-fixed-field advanced-device advanced-device-'+index}>
          {factor==='Phone'?'Mobile':factor}
          <input type="checkbox" checked={factor==='Desktop'?responsive.desktop:
            factor==='Tablet'?responsive.tablet:responsive.mobile}
            disabled={!responsive.canAssign} onChange={()=>responsive.onDevice(factor)}/>
        </label>)}
      <label className="advanced-fixed-field advanced-breakpoint">Breakpoint
        <input type="number" min={320} max={10000} value={responsive.breakpoint}
          disabled={!responsive.canBreakpoint}
          onChange={event=>responsive.onBreakpoint(Number(event.target.value))}/>
      </label>
      <label className="advanced-fixed-field advanced-columns">Columns
        <input type="number" min={1} max={50} value={responsive.columns}
          disabled={!responsive.canColumns}
          onChange={event=>responsive.onColumns(Number(event.target.value))}/>
      </label>
      <span className="advanced-fixed-caption">Responsive Settings</span>
    </section>
    <section className="advanced-fixed-group advanced-properties" aria-label="Advanced Properties">
      <label className="advanced-fixed-field advanced-api-name">API Name
        <input value={properties.apiName} readOnly disabled title="Component API identity is immutable"/>
      </label>
      <label className="advanced-fixed-field advanced-css-class">CSS Class
        <input value={properties.cssClass} readOnly disabled
          title="Custom CSS class is not supported by the shared runtime"/>
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
      <label className="advanced-fixed-field advanced-child-types">Allowed child types
        <select disabled title="Per-container allowed child types is not supported by the shared nesting engine">
          <option>Any component</option>
        </select>
      </label>
      <label className="advanced-fixed-field advanced-max-children">Max children
        <input type="number" value="" placeholder="—" readOnly disabled
          title="Maximum child count is not supported by the shared nesting engine"/>
      </label>
      <label className="advanced-fixed-field advanced-parent">Parent container
        <select value={nesting.parentId} disabled={!nesting.selected}
          onChange={event=>nesting.onParent(event.target.value)}>
          <option value="">Canvas root</option>
          {nesting.parents.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <span className="advanced-fixed-caption">Component Nesting</span>
    </section>
    <section className="advanced-fixed-group advanced-technical" aria-label="Technical Details">
      <label className="advanced-fixed-field advanced-component-id">Component ID
        <input value={technical.id} readOnly disabled/>
      </label>
      <label className="advanced-fixed-field advanced-object">Object
        <input value={technical.objectName} readOnly disabled/>
      </label>
      <label className="advanced-fixed-field advanced-render-mode">Render mode
        <input value={technical.renderMode} readOnly disabled/>
      </label>
      <span className="advanced-fixed-caption">Technical Details</span>
    </section>
  </div>;
}
