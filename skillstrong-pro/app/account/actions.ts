// /app/account/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseServer'; // <-- IMPORT ADMIN CLIENT

// login function remains the same
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
    return redirect('/account?message=Sign in failed. Please check your email and password.')
  }
  revalidatePath('/', 'layout')
  redirect('/')
}


// --- UPDATED signup FUNCTION ---
export async function signup(formData: FormData) {
  const supabase = createClient() // Regular client for signup action itself

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm-password') as string;

  // Basic validation (keep as is)
  if (!email || !password || !confirmPassword) {
      return redirect('/account?message=Email, password, and confirmation are required.');
  }
  if (password !== confirmPassword) {
      return redirect('/account?message=Passwords do not match.');
  }

  // --- STEP 1: Pre-check if email exists using Admin Client ---
  let userExists = false;
  try {
      // IMPORTANT: Use the imported supabaseAdmin client here
      const { data: existingUserData, error: existingUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

      // Log the result of the admin check
      console.log(`Admin Email Check for ${email}:`, { user: !!existingUserData?.user, error: existingUserError?.message });

      // Check if a user was successfully found (no error OR specific "not found" errors are okay)
      if (existingUserData?.user) {
          userExists = true;
      }
      // Handle potential errors during the admin check itself (e.g., permissions, connection)
      else if (existingUserError && existingUserError.message !== 'User not found') {
          // Log a more critical error if the admin check failed for other reasons
          console.error("Error checking existing user with admin client:", JSON.stringify(existingUserError, null, 2));
          // Redirect with a generic server error
          return redirect('/account?message=Server error checking email. Please try again.');
      }
      // If user is null and error is null or "User not found", userExists remains false (correct)

  } catch (adminCheckError: any) {
      console.error("Exception during admin email check:", adminCheckError);
      return redirect('/account?message=Server error during email check. Please try again.');
  }

  // --- STEP 2: Redirect if user already exists ---
  if (userExists) {
      console.log(`Signup attempt for existing email: ${email}. Redirecting.`);
      return redirect('/account?message=Email already registered. Try signing in or use Forgot Password.');
  }

  // --- STEP 3: Proceed with signup ONLY if user does NOT exist ---
  console.log(`Email ${email} does not exist. Proceeding with signup.`);
  const { error: signUpError } = await supabase.auth.signUp({ email, password });

  // Handle errors specifically from the signUp call
  if (signUpError) {
    // Log the full signup error for debugging
    console.error("Detailed Signup Error (after check):", JSON.stringify(signUpError, null, 2));
    // Redirect back to the account page displaying the actual error message
    return redirect(`/account?message=${encodeURIComponent(signUpError.message)}`);
  }

  // Only redirect to success if there was NO error.
  console.log("Signup successful (confirmation email sent) for:", email);
  return redirect('/account?message=Check your email (and spam folder) to complete the sign up process.');
}
// --- END UPDATED signup FUNCTION ---


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
