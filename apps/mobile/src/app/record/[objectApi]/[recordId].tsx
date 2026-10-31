import React,{useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,ScrollView,Text,View} from 'react-native';
import {Stack,useLocalSearchParams,Redirect,useRouter} from 'expo-router';
import {useMobileSession} from '../../../lib/MobileSessionProvider';
import {useMobileTheme} from '../../../lib/mobileTheme';
import {RecordDetailPanel} from '../../../lib/RecordDetailPanel';
import {loadLiveRecord,loadRecordForm,type NativeRecord} from '../../../lib/recordFormApi';

export default function RecordDetailScreen(){
 const {objectApi,recordId}=useLocalSearchParams<{objectApi:string;recordId:string}>();
 const {session,initializing,records,connection}=useMobileSession(),t=useMobileTheme(),router=useRouter();
 const [live,setLive]=useState<NativeRecord|null>(null);
 const [labels,setLabels]=useState<Record<string,string>>({}),[canEdit,setCanEdit]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!session||connection!=='online'||!objectApi||!recordId)return;
  let active=true;setLoading(true);
  void Promise.all([loadLiveRecord(session,objectApi,recordId),loadRecordForm(session,objectApi)])
   .then(([record,form])=>{if(active){setLive(record);setCanEdit(form.canEdit);
     setLabels(Object.fromEntries(form.fields.map(field=>[field.apiName,field.label])));setError('');}})
   .catch(e=>{if(active){setLive(null);setCanEdit(false);setLabels({});setError(e instanceof Error?e.message:String(e));}})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[session,connection,objectApi,recordId]);
 const item=useMemo(()=>records.find(x=>x.objectApi===objectApi&&x.recordId===recordId),[records,objectApi,recordId]);
 if(!initializing&&!session)return <Redirect href="/sign-in"/>;
 const record=live??item?.record??null;
 const heading=String(record?.Name??record?.Subject??record?.Title??item?.record?.Name??objectApi);
 return <>
  <Stack.Screen options={{title:heading}}/>
  <ScrollView style={{flex:1,backgroundColor:t.background}} contentContainerStyle={{padding:15,gap:17,paddingBottom:44}}>
   {loading?<ActivityIndicator color={t.accent}/>:null}
   {error?<Text accessibilityRole="alert" style={{color:t.negative}}>{error}</Text>:null}
   {!record?<View style={{backgroundColor:t.surface,borderRadius:13,padding:20}}>
    <Text style={{fontSize:16,color:t.secondary}}>Record not found in the offline cache. Sync to refresh your briefcase.</Text>
   </View>:<RecordDetailPanel objectApi={objectApi??''} record={record} labels={labels}
      syncedAt={item?.syncedAt} live={Boolean(live)} online={connection==='online'} canEdit={canEdit}
      onEdit={()=>router.push({pathname:'/record/edit/[objectApi]/[recordId]',params:{objectApi:objectApi||'',recordId:recordId||''}})} />}
  </ScrollView>
 </>;
}
