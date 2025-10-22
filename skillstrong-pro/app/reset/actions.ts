// /app/reset/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function updatePassword(formData: FormData): Promise<{ error?: string, success?: boolean }> {
  const supabase = createClient()
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;

  if (!password || !confirmPassword) {
    return { error: 'Password and confirmation are required.' };
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }
  if (password.length < 6) { // Add basic length check (Supabase default)
    return { error: 'Password must be at least 6 characters long.' };
  }


  // The user should be in a session initiated by the reset link click
  const { error } = await supabase.auth.updateUser({ password: password })

  if (error) {
    console.error("Password Update Error:", error);
    return { error: `Could not update password: ${error.message}. The reset link might have expired.` };
  }

  // Don't redirect here, let the client-side handle success message/redirect
  // redirect('/account?message=Password updated successfully. You can now sign in.')
  return { success: true };
}
