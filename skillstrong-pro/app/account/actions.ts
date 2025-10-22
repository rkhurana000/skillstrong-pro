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

  // Basic validation
  if (!data.email || !data.password) {
      return redirect('/account?message=Email and password are required.')
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return redirect('/account?message=Could not authenticate user. Check email/password.') // More specific message
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;

  // Basic validation
  if (!email || !password || !confirmPassword) {
      return redirect('/account?message=Email, password, and confirmation are required.');
  }
  if (password !== confirmPassword) {
      return redirect('/account?message=Passwords do not match.');
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error("Signup Error:", error.message);
    // --- CHECK FOR EXISTING USER ---
    if (error.message.includes('User already registered')) { // Check for Supabase's specific error text
        return redirect('/account?message=Email already registered. Try signing in or use Forgot Password.');
    }
    // --- END CHECK ---
    return redirect('/account?message=Could not create account. Please try again.'); // Generic error
  }

  // --- ADD SPAM FOLDER NOTE ---
  return redirect('/account?message=Check your email (and spam folder) to complete the sign up process.');
}


// --- NEW FUNCTION: Send Password Reset Email ---
export async function forgotPassword(formData: FormData): Promise<{ success?: boolean; message: string }> {
    const supabase = createClient();
    const email = formData.get('email') as string;

    if (!email) {
        return { message: 'Email address is required.' };
    }

    // Generate the redirect URL pointing to your /reset page
    // Ensure NEXT_PUBLIC_SITE_URL is set in your environment variables (e.g., http://localhost:3000 or your production URL)
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset` : '/reset';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    });

    if (error) {
        console.error("Forgot Password Error:", error);
        // Don't reveal if the email exists or not for security
        return { message: 'If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).' };
    }

    return { success: true, message: 'Password reset link sent. Please check your email (and spam folder).' };
}
// --- END NEW FUNCTION ---
