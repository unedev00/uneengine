import assert from 'node:assert/strict';
import test from 'node:test';
import {standardListQuery} from '../src/core/pages/PageRuntime/standardListQuery';

test('PB23 saved view query delegates filters and scope to the authorised server',()=>{
 const query=standardListQuery({limit:25,offset:50,search:'  Test  ',sort:'',
  direction:'asc',savedViewId:'view-123'});
 const params=new URLSearchParams(query);
 assert.equal(params.get('viewId'),'view-123');
 assert.equal(params.get('search'),'Test');
 assert.equal(params.get('offset'),'50');
 assert.equal(params.has('filters'),false);
 assert.equal(params.has('scope'),false);
});
test('PB23 related record filter and sorting persist through saved view queries',()=>{
 const params=new URLSearchParams(standardListQuery({limit:50,offset:0,search:'',
  sort:'Name',direction:'desc',recordFilter:{field:'ParentId',recordId:'abc'},
  savedViewId:'xyz'}));
 assert.equal(params.get('relatedField'),'ParentId');
 assert.equal(params.get('relatedId'),'abc');
 assert.equal(params.get('sortField'),'Name');
 assert.equal(params.get('sortDirection'),'desc');
});

test('PB10 independent related list applies both relationship and server-side filter',()=>{
 const params=new URLSearchParams(standardListQuery({limit:10,offset:20,search:'',
  sort:'Name',direction:'desc',recordFilter:{field:'AccountId',recordId:'parent'},
  extraFilter:{field:'Status',value:'Open',operator:'Equals'}}));
 assert.equal(params.get('relatedField'),'AccountId');
 assert.equal(params.get('relatedId'),'parent');
 assert.equal(params.get('filterField'),'Status');
 assert.equal(params.get('filterValue'),'Open');
 assert.equal(params.get('filterOperator'),'Equals');
 assert.equal(params.get('offset'),'20');
});
