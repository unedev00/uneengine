import {Tabs} from 'expo-router';
import {MobileTabIcon} from '../../lib/MobileTabIcon';
import {useMobileTheme} from '../../lib/mobileTheme';
import {useMobileSession} from '../../lib/MobileSessionProvider';
import {Redirect} from 'expo-router';

export default function TabsLayout(){
 const theme=useMobileTheme(),{session,initializing}=useMobileSession();
 if(!initializing&&!session)return <Redirect href="/sign-in"/>;
 return <Tabs screenOptions={{
  headerStyle:{backgroundColor:theme.surface},headerTintColor:theme.accent,
  headerTitleStyle:{color:theme.text,fontWeight:'600'},
  tabBarActiveTintColor:theme.accent,tabBarInactiveTintColor:theme.secondary,
  tabBarStyle:{backgroundColor:theme.surface,borderTopColor:theme.separator,minHeight:55},
  sceneStyle:{backgroundColor:theme.background}
 }}>
  <Tabs.Screen name="index" options={{title:'Records',
   tabBarIcon:({color})=><MobileTabIcon name="records" color={color} background={theme.surface}/>}}/>
  <Tabs.Screen name="search" options={{title:'Search',
   tabBarIcon:({color})=><MobileTabIcon name="search" color={color} background={theme.surface}/>}}/>
  <Tabs.Screen name="settings" options={{title:'Settings',
   tabBarIcon:({color})=><MobileTabIcon name="settings" color={color} background={theme.surface}/>}}/>
 </Tabs>;
}
