import {Redirect,Stack,useLocalSearchParams} from 'expo-router';
import NativeRecordForm from '../../../../lib/NativeRecordForm';
import {useMobileSession} from '../../../../lib/MobileSessionProvider';
export default function EditRecordScreen(){
 const {objectApi,recordId}=useLocalSearchParams<{objectApi:string;recordId:string}>();
 const {session,initializing}=useMobileSession();
 if(!initializing&&!session)return <Redirect href="/sign-in"/>;
 return <><Stack.Screen options={{title:'Edit record'}}/>
  <NativeRecordForm key={objectApi+':'+recordId} objectApi={objectApi||''} recordId={recordId||''} mode="edit"/></>;
}
