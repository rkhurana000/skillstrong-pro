// /app/account/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'


export async function login(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  if (!data.email || !data.password) {
      return redirect('/account?message=Email and password are required.')
  }
  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) {
    // Provide a clearer login error message
    return redirect('/account?message=Sign in failed. Please check your email and password.')
  }
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;

  if (!email || !password || !confirmPassword) {
      return redirect('/account?message=Email, password, and confirmation are required.');
  }
  if (password !== confirmPassword) {
      return redirect('/account?message=Passwords do not match.');
  }

  // Attempt Signup
  const { error } = await supabase.auth.signUp({ email, password });

  // --- MODIFIED ERROR HANDLING ---
  // If ANY error occurs during signup, redirect back with the error message.
  // This handles the "existing user" case even if Supabase doesn't throw the specific expected error,
  // as well as any other potential signup problems (like weak password if rules are set).
  if (error) {
    // Log the full error for debugging on the server
    console.error("Detailed Signup Error:", JSON.stringify(error, null, 2));

    // Redirect back to the account page displaying the actual error message from Supabase
    // Make sure the message parameter can handle potentially longer messages
    return redirect(`/account?message=${encodeURIComponent(error.message)}`);
  }
  // --- END MODIFIED ERROR HANDLING ---


  // Only redirect to success if there was NO error.
  console.log("Signup successful (confirmation email sent) for:", email);
  return redirect('/account?message=Check your email (and spam folder) to complete the sign up process.');
}


export async function forgotPassword(formData: FormData): Promise<{ success?: boolean; message: string }> {
    const supabase = createClient();
    const email = formData.get('email') as string;

    if (!email) {
        return { message: 'Email address is required.' };
    }

    // --- CHANGE redirectTo ---
    // Point to the callback, which will then redirect to /reset
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset` // Target callback, next=/reset
        : '/auth/callback?next=/reset'; // Fallback if URL isn't set (less ideal)
    // --- END CHANGE ---

    console.log("Sending password reset email with redirect To:", redirectUrl); // Logging

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    });

    if (error) {
        console.error("Forgot Password Error:", error);
        return { message: 'If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).' };
    }

    return { success: true, message: 'Password reset link sent. Please check your email (and spam folder).' };
}
