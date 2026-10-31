import {Eye, Workflow, Smartphone, Boxes, Move, ListChecks, ShieldCheck, SlidersHorizontal, Play} from 'lucide-react';
import './PageBuilderAdvancedRibbon.css';

export type AdvancedFeature =
  | 'visibility' | 'actions' | 'responsive' | 'nesting' | 'canvas'
  | 'recordPage' | 'assignments' | 'properties' | 'preview';

type Feature={key:AdvancedFeature;label:string;hint:string;scope:'component'|'canvas'|'record'|'page';icon:typeof Eye};
const groups: Array<{label:string;features:Feature[]}> = [
  {label:'Component',features:[
    {key:'visibility',label:'Conditional visibility',hint:'Show or hide a component using device or record conditions',scope:'component',icon:Eye},
    {key:'actions',label:'Advanced actions',hint:'Flows, navigation, page state, filters and event mappings',scope:'component',icon:Workflow},
    {key:'responsive',label:'Responsive settings',hint:'Edit the active device layout and component responsive properties',scope:'component',icon:Smartphone},
    {key:'nesting',label:'Component nesting',hint:'Set the parent container and configure nested blocks',scope:'component',icon:Boxes},
    {key:'properties',label:'Advanced properties',hint:'Open all existing component configuration controls',scope:'component',icon:SlidersHorizontal}
  ]},
  {label:'Canvas',features:[
    {key:'canvas',label:'Canvas tools',hint:'Group, ungroup, align, distribute and order selected blocks',scope:'canvas',icon:Move}
  ]},
  {label:'Page',features:[
    {key:'recordPage',label:'Record page settings',hint:'Dynamic Forms, related lists, record buttons and links',scope:'record',icon:ListChecks},
    {key:'assignments',label:'Activation assignments',hint:'Choose where record and home pages appear',scope:'page',icon:ShieldCheck},
    {key:'preview',label:'Interactive preview',hint:'Turn interaction preview on or off',scope:'page',icon:Play}
  ]}
];
export const advancedFeatureLabels:Record<AdvancedFeature,string>=Object.fromEntries(
  groups.flatMap(group=>group.features.map(feature=>[feature.key,feature.label]))
) as Record<AdvancedFeature,string>;

export default function PageBuilderAdvancedRibbon({selected,recordPage,freeCanvas,preview,onOpen}:{
  selected:boolean;recordPage:boolean;freeCanvas:boolean;preview:boolean;
  onOpen:(feature:AdvancedFeature)=>void;
}){
  return <div className="page-builder-advanced-ribbon" aria-label="Advanced Page Builder tools">
    {groups.map(group=><section key={group.label} className="page-builder-advanced-group">
      <div className="page-builder-advanced-buttons">
        {group.features.map(feature=>{
          const disabled=feature.scope==='component'&&!selected
            ||feature.scope==='canvas'&&(!selected||!freeCanvas)
            ||feature.scope==='record'&&!recordPage;
          const Icon=feature.icon;
          return <button key={feature.key} type="button" disabled={disabled}
            aria-label={feature.label} title={disabled
              ?feature.scope==='record'?'Available on Record Pages only'
                :feature.scope==='canvas'?'Select a block on a free canvas'
                :'Select a component first'
              :feature.hint} aria-pressed={feature.key==='preview'?preview:undefined}
            onClick={()=>onOpen(feature.key)}><Icon size={15} aria-hidden="true"/>
            <span>{feature.key==='preview'&&preview?'Exit interactive preview':feature.label}</span></button>;
        })}
      </div><span className="page-builder-advanced-heading">{group.label}</span>
    </section>)}
  </div>;
}
