import assert from 'node:assert/strict';
import test from 'node:test';
import {pageAppMembership,pageIsUnassigned} from '../src/core/builders/PageBuilder/pageAppMembership';

test('app tabs derive memberships from navigation and activation metadata',()=>{
 const apps=[
  {apiName:'Alpha',navigationPageApiNames:['Shared','AlphaPage'],navigationOrder:[]},
  {apiName:'Beta',navigationPageApiNames:[],navigationOrder:[{type:'App Page' as const,apiName:'BetaPage'}]}
 ];
 const pages=[
  {apiName:'Shared',activationAssignments:[{appId:'Beta'}]},
  {apiName:'AlphaPage',activationAssignments:[]},
  {apiName:'BetaPage',activationAssignments:[]},
  {apiName:'Unassigned',activationAssignments:[]}
 ];
 const memberships=pageAppMembership(apps,pages as never);
 assert.deepEqual([...memberships.get('Alpha')!].sort(),['AlphaPage','Shared']);
 assert.deepEqual([...memberships.get('Beta')!].sort(),['BetaPage','Shared']);
 assert.equal(pageIsUnassigned('Unassigned',memberships),true);
 assert.equal(pageIsUnassigned('Shared',memberships),false);
});
test('uninstalled applications do not create tabs',()=>{
 const memberships=pageAppMembership([], [{apiName:'Orphan',activationAssignments:[{appId:'Removed'}]}] as never);
 assert.equal(pageIsUnassigned('Orphan',memberships),true);
});
