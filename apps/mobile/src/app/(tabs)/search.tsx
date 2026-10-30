import React,{useMemo,useState} from 'react';
import {FlatList,Pressable,Text,TextInput,View} from 'react-native';
import {Tabs,Redirect} from 'expo-router';
import {useMobileSession} from '../../lib/MobileSessionProvider';
import {useMobileTheme,displayValue,recordTitle} from '../../lib/mobileTheme';
import {RecordRow} from '../../lib/RecordRow';
export default function SearchScreen(){
 const t=useMobileTheme(),{session,initializing,records}=useMobileSession();
 const [query,setQuery]=useState(''),[objectFilter,setObjectFilter]=useState('');
 const objects=useMemo(()=>[...new Set(records.map(x=>x.objectApi))].sort(),[records]);
 const filtered=useMemo(()=>{
  const term=query.trim().toLowerCase();
  return records.filter(x=>(!objectFilter||x.objectApi===objectFilter)&&(!term||
    (recordTitle(x)+' '+x.objectApi+' '+x.recordId+' '+Object.values(x.record).filter(v=>typeof v==='string')
      .slice(0,20).map(displayValue).join(' ')).toLowerCase().includes(term)));
 },[query,records,objectFilter]);
 if(!initializing&&!session)return <Redirect href="/sign-in"/>;
 return <>
  <Tabs.Screen options={{title:'Search'}}/>
  <View style={{padding:14,backgroundColor:t.background,gap:8}}>
   <TextInput accessibilityLabel="Search cached records" autoFocus={false} autoCapitalize="none"
     placeholder="Search offline records" placeholderTextColor={t.secondary} clearButtonMode="while-editing"
     value={query} onChangeText={setQuery} style={{height:48,backgroundColor:t.surface,borderRadius:12,
      paddingHorizontal:14,fontSize:17,color:t.text}}/>
   <FlatList data={['',...objects]} horizontal keyExtractor={x=>x||'all'}
     showsHorizontalScrollIndicator={false}
     renderItem={({item})=><Pressable onPress={()=>setObjectFilter(item)} accessibilityRole="button"
      accessibilityLabel={item||'All objects'} accessibilityState={{selected:objectFilter===item}}
      style={{minHeight:44,justifyContent:'center',paddingVertical:10,paddingHorizontal:13,marginRight:7,borderRadius:15,
       backgroundColor:objectFilter===item?t.accent:t.surface}}>
       <Text style={{color:objectFilter===item?'#fff':t.text,fontSize:14}}>{item||'All'}</Text>
      </Pressable>}/>
  </View>
  <FlatList style={{flex:1,backgroundColor:t.background}}
    contentContainerStyle={{padding:14,paddingBottom:24}}
    data={filtered} keyExtractor={x=>x.objectApi+':'+x.recordId}
    renderItem={({item})=><RecordRow item={item}/>}
    ListEmptyComponent={<Text style={{fontSize:15,padding:18,color:t.secondary}}>
      {query?'No matching records':'Search your encrypted offline briefcase.'}</Text>}/>
 </>;
}
