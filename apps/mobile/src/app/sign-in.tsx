import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {useMobileSession} from '../lib/MobileSessionProvider';
import {useMobileTheme} from '../lib/mobileTheme';
import {MobileButton,MobileMessages} from '../lib/MobileUI';
import {resolveTenantDisplay} from '../lib/mobileApi';

const defaultUrl=process.env.EXPO_PUBLIC_API_URL??'';
export default function SignInScreen(){
 const router=useRouter(),t=useMobileTheme();
 const {session,initializing,busy,signIn,verifyMfa,error,notice}=useMobileSession();
 const [apiUrl,setApiUrl]=useState(defaultUrl),[tenantSlug,setTenantSlug]=useState('');
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [tenantDisplay,setTenantDisplay]=useState('');
 const [tenantIdentityError,setTenantIdentityError]=useState('');
 const [resolvingTenant,setResolvingTenant]=useState(false);
 useEffect(()=>{
   setTenantDisplay('');setTenantIdentityError('');
   if(!tenantSlug.trim()||!apiUrl.trim())return;
   let live=true;
   setResolvingTenant(true);
   const timer=setTimeout(()=>{void resolveTenantDisplay(apiUrl,tenantSlug).then(name=>{
     if(live)setTenantDisplay(name);
   }).catch(()=>{
     if(live)setTenantIdentityError('Tenant identity could not be verified on this API domain.');
   }).finally(()=>{if(live)setResolvingTenant(false);});},350);
   return()=>{live=false;clearTimeout(timer);};
 },[apiUrl,tenantSlug]);
 const [challenge,setChallenge]=useState(''),[mfa,setMfa]=useState(''),[showPassword,setShowPassword]=useState(false);
 const tenantRef=useRef<React.ElementRef<typeof TextInput>>(null),emailRef=useRef<React.ElementRef<typeof TextInput>>(null),passwordRef=useRef<React.ElementRef<typeof TextInput>>(null);
 useEffect(()=>{if(session)router.replace('/(tabs)');},[session,router]);
 const inputStyle={minHeight:50,paddingHorizontal:13,borderRadius:10,backgroundColor:t.surface,color:t.text,
  borderWidth:1,borderColor:t.separator,fontSize:17} as const;
 const submit=async()=>{try{
  if(challenge)await verifyMfa(apiUrl,challenge,mfa);
  else{const token=await signIn(apiUrl,tenantSlug,email,password);if(token){setChallenge(token);setPassword('');}}
 }catch{/* error is displayed by the shared auth provider */}};
 if(initializing)return <View style={{flex:1,justifyContent:'center',backgroundColor:t.background}}>
  <ActivityIndicator size="large" color={t.accent}/></View>;
 return <SafeAreaView style={{flex:1,backgroundColor:t.background}}>
  <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
     padding:20,paddingTop:40,paddingBottom:45,maxWidth:540,width:'100%',alignSelf:'center',gap:18}}>
    <View style={{alignItems:'center',gap:8,marginBottom:16}}>
     <Text style={{fontSize:42,fontWeight:'800',color:t.accent}}>M</Text>
     <Text style={{fontSize:34,fontWeight:'700',color:t.text}}>MetaDrive</Text>
     <Text style={{fontSize:15,color:t.secondary,textAlign:'center'}}>Secure access to your offline briefcase</Text>
    </View>
    <View style={{borderRadius:14,padding:18,gap:15,backgroundColor:t.surface}}>
     {tenantDisplay?<Text accessibilityRole="text" style={{fontSize:19,fontWeight:'700',color:t.text}} numberOfLines={3}>Organisation: {tenantDisplay}</Text>:
      tenantIdentityError?<Text style={{fontSize:14,color:t.secondary}}>{tenantIdentityError}</Text>:
      resolvingTenant?<Text style={{fontSize:14,color:t.secondary}}>Verifying organisation…</Text>:null}
     <Text style={{fontSize:22,fontWeight:'700',color:t.text}}>{challenge?'Verify your identity':'Sign in'}</Text>
     {challenge?<View style={{gap:8}}>
       <Text style={{fontSize:15,color:t.secondary}}>Enter the code from your authenticator.</Text>
       <TextInput style={inputStyle} keyboardType="number-pad" autoComplete="one-time-code" value={mfa}
         onChangeText={setMfa} placeholder="Verification code" placeholderTextColor={t.secondary}
         accessibilityLabel="MFA verification code" onSubmitEditing={()=>void submit()}/>
       <Pressable accessibilityRole="button" onPress={()=>{setChallenge('');setMfa('');}}>
        <Text style={{color:t.accent,fontSize:15}}>Back to sign in</Text>
       </Pressable>
     </View>:<>
       <View style={{gap:6}}><Text style={{fontSize:15,color:t.secondary}}>Tenant API URL</Text>
        <TextInput style={inputStyle} autoCapitalize="none" autoCorrect={false} keyboardType="url"
          value={apiUrl} onChangeText={setApiUrl} placeholder="https://tenant.example.com"
          placeholderTextColor={t.secondary} returnKeyType="next" onSubmitEditing={()=>tenantRef.current?.focus()}/></View>
       <View style={{gap:6}}><Text style={{fontSize:15,color:t.secondary}}>Tenant slug</Text>
        <TextInput ref={tenantRef} style={inputStyle} autoCapitalize="none" autoCorrect={false}
          value={tenantSlug} onChangeText={setTenantSlug} placeholder="your-tenant"
          placeholderTextColor={t.secondary} returnKeyType="next" onSubmitEditing={()=>emailRef.current?.focus()}/></View>
       <View style={{gap:6}}><Text style={{fontSize:15,color:t.secondary}}>Email</Text>
        <TextInput ref={emailRef} style={inputStyle} keyboardType="email-address" autoComplete="email"
          textContentType="emailAddress" autoCapitalize="none" value={email} onChangeText={setEmail}
          placeholder="name@example.com" placeholderTextColor={t.secondary}
          returnKeyType="next" onSubmitEditing={()=>passwordRef.current?.focus()}/></View>
       <View style={{gap:6}}><Text style={{fontSize:15,color:t.secondary}}>Password</Text>
        <View style={{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:10,borderColor:t.separator,backgroundColor:t.surface}}>
         <TextInput ref={passwordRef} style={[inputStyle,{flex:1,borderWidth:0}]} autoComplete="current-password"
           textContentType="password" secureTextEntry={!showPassword} value={password} onChangeText={setPassword}
           placeholder="Password" placeholderTextColor={t.secondary} onSubmitEditing={()=>void submit()}/>
         <Pressable accessibilityRole="button" accessibilityLabel={showPassword?'Hide password':'Show password'}
           style={{minHeight:44,justifyContent:'center',paddingHorizontal:14}}
           onPress={()=>setShowPassword(x=>!x)}><Text style={{color:t.accent,fontSize:15}}>{showPassword?'Hide':'Show'}</Text></Pressable>
        </View>
       </View>
     </>}
     <MobileButton title={busy?'Signing in…':challenge?'Verify and continue':'Sign in'}
       disabled={busy||(!challenge&&(!apiUrl.trim()||!email.trim()||!password))||(Boolean(challenge)&&!mfa.trim())}
       onPress={()=>void submit()}/>
     <MobileMessages error={error} notice={notice}/>
    </View>
    <Text style={{color:t.secondary,textAlign:'center',fontSize:13}}>Offline records are encrypted and read-only.</Text>
   </ScrollView>
  </KeyboardAvoidingView>
 </SafeAreaView>;
}
