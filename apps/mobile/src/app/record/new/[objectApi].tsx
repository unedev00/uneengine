import {Redirect,Stack,useLocalSearchParams} from 'expo-router';
import NativeRecordForm from '../../../lib/NativeRecordForm';
import {useMobileSession} from '../../../lib/MobileSessionProvider';
export default function NewRecordScreen(){
 const {objectApi}=useLocalSearchParams<{objectApi:string}>();
 const {session,initializing}=useMobileSession();
 if(!initializing&&!session)return <Redirect href="/sign-in"/>;
 return <><Stack.Screen options={{title:'Create record'}}/>
  <NativeRecordForm key={objectApi} objectApi={objectApi||''} mode="create"/></>;
}
