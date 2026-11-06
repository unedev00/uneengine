/** Render the actual published Print Template DOM to a stored, reusable PDF.
 * The print runtime already resolves record bindings and Smart Components.
 * This capture uses that renderer rather than introducing a second template engine.
 */
type Request=<T>(path:string,init?:RequestInit)=>Promise<T>;
const afterPaint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
const waitImage=(img:HTMLImageElement)=>img.complete?Promise.resolve():
 new Promise<void>((resolve,reject)=>{
  img.addEventListener('load',()=>resolve(),{once:true});
  img.addEventListener('error',()=>reject(Error('Print Template image did not load')),{once:true});
 });
async function embedImages(root:Element,copy:Element){
 const originals=[root,...root.querySelectorAll('*')];
 const copies=[copy,...copy.querySelectorAll('*')];
 for(let i=0;i<Math.min(originals.length,copies.length);i++){
  const source=originals[i],clone=copies[i];
  if(!(source instanceof HTMLImageElement)||!(clone instanceof HTMLImageElement))continue;
  await waitImage(source);
  // Read only pixels that the current user's browser is allowed to display.
  const canvas=document.createElement('canvas');
  canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
  if(canvas.width<1||canvas.height<1||canvas.width*canvas.height>20000000)
   throw Error('Image size is not suitable for PDF capture');
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Canvas is unavailable');
  ctx.drawImage(source,0,0);
  clone.src=canvas.toDataURL('image/png');
 }
}
function copyStyles(source:Element,copy:Element){
 const original=[source,...source.querySelectorAll('*')];
 const clones=[copy,...copy.querySelectorAll('*')];
 for(let i=0;i<Math.min(original.length,clones.length);i++){
  const node=original[i],clone=clones[i];
  if(node instanceof HTMLElement&&clone instanceof HTMLElement){
   const style=getComputedStyle(node);
   // Computed CSS preserves current ribbon styling without fetching stylesheets.
   for(let j=0;j<style.length;j++){
    const key=style[j];
    clone.style.setProperty(key,style.getPropertyValue(key),style.getPropertyPriority(key));
   }
   if(node instanceof HTMLInputElement&&clone instanceof HTMLInputElement)
    clone.setAttribute('value',node.value);
   if(node instanceof HTMLTextAreaElement&&clone instanceof HTMLTextAreaElement)
    clone.textContent=node.value;
   if(node instanceof HTMLCanvasElement){
    const replacement=document.createElement('img');
    replacement.src=node.toDataURL('image/png');
    replacement.style.cssText=clone.getAttribute('style')??'';
    clone.replaceWith(replacement);
   }
  }
 }
}
function asciiBytes(source:string){const bytes=new Uint8Array(source.length);
 for(let i=0;i<source.length;i++)bytes[i]=source.charCodeAt(i)&255;
 return bytes;
}
function concatBytes(...arrays:Uint8Array[]){const total=arrays.reduce((n,a)=>n+a.length,0);
 const out=new Uint8Array(total);let offset=0;
 for(const arr of arrays){out.set(arr,offset);offset+=arr.length;}
 return out;
}
/** One JPEG image per page keeps Smart Component visuals and browser-resolved
 * formulas intact. Multiple pages are explicit PDF pages, not a single huge sheet. */
