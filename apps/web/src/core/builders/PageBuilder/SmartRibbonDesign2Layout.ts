import type {Design2Slot} from './uneBuilderPropertyInventory';

/** Exact Design 2 component/section matrix approved in the 2026-11-04 sheet.
 * Geometry is deliberately fixed, NOT inferred from an available property's
 * size, an array's order, or the previous contextual Design 2 SQL slots.
 * Actual values and per-component enablement still come from SQL definitions.
 *
 * Row 0 is exclusively the area dropdown + visibility eye (in SmartRibbon).
 * Rows 1–3 use C1–C6 and 26px controls, as specified.
 */
const coordinate:Record<string,{label:string;row:number;column:number;width:number;fallback:string}>={
 B:{label:'Body Color',row:1,column:1,width:40,fallback:'backgroundColor'},
 C:{label:'Border color',row:1,column:2,width:40,fallback:'borderColor'},
 P:{label:'Shape',row:1,column:3,width:40,fallback:'shapeId'},
 F:{label:'Shape Fill',row:1,column:4,width:40,fallback:'shapeFill'},
 R:{label:'Corner Radius',row:1,column:5,width:80,fallback:'radius'},
 V:{label:'Horizontal/Verical',row:1,column:6,width:40,fallback:'tabOrientation'},
 X:{label:'Focus Color',row:2,column:1,width:40,fallback:'selectedRowColor'},
 S:{label:'Shadow',row:2,column:2,width:40,fallback:'shadow'},
 H:{label:'Height',row:2,column:3,width:80,fallback:'height'},
 W:{label:'Width',row:2,column:4,width:80,fallback:'width'},
 I:{label:'Placement',row:2,column:6,width:40,fallback:'imagePlacement'},
 L:{label:'Label Color',row:3,column:1,width:40,fallback:'labelColor'},
 A:{label:'Label Alignment',row:3,column:2,width:40,fallback:'labelAlignment'},
 D:{label:'Bold',row:3,column:3,width:40,fallback:'headerBold'},
 Q:{label:'Wrap Text',row:3,column:4,width:40,fallback:'wrapText'},
 T:{label:'Text Size',row:3,column:5,width:80,fallback:'textSize'},
 J:{label:'Fill',row:3,column:6,width:40,fallback:'imageFill'}
};
type Section={area:string;flags:string};
/** Nothing is auto-packed. Missing cells stay empty at their original Cn. */
const approved:Record<string,readonly Section[]>={
 smart_button:[{area:'Body',flags:'BLSCRATHWP'}],
 smart_toggle:[{area:'Body',flags:'BSCRX'}],
 smart_lookup:[{area:'Body',flags:'BLSCRATHWPXD'}],
 smart_tabs:[{area:'Body',flags:'BLSCRATHWDV'}],
 smart_input:[{area:'Body',flags:'BLSCRATHWPFDQ'}],
 smart_text:[{area:'Body',flags:'BLSCRATHWPFD'},{area:'Header',flags:'BLSCRATHWPFD'}],
 smart_navigation:[{area:'Body',flags:'BLSCRATHWPFXDV'}],
 smart_container:[{area:'Body',flags:'BSCRHWP'}],
 smart_card_grid:[
  {area:'Body',flags:'BLSCRATHWXD'},
  {area:'Header',flags:'BLSCRATHWD'},
  {area:'Badge',flags:'BLCRATHWPD'},
  {area:'Button',flags:'BLCRATHWPDQ'},
  {area:'Image',flags:'BIJ'}],
 smart_image:[
  {area:'Body',flags:'BLSCRATHWXDQ'},
  {area:'Badge',flags:'BLCRATHWPD'},
  {area:'Image',flags:'BIJ'}],
 smart_calendar:[{area:'Body',flags:'BLSCRTHWXD'}],
 smart_cart:[
  {area:'Body',flags:'BSCRHWPF'},
  {area:'Header',flags:'BLCRATHWDQ'},
  {area:'Header Supporting',flags:'BLCRATHWD'},
  {area:'Table',flags:'BCRHWX'},
  {area:'Row',flags:'BLCATHWPFDQ'},
  {area:'Summary',flags:'BLCATHWPFDQ'},
  {area:'Footer',flags:'BLCATHWPFDQ'},
  {area:'Button',flags:'BLCRATHWPDQ'},
  {area:'Button 2',flags:'BCRHWP'},
  {area:'Button 3',flags:'BCRHWP'},
  {area:'Button 4',flags:'BCRHWP'},
  {area:'Button 5',flags:'BCRHWP'},
  {area:'Image',flags:'IJ'}],
 smart_table:[
  {area:'Body',flags:'BSCRHWPF'},
  {area:'Header',flags:'BLCRATHWDQ'},
  {area:'Row',flags:'BLCATHWPFDQ'},
  {area:'Footer',flags:'BLCATHWPFDQ'}]
};
const body:Record<string,string>={
 B:'backgroundColor',L:'labelColor',S:'shadow',C:'borderColor',R:'radius',
 A:'labelAlignment',T:'textSize',H:'height',W:'width',P:'shapeId',
 F:'shapeFill',X:'selectedRowColor',D:'headerBold',Q:'wrapText',
 I:'imagePlacement',J:'imageFill',V:'tabOrientation'
};
const areaProperties:Record<string,Record<string,string>>={
 Header:{B:'headerBodyColor',L:'headerTextColor',C:'headerBorderColor',R:'headerRadius',
  S:'headerShadow',A:'headerAlignment',T:'headerTextSize',H:'headerBoxHeight',
  W:'headerWidth',P:'headerShape',F:'headerShapeFill',D:'headerBold',Q:'wrapText'},
 'Header Supporting':{B:'supportingBackgroundColor',L:'supportingTextColor',
  C:'supportingBorderColor',R:'supportingRadius',A:'supportingAlignment',
  T:'supportingTextSize',H:'supportingBoxHeight',W:'supportingWidth',
  D:'supportingBold'},
 Table:{B:'tableBackgroundColor',C:'tableBorderColor',R:'tableRadius',
  H:'tableHeight',W:'tableWidth',X:'selectedRowColor'},
 Row:{B:'rowBackgroundColor',L:'rowLabelColor',C:'rowBorderColor',R:'rowRadius',
  A:'rowAlignment',T:'rowTextSize',H:'rowHeight',W:'rowWidth',
  P:'rowShape',F:'rowShapeFill',D:'rowBold',Q:'rowWrapText'},
 Summary:{B:'summaryBackgroundColor',L:'summaryTextColor',C:'summaryBorderColor',
  R:'summaryRadius',A:'summaryAlignment',T:'summaryTextSize',
  H:'summaryHeight',W:'summaryWidth',P:'summaryShape',F:'summaryShapeFill',
  D:'summaryTextWeight',Q:'summaryWrapText'},
 Footer:{B:'footerBackgroundColor',L:'summary2TextColor',C:'footerBorderColor',
  R:'footerRadius',A:'summary2Alignment',T:'summary2TextSize',
  H:'footerHeight',W:'footerWidth',P:'footerShape',F:'footerShapeFill',
  D:'summary2TextWeight',Q:'footerWrapText'},
 Badge:{B:'badgeBodyColor',L:'badgeTextColor',C:'badgeBorderColor',R:'badgeRadius',
  A:'badgeLabelAlignment',T:'badgeTextSize',H:'badgeHeight',W:'badgeWidth',
  P:'badgeShape',D:'badgeBold'},
 Button:{B:'cardButtonFill',L:'cardButtonTextColor',C:'cardButtonBorderColor',
  R:'cardButtonRadius',A:'cardButtonAlignment',T:'cardButtonTextSize',
  H:'cardButtonHeight',W:'cardButtonWidth',P:'cardButtonShape',
  D:'cardButtonBold',Q:'cardButtonWrapText'},
 'Button 2':{B:'qtyIncreaseFill',C:'qtyIncreaseBorderColor',R:'qtyIncreaseRadius',
  H:'qtyIncreaseHeight',W:'qtyIncreaseWidth',P:'qtyIncreaseShape'},
 'Button 3':{B:'qtyDecreaseFill',C:'qtyDecreaseBorderColor',R:'qtyDecreaseRadius',
  H:'qtyDecreaseHeight',W:'qtyDecreaseWidth',P:'qtyDecreaseShape'},
 'Button 4':{B:'customButton1Fill',C:'customButton1BorderColor',
  R:'customButton1Radius',H:'customButton1Height',W:'customButton1Width',
  P:'customButton1Shape'},
 'Button 5':{B:'customButton2Fill',C:'customButton2BorderColor',
  R:'customButton2Radius',H:'customButton2Height',W:'customButton2Width',
  P:'customButton2Shape'},
 Image:{B:'imageBackgroundColor',I:'imagePlacement',J:'imageFill'}
};
const overrides:Record<string,Record<string,Record<string,string>>>={
 smart_toggle:{Body:{X:'backgroundColor'}}, // iOS-green enabled track uses backgroundColor
 smart_lookup:{Body:{X:'lookupFocusColor'}},
 smart_tabs:{Body:{B:'tabColor',X:'selectedTabColor',H:'tabHeight',W:'tabWidth'}},
 smart_navigation:{Body:{X:'navigationFocusColor',V:'navigationDirection'}},
 smart_card_grid:{Body:{X:'selectedCardColor'},
  Button:{B:'cardButtonFill',L:'cardButtonTextColor',C:'cardButtonBorderColor',
   R:'cardButtonRadius',A:'cardButtonAlignment',T:'cardButtonTextSize',
   H:'cardButtonHeight',W:'cardButtonWidth',P:'cardButtonShape',
   D:'cardButtonBold',Q:'cardButtonWrapText'}},
 smart_image:{Body:{X:'selectedCardColor'}},
 smart_calendar:{Body:{X:'selectedDateColor'}},
 smart_cart:{Button:{B:'removeButtonFill',L:'removeButtonTextColor',
  C:'removeButtonBorderColor',R:'removeButtonRadius',
  A:'removeButtonAlignment',T:'removeButtonTextSize',H:'removeButtonHeight',
  W:'removeButtonWidth',P:'removeButtonShape',D:'removeButtonBold',
  Q:'removeButtonWrapText'}}
};
export function approvedDesign2Slots(api:string):Design2Slot[]{
 const sections=approved[api]??[];
 return sections.flatMap(({area,flags},areaIndex)=>[...flags].map(flag=>{
  const pos=coordinate[flag];
  const propertyKey=overrides[api]?.[area]?.[flag]??
   areaProperties[area]?.[flag]??body[flag];
  return {
   area,areaOrder:areaIndex+1,slotKey:pos.label,
   row:pos.row,order:pos.column,width:pos.width,height:26,
   propertyKey,fallbackKey:pos.fallback
  };
 }));
}
