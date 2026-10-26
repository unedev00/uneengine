import React from 'react';
import {Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {Tabs,Redirect} from 'expo-router';
import {useMobileSession} from '../../lib/MobileSessionProvider';
import {useMobileTheme} from '../../lib/mobileTheme';
import {MobileButton,MobileMessages,ConnectionBadge} from '../../lib/MobileUI';

export default function SettingsScreen(){
 const t=useMobileTheme();
 const {session,initializing,records,connection,syncing,busy,sync,refresh,signOut,error,notice}=useMobileSession();
 if(!initializing&&!session)return <Redirect href="/sign-in"/>;
 const confirm=()=>Alert.alert('Sign out and erase offline data?',
  'The encrypted offline briefcase and the local session will be removed from this device.',
  [{text:'Cancel',style:'cancel'},{text:'Sign out',style:'destructive',onPress:()=>void signOut()}]);
 const row=(name:string,value:string)=><View style={{flexDirection:'row',justifyContent:'space-between',gap:12,
   paddingVertical:13,borderBottomWidth:.5,borderBottomColor:t.separator}}>
    <Text style={{fontSize:16,color:t.text}}>{name}</Text>
    <Text selectable style={{fontSize:14,color:t.secondary,maxWidth:'55%',textAlign:'right'}}>{value}</Text>
   </View>;
 return <>
  <Tabs.Screen options={{title:'Settings'}}/>
  <ScrollView style={{flex:1,backgroundColor:t.background}} contentContainerStyle={{padding:16,gap:17}}>
   <Text style={{fontSize:34,fontWeight:'700',color:t.text}}>Settings</Text>
   <View style={{alignSelf:'flex-start'}}><ConnectionBadge online={connection==='online'}/></View>
   <View style={{paddingHorizontal:16,borderRadius:13,backgroundColor:t.surface}}>
    {row('Cached records',String(records.length))}
    {row('Storage','Encrypted on device')}
    {row('Access','Read-only')}
    {row('Connection',connection==='online'?'Online':connection==='offline'?'Offline':'Checking')}
    {row('Last sync',records[0]?.syncedAt?new Date(records[0].syncedAt).toLocaleString():'Never')}
   </View>
   <MobileMessages error={error} notice={notice}/>
   <MobileButton title={syncing?'Syncing…':'Sync offline briefcase'} disabled={syncing||busy}
      onPress={()=>void sync()}/>
   <MobileButton title="Check connection" secondary disabled={syncing||busy}
      onPress={()=>void refresh()}/>
   <MobileButton title="Sign out and clear device data" danger disabled={busy||syncing} onPress={confirm}/>
   <Text style={{fontSize:13,color:t.secondary,lineHeight:19}}>
     Records are provided by the tenant's permissions. Offline changes and destructive record actions are intentionally unavailable.
   </Text>
  </ScrollView>
 </>;
}