export function imagesToPdf(images:readonly Uint8Array[],widthPx:number,heightPx:number):Uint8Array{
 if(images.length===0||images.length>100||widthPx<1||heightPx<1)
  throw Error('Invalid print page dimensions');
 // 96 CSS pixels = 72 PostScript points. Browser print follows CSS page sizing.
 const width=(widthPx*.75).toFixed(2),height=(heightPx*.75).toFixed(2);
 const parts:Uint8Array[]=[asciiBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
 const offsets:number[]=[0];
 let length=parts[0].length;
 const append=(chunk:Uint8Array)=>{parts.push(chunk);length+=chunk.length;};
 const object=(id:number,content:Uint8Array)=>{
  offsets[id]=length;append(asciiBytes(id+' 0 obj\n'));append(content);append(asciiBytes('\nendobj\n'));
 };
 // 1=catalog, 2=pages, 3+ triplets (page, JPEG XObject, content stream)
 object(1,asciiBytes('<< /Type /Catalog /Pages 2 0 R >>'));
 const kids=images.map((_,i)=>(3+i*3)+' 0 R').join(' ');
 object(2,asciiBytes('<< /Type /Pages /Count '+images.length+' /Kids ['+kids+'] >>'));
 for(const [i,jpeg] of images.entries()){
  const pageId=3+i*3,imageId=pageId+1,streamId=pageId+2;
  object(pageId,asciiBytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+
   '] /Resources << /XObject << /Im0 '+imageId+' 0 R >> >> /Contents '+streamId+' 0 R >>'));
  object(imageId,concatBytes(asciiBytes('<< /Type /XObject /Subtype /Image /Width '+widthPx+
   ' /Height '+heightPx+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+
   ' >>\nstream\n'),jpeg,asciiBytes('\nendstream')));
  const commands=asciiBytes('q '+width+' 0 0 '+height+' 0 0 cm /Im0 Do Q\n');
  object(streamId,concatBytes(asciiBytes('<< /Length '+commands.length+' >>\nstream\n'),commands,asciiBytes('endstream')));
 }
 const xref=length;
 append(asciiBytes('xref\n0 '+offsets.length+'\n0000000000 65535 f \n'));
 for(let i=1;i<offsets.length;i++)
  append(asciiBytes(String(offsets[i]).padStart(10,'0')+' 00000 n \n'));
 append(asciiBytes('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF'));
 return concatBytes(...parts);
}
const toBase64=(bytes:Uint8Array)=>new Promise<string>((resolve,reject)=>{
 const reader=new FileReader();
 reader.onerror=()=>reject(Error('Could not encode generated PDF'));
 reader.onload=()=>resolve(String(reader.result).split(',')[1]??'');
 reader.readAsDataURL(new Blob([bytes as BlobPart],{type:'application/pdf'}));
});
export async function createTemplatePdf(template:string,id:string,request:Request,
 openPreview:()=>Promise<void>,pageSize:{width:number;height:number}):Promise<{FileId:string;AssetRef:string}>{
 if(!pageSize.width||!pageSize.height||pageSize.width>10000||pageSize.height>10000)
  throw Error('Invalid Print Template size');
 const before=new Set(document.querySelectorAll('dialog.formula-print-preview'));
 await openPreview();
 await afterPaint();
 const dialog=[...document.querySelectorAll<HTMLDialogElement>('dialog.formula-print-preview')]
  .find(item=>!before.has(item))??[...document.querySelectorAll<HTMLDialogElement>('dialog.formula-print-preview')].at(-1);
 if(!dialog||dialog.getAttribute('aria-label')!==template)
  throw Error('Print Template did not render');
 try{
 const root=dialog.querySelector('.free-canvas-runtime')??dialog.querySelector('main')??dialog;
 const clone=root.cloneNode(true) as HTMLElement;
 copyStyles(root,clone);
 await embedImages(root,clone);
 clone.querySelectorAll('button,[data-print-hide]').forEach(item=>item.remove());
 const width=Math.round(pageSize.width),height=Math.round(pageSize.height);
 clone.style.width=width+'px';clone.style.minHeight=height+'px';
 clone.style.height='auto';clone.style.maxHeight='none';clone.style.transform='none';
 clone.style.overflow='visible';clone.style.position='relative';
 const pageCount=Math.ceil(Math.max(height,root.scrollHeight,clone.scrollHeight)/height);
 if(pageCount>100)throw Error('Print Template exceeds 100 PDF pages');
 const markup=new XMLSerializer().serializeToString(clone);
 const chunks:Uint8Array[]=[];
 for(let i=0;i<pageCount;i++){
  // Each print sheet is rendered independently to avoid huge, unsupported
  // browser canvas sizes on multi-page templates.
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'">'+
   '<foreignObject width="100%" height="100%">'+
   '<div xmlns="http://www.w3.org/1999/xhtml" style="width:'+width+'px;height:'+height+'px;overflow:hidden;position:relative">'+
   '<div style="position:relative;top:-'+(i*height)+'px">'+markup+'</div></div></foreignObject></svg>';
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{
   const image=new Image();
   await new Promise<void>((resolve,reject)=>{
    image.onload=()=>resolve();image.onerror=()=>reject(Error('Print Template could not be rasterised'));
    image.src=url;
   });
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('Canvas is unavailable');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
   ctx.drawImage(image,0,0,width,height);
   const jpeg=await new Promise<ArrayBuffer>((resolve,reject)=>{
    canvas.toBlob(async blob=>{
     if(!blob){reject(Error('Unable to encode print page'));return;}
     resolve(await blob.arrayBuffer());
    },'image/jpeg',.9);
   });
   chunks.push(new Uint8Array(jpeg));
  }finally{URL.revokeObjectURL(url);}
 }
  const contentBase64=await toBase64(imagesToPdf(chunks,width,height));
  const saved=await request<{id:string}>('/media-assets',{method:'POST',
   body:JSON.stringify({name:template+'-'+id+'.pdf',contentType:'application/pdf',contentBase64})});
  if(!saved.id)throw Error('PDF storage did not return a file ID');
  return {FileId:'asset:'+saved.id,AssetRef:'asset:'+saved.id};
 }finally{
  // The existing preview host owns the React dialog.
  dialog.querySelector<HTMLButtonElement>('button')?.click();
 }
}
