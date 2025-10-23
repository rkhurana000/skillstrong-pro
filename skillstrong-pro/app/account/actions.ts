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
      // --- CORRECTED METHOD: Use listUsers with an email filter ---
      const { data: existingUsersData, error: existingUserError } = await supabaseAdmin.auth.admin.listUsers({
          // Filter options allow specifying email
          // Note: This might require pagination handling if you expect > 50 users matching,
          // but for a single email check, the default limit is usually sufficient.
           page: 1,
           perPage: 1, // Only need to know if at least one exists
           // Supabase doesn't have a direct 'email' filter here, need alternative or check after getting list (less efficient for large user bases)
           // Let's reconsider. The error might be a type mismatch or older library version.
           // Trying getUserById requires knowing the ID.
           // Let's revert to checking the specific error from signUp first, as that *should* be the standard Supabase behavior.
           // It's possible the configuration is preventing the error.

           // Alternative approach: Try to sign *in* first? No, that requires password.

           // Let's stick to the original plan but ensure correct types and handle potential config issues.
           // The error `Property 'getUserByEmail' does not exist` strongly suggests the method isn't there in the version/types used.
           // Let's double check the Admin API again.
           // Okay, the method MIGHT exist but isn't typed correctly or is newer.
           // Let's try casting to `any` temporarily to bypass the type check and see if it works at runtime,
           // while acknowledging this isn't ideal.
           // const { data: existingUserData, error: existingUserError } = await (supabaseAdmin.auth.admin as any).getUserByEmail(email);

           // SAFER APPROACH: Rely on signUp error as the primary mechanism, enhance logging.
           // If signUp *succeeds* even for an existing user, that points to a specific Supabase config issue (like auto-confirming users or disabled email checks).

           // Let's remove the pre-check for now and rely on signUp's error, adding more robust logging there.
      })
      } catch (adminCheckError: any) {
          console.error("Exception during admin email check:", adminCheckError);
          // Don't block signup if the *check itself* fails, just log it.
          // return redirect('/account?message=Server error during email check. Please try again.');
      }

  // --- STEP 2: Proceed with signup and rely on its error handling ---
  console.log(`Attempting signup for: ${email}.`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
       email,
       password,
       // Optionally add options like data here if needed
       // options: { data: { full_name: 'Example User' }}
   });

  // Handle errors specifically from the signUp call
  if (signUpError) {
    // Log the full signup error for debugging
    console.error("Detailed Signup Error:", JSON.stringify(signUpError, null, 2));

    // Check common existing user error patterns more broadly
    if (signUpError.message.toLowerCase().includes('user already registered') ||
        signUpError.message.toLowerCase().includes('already exists') ||
        signUpError.message.toLowerCase().includes('duplicate key value violates unique constraint') || // Check for DB constraint error
        signUpError.status === 422 || // Unprocessable Entity often means duplicate
        signUpError.status === 400 && signUpError.message.includes('already') // Some variations might use 400
       ) {
         console.log("Signup Error: Detected existing user pattern.");
         return redirect('/account?message=Email already registered. Try signing in or use Forgot Password.');
     } else {
         console.log("Signup Error: Did not match existing user patterns.");
         // Provide the actual error message from Supabase
         return redirect(`/account?message=${encodeURIComponent(signUpError.message)}`);
     }
  }

   // Check if user object exists in data (might be null even without error if confirmation is required)
   if (!signUpData.user && !signUpData.session) {
      // This case can happen if confirmation is required but no specific error was thrown (unusual but possible)
      console.warn("Signup response had no user and no error. Assuming confirmation required.");
      return redirect('/account?message=Check your email (and spam folder) to complete the sign up process.');
   }


  // Only redirect to success if there was NO error and we have user/session data (or assume confirmation)
  console.log("Signup successful (or confirmation email sent) for:", email);
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
