// /app/account/auth-form.tsx
'use client'

import { useState } from 'react'
import { login, signup, forgotPassword } from './actions'

export default function AuthForm() {
  const [view, setView] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Add loading state

  const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>, action: typeof login | typeof signup) => {
      event.preventDefault();
      setLoading(true);
      setMessage(null);
      const formData = new FormData(event.currentTarget);
      // Server actions redirect on error/success, so we might not see a message here unless explicitly returned
      await action(formData);
      // setLoading(false); // Might not be reached due to redirect
  };

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setMessage(null);
      const formData = new FormData(event.currentTarget);
      const result = await forgotPassword(formData);
      setLoading(false);
      setMessage(result?.message || null);
  };


  if (view === 'forgotPassword') {
    return (
        <form className="space-y-6" onSubmit={handleForgotPassword}>
             {/* Use consistent message styling */}
             {message && (
                 <p className="my-4 p-3 bg-slate-700 text-slate-200 text-center rounded-md text-sm border border-slate-600">
                     {message}
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
                 <button type="button" disabled={loading} onClick={() => { setView('signIn'); setMessage(null); }} className="font-medium text-blue-400 hover:text-blue-300 disabled:opacity-70">
                     Back to Sign In
                 </button>
             </div>
        </form>
    );
  }

  // Original Sign In / Sign Up Form
  return (
    <form className="space-y-6" onSubmit={(e) => handleAuthAction(e, view === 'signUp' ? signup : login)}>
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

      {/* Submit Button */}
      <div>
         {/* Using type="submit" and onSubmit on the form */}
        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70">
           {loading ? 'Processing...' : (view === 'signUp' ? 'Create Account' : 'Sign In')}
        </button>
      </div>

      {/* Switch View & Forgot Password */}
      <div className="flex items-center justify-between text-sm">
         {view === 'signIn' && (
             <button type="button" disabled={loading} onClick={() => { setView('forgotPassword'); setMessage(null); }} className="font-medium text-blue-400 hover:text-blue-300 disabled:opacity-70">
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
