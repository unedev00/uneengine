/** Resolve text-property bindings against the already authorised record supplied to the component.
 * Never eval expressions, traverse dotted paths or fetch fields outside the runtime record. */
function isFieldTextExpression(value: string): boolean {
  const input = value.trim();
  return input.startsWith('@') || /^"(?:[^"]|"")*"\s*&\s*@/.test(input);
}

export function resolveFieldText(expression:unknown,record:unknown):unknown {
  if(typeof expression!=='string'||!isFieldTextExpression(expression))return expression;
  if(expression.length>2048)return '';
  const source=record&&typeof record==='object'&&!Array.isArray(record)?record as Record<string,unknown>:{};
  const input=expression.trim();
  const tokens:string[]=[];
  let index=0;
  let expectValue=true;
  while(index<input.length&&tokens.length<64){
    while(index<input.length&&/\s/.test(input[index]))index++;
    if(index===input.length)break;
    if(!expectValue){if(input[index]!=='&')return '';index++;expectValue=true;continue;}
    if(input[index]==='@'){
      const match=/^@([A-Za-z][A-Za-z0-9_]*)/.exec(input.slice(index));
      if(!match)return '';
      const raw=Object.prototype.hasOwnProperty.call(source,match[1])?source[match[1]]:undefined;
      tokens.push(raw==null?'':String(raw));index+=match[0].length;
    }else if(input[index]==='"'){
      index++;let literal='',closed=false;
      while(index<input.length){const ch=input[index++];if(ch==='"'){if(input[index]==='"'){literal+='"';index++;}else{closed=true;break;}}else literal+=ch;}
      if(!closed)return '';tokens.push(literal);
    }else return '';
    expectValue=false;
  }
  return expectValue||index<input.length?'':tokens.join('');
}

export function resolveRegisteredTextProperties(definitions:ReadonlyArray<{propertyKey:string;kind:string}>,properties:Record<string,unknown>):Record<string,unknown>{
  const record=properties.record??properties.currentRecord??properties.recordData;
  if(!record||typeof record!=='object'||Array.isArray(record))return properties;
  let next=properties;
  for(const definition of definitions){
    if(!['TEXT','LONG_TEXT','TEXTAREA','STRING'].includes(definition.kind))continue;
    const value=properties[definition.propertyKey];
    if(typeof value!=='string'||!isFieldTextExpression(value))continue;
    if(next===properties)next={...properties};
    next[definition.propertyKey]=resolveFieldText(value,record);
  }
  return next;
}
