// /app/account/auth-form.tsx
'use client'

import { useState, useTransition } from 'react'; // Import useTransition
import { login, signup, forgotPassword } from './actions';

export default function AuthForm() {
  const [view, setView] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
  // Message state for forgot password feedback ONLY (as login/signup redirect with message)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);
  // useTransition provides pending state for Server Actions
  const [isPending, startTransition] = useTransition();

  const handleAuthAction = (action: typeof login | typeof signup) => {
      // Wrap the server action call in startTransition
      startTransition(async () => {
          // No need for event or manual FormData here if using formAction
          // The form's default submission will trigger the action
          // We don't manually call `await action()` here when using formAction
      });
  };

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault(); // Prevent default since this uses onSubmit
      const formData = new FormData(event.currentTarget);
      // Wrap the server action call in startTransition
      startTransition(async () => {
          setForgotPasswordMessage(null); // Clear previous message
          const result = await forgotPassword(formData);
          setForgotPasswordMessage(result?.message || null); // Display feedback
      });
  };

  // Determine combined loading state
  const loading = isPending;


  if (view === 'forgotPassword') {
    return (
        <form className="space-y-6" onSubmit={handleForgotPassword}>
             {/* Use consistent message styling */}
             {forgotPasswordMessage && (
                 <p className="my-4 p-3 bg-slate-700 text-slate-200 text-center rounded-md text-sm border border-slate-600">
                     {forgotPasswordMessage}
                 </p>
             )}
            <div>
                 {/* Dark theme label */}
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">Enter your email address</label>
                <div className="mt-1">
                 {/* Dark theme input */}
                <input id="email" name="email" type="email" autoComplete="email" required disabled={loading} className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-slate-700 text-slate-100 disabled:opacity-70" />
                </div>
            </div>
             <div>
                <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70">
                {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </div>
             <div className="text-center text-sm">
                 <button type="button" disabled={loading} onClick={() => { setView('signIn'); setForgotPasswordMessage(null); }} className="font-medium text-blue-400 hover:text-blue-300 disabled:opacity-70">
                     Back to Sign In
                 </button>
             </div>
        </form>
    );
  }

  // Original Sign In / Sign Up Form
  // Use formAction directly on the button, managed by useTransition
  return (
    <form className="space-y-6">
       {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email address</label>
        <div className="mt-1">
          <input id="email" name="email" type="email" autoComplete="email" required disabled={loading} className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-slate-700 text-slate-100 disabled:opacity-70" />
        </div>
      </div>

       {/* Password Input */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300">Password</label>
        <div className="mt-1">
          <input id="password" name="password" type="password" autoComplete={view === 'signUp' ? 'new-password' : 'current-password'} required disabled={loading} className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-slate-700 text-slate-100 disabled:opacity-70" />
        </div>
      </div>

       {/* Confirm Password Input (Sign Up Only) */}
      {view === 'signUp' && (
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300">Confirm Password</label>
          <div className="mt-1">
            <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required disabled={loading} className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-slate-700 text-slate-100 disabled:opacity-70" />
          </div>
        </div>
      )}

      {/* Submit Button - Uses formAction */}
      <div>
        <button
            formAction={view === 'signUp' ? signup : login} // Use formAction directly
            type="submit" // Ensure it's a submit button
            disabled={loading} // Disable based on useTransition state
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
        >
           {loading ? 'Processing...' : (view === 'signUp' ? 'Create Account' : 'Sign In')}
        </button>
      </div>

      {/* Switch View & Forgot Password */}
      <div className="flex items-center justify-between text-sm">
         {view === 'signIn' && (
             <button type="button" disabled={loading} onClick={() => { setView('forgotPassword'); setForgotPasswordMessage(null); }} className="font-medium text-blue-400 hover:text-blue-300 disabled:opacity-70">
                 Forgot your password?
             </button>
         )}
         {view !== 'signIn' && <div />} {/* Spacer */}

        <button type="button" disabled={loading} onClick={() => setView(view === 'signUp' ? 'signIn' : 'signUp')} className="font-medium text-blue-400 hover:text-blue-300 disabled:opacity-70">
          {view === 'signUp' ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
        </button>
      </div>
    </form>
  )
}
