import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {MobileSessionProvider} from '../lib/MobileSessionProvider';
import {useMobileTheme} from '../lib/mobileTheme';

function RootNavigator(){
 const theme=useMobileTheme();
 return <>
  <StatusBar style={theme.background==='#000000'?'light':'dark'}/>
  <Stack screenOptions={{headerStyle:{backgroundColor:theme.surface},headerTintColor:theme.accent,
   headerTitleStyle:{fontWeight:'600'},contentStyle:{backgroundColor:theme.background}}}>
   <Stack.Screen name="sign-in" options={{headerShown:false}}/>
   <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
   <Stack.Screen name="record/[objectApi]/[recordId]" options={{title:'Record details'}}/>
   <Stack.Screen name="record/new/index" options={{title:'New record'}}/>
   <Stack.Screen name="record/new/[objectApi]" options={{title:'Create record'}}/>
   <Stack.Screen name="record/edit/[objectApi]/[recordId]" options={{title:'Edit record'}}/>
  </Stack>
 </>;
}
export default function RootLayout(){
 return <MobileSessionProvider><RootNavigator/></MobileSessionProvider>;
}
