import {useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import ComponentPresentationProperties from '../ComponentProperties/ComponentPresentationProperties';

/** Render every declared metadata setting without growing or scrolling the ribbon. */
export default function PageBuilderRibbonMetadataPager({definitions,properties,onChange,windowSize=3}:{
  definitions:NonNullable<LibraryComponentMetadata['propertyDefinitions']>;
  properties:Record<string,unknown>;
  onChange:(next:Record<string,unknown>)=>void;
  windowSize?:number;
}) {
  const [index,setIndex]=useState(0);
  if(!definitions.length)return null;
  const start=Math.min(index,Math.max(0,definitions.length-windowSize));
  const page=definitions.slice(start,start+windowSize);
  return <div className="office-ribbon-metadata-pager">
    {definitions.length>windowSize&&<button className="office-ribbon-icon-button" type="button" title="Previous properties" aria-label="Previous properties" disabled={!start}
      onClick={()=>setIndex(Math.max(0,start-windowSize))}><ChevronLeft size={16}/></button>}
    <ComponentPresentationProperties definitions={page} properties={properties} onChange={onChange}/>
    {definitions.length>windowSize&&<button className="office-ribbon-icon-button" type="button" title="Next properties" aria-label="Next properties" disabled={start+windowSize>=definitions.length}
      onClick={()=>setIndex(start+windowSize)}><ChevronRight size={16}/></button>}
  </div>;
}
