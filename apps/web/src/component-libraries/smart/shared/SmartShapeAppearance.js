/** Shared shape appearance for Smart controls; saved SQL metadata chooses the shape ID. */
const polygons={
 'shape:triangle':'50% 4%,96% 96%,4% 96%',
 'shape:diamond':'50% 2%,98% 50%,50% 98%,2% 50%',
 'shape:pentagon':'50% 2%,94% 39%,77% 98%,23% 98%,6% 39%',
 'shape:hexagon':'25% 2%,75% 2%,98% 50%,75% 98%,25% 98%,2% 50%',
 'shape:cross':'34% 2%,66% 2%,66% 34%,98% 34%,98% 66%,66% 66%,66% 98%,34% 98%,34% 66%,2% 66%,2% 34%,34% 34%',
 'shape:arrow-right':'4% 32%,54% 32%,54% 12%,98% 50%,54% 88%,54% 68%,4% 68%',
 'shape:arrow-left':'96% 32%,46% 32%,46% 12%,2% 50%,46% 88%,46% 68%,96% 68%',
 'shape:arrow-up':'32% 96%,32% 46%,12% 46%,50% 2%,88% 46%,68% 46%,68% 96%',
 'shape:arrow-down':'32% 4%,32% 54%,12% 54%,50% 98%,88% 54%,68% 54%,68% 4%',
 'shape:decision':'50% 2%,98% 50%,50% 98%,2% 50%',
 'shape:document':'12% 4%,88% 4%,88% 76%,68% 69%,50% 80%,32% 91%,12% 76%',
 'shape:star':'50% 3%,62% 37%,96% 37%,70% 59%,80% 96%,50% 75%,20% 96%,30% 59%,4% 37%,38% 37%',
 'shape:banner':'8% 4%,92% 4%,92% 96%,50% 76%,8% 96%'
};
export const isSmartIconShape=id=>typeof id==='string'&&id!==''&&!id.startsWith('shape:');
export const isSmartLineShape=id=>['shape:line','shape:arrow-line','shape:elbow','shape:curve'].includes(id);
export function smartShapeAppearance(id,radius=12){
 const base={borderRadius:radius};
 if(id==='shape:oval')return {borderRadius:'50%'};
 if(id==='shape:round-rectangle')return {borderRadius:Math.max(14,Number(radius)||12)};
 if(polygons[id])return {borderRadius:0,clipPath:'polygon('+polygons[id]+')'};
 // Line shapes remain visible as editable glyphs instead of clipping form controls.
 return base;
}
