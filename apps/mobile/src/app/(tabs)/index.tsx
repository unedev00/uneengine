import React,{useMemo,useState} from 'react';
import {FlatList,RefreshControl,Text,View,Pressable,ScrollView,useWindowDimensions} from 'react-native';
import {Tabs,Redirect,useRouter} from 'expo-router';
import {useMobileSession} from '../../lib/MobileSessionProvider';
import {useMobileTheme} from '../../lib/mobileTheme';
import {ConnectionBadge,MobileMessages,OfflineBanner} from '../../lib/MobileUI';
import {RecordRow} from '../../lib/RecordRow';
import {RecordDetailPanel} from '../../lib/RecordDetailPanel';

export default function RecordsScreen(){
 const {session,initializing,records,connection,syncing,sync,error,notice}=useMobileSession();
 const t=useMobileTheme(),router=useRouter(),{width}=useWindowDimensions();
 const [selectedKey,setSelectedKey]=useState('');
 const isTablet=width>=780;
 const sorted=useMemo(()=>[...records].sort((a,b)=>a.objectApi.localeCompare(b.objectApi)||
  String(a.record.Name??a.recordId).localeCompare(String(b.record.Name??b.recordId))),[records]);
 const selected=useMemo(()=>sorted.find(item=>item.objectApi+':'+item.recordId===selectedKey)
  ??(isTablet?sorted[0]:undefined),[sorted,selectedKey,isTablet]);
 if(!initializing&&!session)return <Redirect href="/sign-in"/>;
 return <>
  <Tabs.Screen options={{title:'Records',
    headerRight:()=> <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
    {connection==='online'&&<Pressable accessibilityRole="button" accessibilityLabel="Create new record"
      onPress={()=>router.push('/record/new')} style={{paddingHorizontal:11,minHeight:44,justifyContent:'center'}}>
      <Text style={{fontSize:28,color:t.accent}}>＋</Text></Pressable>}
    <ConnectionBadge online={connection==='online'}/></View>}}/>
  <View style={{flex:1,flexDirection:isTablet?'row':'column',backgroundColor:t.background}}>
   <View style={{flex:isTablet?undefined:1,width:isTablet?Math.min(380,Math.max(290,width*.38)):undefined,
       borderRightWidth:isTablet?.5:0,borderRightColor:t.separator}}>
    <FlatList data={sorted} keyExtractor={item=>item.objectApi+':'+item.recordId}
     style={{flex:1,backgroundColor:t.background}} initialNumToRender={12} maxToRenderPerBatch={20}
     removeClippedSubviews={false}
     contentContainerStyle={{paddingHorizontal:isTablet?8:14,paddingBottom:30,paddingTop:14}}
     refreshControl={<RefreshControl refreshing={syncing} onRefresh={()=>void sync()} tintColor={t.accent}/>}
     ListHeaderComponent={<View style={{gap:8,marginBottom:12,paddingHorizontal:isTablet?8:0}}>
       <Text style={{color:t.text,fontSize:isTablet?24:34,fontWeight:'700'}}>Records</Text>
       <Text style={{color:t.secondary,fontSize:15}}>{records.length} cached records</Text>
       {connection==='offline'&&<OfflineBanner syncedAt={records[0]?.syncedAt}/>}
       <MobileMessages error={error} notice={notice}/>
     </View>}
     renderItem={({item,index})=><View style={{
         borderTopLeftRadius:index===0?13:0,borderTopRightRadius:index===0?13:0,
         borderBottomLeftRadius:index===sorted.length-1?13:0,borderBottomRightRadius:index===sorted.length-1?13:0,
         overflow:'hidden'
       }}><RecordRow item={item} selected={Boolean(isTablet&&selected?.objectApi===item.objectApi&&selected.recordId===item.recordId)}
         onSelect={isTablet?chosen=>setSelectedKey(chosen.objectApi+':'+chosen.recordId):undefined}/></View>}
     ListEmptyComponent={<View style={{padding:20,borderRadius:13,backgroundColor:t.surface,gap:8}}>
       <Text style={{fontSize:18,fontWeight:'600',color:t.text}}>No offline records yet</Text>
       <Text style={{fontSize:15,color:t.secondary}}>Ask your administrator to configure the briefcase, then pull down to sync while online.</Text>
     </View>}
     ListFooterComponent={<Text style={{textAlign:'center',fontSize:13,padding:14,color:t.secondary}}>
       {records.length?'Read-only offline copy · Pull down to refresh':' '}
     </Text>}
    />
   </View>
   {isTablet&&<ScrollView style={{flex:1,backgroundColor:t.background}} contentContainerStyle={{padding:20,paddingBottom:36}}>
     <RecordDetailPanel objectApi={selected?.objectApi??''} record={selected?.record??null}
      syncedAt={selected?.syncedAt} online={connection==='online'}
      onOpen={selected?()=>router.push({pathname:'/record/[objectApi]/[recordId]',params:{
       objectApi:selected.objectApi,recordId:selected.recordId}}):undefined}/>
   </ScrollView>}
  </View>
 </>;
}
