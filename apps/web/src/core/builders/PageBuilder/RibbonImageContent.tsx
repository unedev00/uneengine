import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Image as ImageIcon, Upload, Images, Link2, Database, X} from 'lucide-react';
import TenantMediaPicker from '../ComponentProperties/TenantMediaPicker';
import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';

type Values=Record<string,unknown>;
type Definitions=NonNullable<LibraryComponentMetadata['propertyDefinitions']>;
/** Image Content controls use the existing tenant media API and the component's declared keys. */
export default function RibbonImageContent({properties,definitions,onChange}:{
 properties:Values;definitions:Definitions;onChange:(next:Values)=>void;
}){
 const [libraryOpen,setLibraryOpen]=useState(false);
 const [sourceMode,setSourceMode]=useState<'url'|'dynamic'>('url');
 const supports=(key:string)=>definitions.some(def=>def.propertyKey===key);
 const set=(key:string,value:unknown)=>onChange({...properties,[key]:value});
 const src=String(properties.src??'');
 const fit=definitions.find(def=>def.propertyKey==='imageFit');
 return <div className="office-ribbon-image-content" aria-label="Image content settings">
   <section className="office-ribbon-image-source" aria-label="Image source">
     <strong><ImageIcon size={17}/> Image source</strong>
     <div className="office-ribbon-image-actions">
       <button type="button" disabled={!supports('src')} onClick={()=>setLibraryOpen(true)}
         title={supports('src')?'Upload image':'Not supported by selected component'}><Upload size={16}/> Upload image</button>
       <button type="button" disabled={!supports('src')} onClick={()=>setLibraryOpen(true)}
         title={supports('src')?'Choose from tenant library':'Not supported by selected component'}><Images size={16}/> Choose from library</button>
     </div>
   </section>
   <section className="office-ribbon-image-binding" aria-label="Image URL and dynamic source">
     <div className="office-ribbon-image-source-modes">
       <button type="button" aria-pressed={sourceMode==='url'} onClick={()=>setSourceMode('url')}><Link2 size={15}/> Image URL</button>
       <button type="button" aria-pressed={sourceMode==='dynamic'} onClick={()=>setSourceMode('dynamic')}><Database size={15}/> Dynamic source</button>
     </div>
     <label>{sourceMode==='url'?'URL or selected asset':'Image binding expression'}
       <input type="text" value={src} disabled={!supports('src')} aria-label={sourceMode==='url'?'Image URL':'Dynamic image source'}
         placeholder={sourceMode==='url'?'https://… or asset reference':'@Record.Image'}
         onChange={event=>set('src',event.target.value)}/>
     </label>
   </section>
   <section className="office-ribbon-image-options" aria-label="Image presentation">
     <strong>Image settings</strong>
     <label>Image fit <select aria-label="Image fit" disabled={!fit}
       value={String(properties.imageFit??fit?.defaultValue??'cover')}
       onChange={event=>set('imageFit',event.target.value)}>
       {(fit?.choices??[]).map(choice=><option key={choice.key} value={choice.key}>{choice.label}</option>)}
     </select></label>
     <label>Alt text <input aria-label="Image alt text" type="text" disabled={!supports('alt')}
       value={String(properties.alt??'')} onChange={event=>set('alt',event.target.value)}/></label>
   </section>
   {libraryOpen&&createPortal(<div className="office-ribbon-image-picker-backdrop" role="presentation"
      onMouseDown={event=>{if(event.currentTarget===event.target)setLibraryOpen(false);}}>
     <div className="office-ribbon-image-picker-dialog" role="dialog" aria-modal="true" aria-label="Upload or choose image">
       <header><strong>Upload image / Choose from library</strong><button type="button" onClick={()=>setLibraryOpen(false)} aria-label="Close image library"><X size={18}/></button></header>
       <TenantMediaPicker value={src} initiallyOpen assetOnly onChange={value=>{set('src',value);setLibraryOpen(false);}}/>
     </div>
   </div>,document.body)}
 </div>;
}
