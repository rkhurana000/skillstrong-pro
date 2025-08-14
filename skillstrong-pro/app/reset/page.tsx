'use client';import { useState } from 'react';import { supabase } from '@/lib/supabaseClient';
export default function Reset(){const [password,setPassword]=useState('');const [msg,setMsg]=useState<string|null>(null);
async function update(){const {error}=await supabase.auth.updateUser({password});setMsg(error?error.message:'Password updated. You can sign in now.');}
return(<main className='section'><div className='card auth-card'><h2 className='h2'>Set a new password</h2><input className='input' type='password' placeholder='New password' value={password} onChange={e=>setPassword(e.target.value)}/><button className='btn' onClick={update}>Update password</button>{msg&&<div className='small'>{msg}</div>}</div></main>);}
