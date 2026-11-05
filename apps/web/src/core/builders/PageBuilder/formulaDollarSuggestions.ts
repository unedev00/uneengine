import type {PageStateChoice} from './pageStateChoices';

/** Shared Formula Bar references use the existing runtime contract:
 * @Field = Object data, $state.key = declared page state,
 * $session = current page session ID, $tenant.name / $tenant.logo = the
 * signed-in tenant's Company Settings brand. No credentials or global storage.
 */
export type DollarFormulaSuggestion={reference:string;label:string};
export function formulaDollarSuggestions(
 choices:readonly PageStateChoice[],query=''
):DollarFormulaSuggestion[]{
 const suggestions:DollarFormulaSuggestion[]=[
  {reference:'$session',label:'Current page session ID'},
  {reference:'$tenant.name',label:'Company name (Company Settings)'},
  {reference:'$tenant.logo',label:'Company logo (Company Settings)'}
 ];
 const unique=new Set<string>();
 for(const choice of choices){
  if(choice.source!=='PageState'
   ||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(choice.key)
   ||unique.has(choice.key))continue;
  unique.add(choice.key);
  suggestions.push({reference:'$state.'+choice.key,label:choice.label+' · Page State'});
 }
 const match='$'+query.toLowerCase();
 return suggestions.filter(item=>item.reference.toLowerCase().includes(match)
   ||item.label.toLowerCase().includes(query.toLowerCase())).slice(0,200);
}
