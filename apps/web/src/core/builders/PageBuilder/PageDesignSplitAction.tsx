import {PanelsTopLeft} from 'lucide-react';
import {PAGE_LAYOUT_ORDER,primaryPageLayout,pageLayoutOptionLabel,type PageLayoutSummary,type PageLayoutVariantName} from './pageLayoutSummary';

type Props={
  label:string;
  summary?:PageLayoutSummary|null;
  onOpenDefault:()=>void;
  onOpenLayout:(variant:PageLayoutVariantName)=>void;
};

/** Two distinct actions: the icon opens the original design; the arrow selects a device layout.
 * The select does not save or change the page's original layout metadata. */
export default function PageDesignSplitAction({label,summary,onOpenDefault,onOpenLayout}:Props){
  const primary=primaryPageLayout(summary);
  const ordered=[primary,...PAGE_LAYOUT_ORDER.filter(variant=>variant!==primary)];
  return <span className="page-manager-design-split">
    <button className="page-manager-icon-action" type="button"
      aria-label={'Design '+label} title={'Open '+primary+' page designer'}
      onClick={onOpenDefault}><PanelsTopLeft size={16}/></button>
    <select className="page-manager-design-layout-select"
      aria-label={'Choose design layout for '+label}
      title="Choose Desktop, Mobile, Tablet or Custom layout"
      value={primary}
      onChange={event=>onOpenLayout(event.target.value as PageLayoutVariantName)}>
      {ordered.map(variant=><option key={variant} value={variant}>
        {pageLayoutOptionLabel(variant,summary)}
      </option>)}
    </select>
  </span>;
}
