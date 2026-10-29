/** Shared UNE browser field-expression evaluator.
 * Uses the same @record references, arithmetic/concatenation precedence and
 * quoted literals as the OneEngine/Flow formula grammar. It extends the
 * existing OneFieldExpression runtime; no eval or arbitrary JavaScript.
 */
const text=v=>v==null?'':String(v);
const numeric=v=>{const n=typeof v==='number'?v:typeof v==='string'&&v.trim()?Number(v):NaN;
 if(!Number.isFinite(n))throw Error('Expected a finite number');return n;};
const tokenize=src=>{
 const t=[];let i=0;
 while(i<src.length){
  if(/\s/.test(src[i])){i++;continue;}
  const match=/^@([A-Za-z][A-Za-z0-9_]*)/.exec(src.slice(i));
  if(match){t.push({kind:'field',value:match[1]});i+=match[0].length;continue;}
  if(src[i]==='"'){
   i++;let raw='',closed=false;
   while(i<src.length){const ch=src[i++];
    if(ch==='"'){if(src[i]==='"'){raw+='"';i++;}else{closed=true;break;}}
    else raw+=ch;
   }
   if(!closed)throw Error('Unterminated string');
   t.push({kind:'string',value:raw});continue;
  }
  const num=/^(?:\d+(?:\.\d*)?|\.\d+)/.exec(src.slice(i));
  if(num){t.push({kind:'number',value:Number(num[0])});i+=num[0].length;continue;}
  const name=/^[A-Za-z][A-Za-z0-9_]*/.exec(src.slice(i));
  if(name){t.push({kind:'name',value:name[0]});i+=name[0].length;continue;}
  if('+-*/&(),'.includes(src[i])){t.push({kind:'symbol',value:src[i++]});continue;}
  throw Error('Invalid formula token');
 }
 if(t.length>256)throw Error('Too many expression terms');
 return t;
};
const precedence={'&':1,'+':2,'-':2,'*':3,'/':3};
function evaluateTokens(tokens,record){
 let i=0,steps=0;
 const primary=()=>{
  if(++steps>512)throw Error('Formula complexity exceeded');
  const token=tokens[i++];if(!token)throw Error('Missing operand');
  if(token.value==='('){const v=expression(0);if(tokens[i++]?.value!==')')throw Error('Unclosed parenthesis');return v;}
  if(token.value==='-')return -numeric(primary());
  if(token.value==='+')return numeric(primary());
  if(token.kind==='string'||token.kind==='number')return token.value;
  if(token.kind==='field'){
   // Restrict lookup to a record's own properties (never prototypes).
   return record&&Object.prototype.hasOwnProperty.call(record,token.value)
    ? record[token.value]??'':'';
  }
  if(token.kind==='name'){
   const name=token.value,fn=name.toUpperCase();
   if(tokens[i]?.value==='('){
    i++;const args=[];
    if(tokens[i]?.value!==')')do{args.push(expression(0));
     if(tokens[i]?.value!==',')break;i++;}while(args.length<16);
    if(tokens[i++]?.value!==')')throw Error('Invalid formula function');
    if(fn==='TEXT'&&args.length===1)return text(args[0]);
    if(fn==='VALUE'&&args.length===1)return numeric(args[0]);
    if(fn==='UPPER'&&args.length===1)return text(args[0]).toUpperCase();
    if(fn==='LOWER'&&args.length===1)return text(args[0]).toLowerCase();
    if(fn==='LEN'&&args.length===1)return text(args[0]).length;
    if(fn==='ROUND'&&args.length>=1&&args.length<=2)return Number(numeric(args[0]).toFixed(Math.max(0,Math.min(8,Number(args[1]??0)))));
    if(fn==='IF'&&args.length===3)return args[0]?args[1]:args[2];
    throw Error('Unsupported formula function');
   }
   if(fn==='TRUE')return true;if(fn==='FALSE')return false;
   return name; // unquoted natural text remains literal text.
  }
  throw Error('Invalid formula syntax');
 };
 const expression=min=>{
  let left=primary();
  while(i<tokens.length){
   const op=tokens[i].value,prec=precedence[op];
   if(prec===undefined||prec<min)break;
   i++;const right=expression(prec+1);
   if(op==='&')left=text(left)+text(right);
   else if(op==='+')left=numeric(left)+numeric(right);
   else if(op==='-')left=numeric(left)-numeric(right);
   else if(op==='*')left=numeric(left)*numeric(right);
   else if(op==='/'){const n=numeric(right);if(n===0)throw Error('Division by zero');left=numeric(left)/n;}
  }
  return left;
 };
 const result=expression(0);if(i!==tokens.length)throw Error('Unexpected term');
 return text(result);
}
export function evaluateFieldExpression(expression,record){
 if(typeof expression!=='string'||expression.length>2048)return '';
 const input=expression.trim();if(!input)return '';
 // Plain text is just plain text, including spaces and punctuation.
 if(!/@[A-Za-z]/.test(input)&&!/[&+*/]/.test(input)&&!/\s-\s/.test(input)
   &&!/^["(0-9]/.test(input))return expression;
 try{return evaluateTokens(tokenize(input),record);}catch{return '';}
}
