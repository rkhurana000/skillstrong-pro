// /app/account/auth-form.tsx
'use client'

import { useState } from 'react'
import { login, signup, forgotPassword } from './actions' // Import forgotPassword

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [view, setView] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn'); // State to control view
  const [message, setMessage] = useState<string | null>(null); // State for feedback messages

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setMessage(null); // Clear previous messages
      const formData = new FormData(event.currentTarget);
      const result = await forgotPassword(formData); // Call the server action
      setMessage(result?.message || null); // Display feedback
      if (result?.success) {
          // Optionally stay on the forgot password view or switch back to signin
          // setView('signIn');
      }
  };


  if (view === 'forgotPassword') {
    return (
        <form className="space-y-6" onSubmit={handleForgotPassword}>
             <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">Reset Password</h3>
             {message && (
                 <p className="mb-4 p-3 bg-gray-100 text-gray-800 text-center rounded-md text-sm">
                     {message}
                 </p>
             )}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Enter your email address</label>
                <div className="mt-1">
                <input id="email" name="email" type="email" autoComplete="email" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
            </div>
             <div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Send Reset Link
                </button>
            </div>
             <div className="text-center text-sm">
                 <button type="button" onClick={() => { setView('signIn'); setMessage(null); }} className="font-medium text-blue-600 hover:text-blue-500">
                     Back to Sign In
                 </button>
             </div>
        </form>
    );
  }

  // Original Sign In / Sign Up Form
  return (
    <form className="space-y-6">
       {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
        <div className="mt-1">
          <input id="email" name="email" type="email" autoComplete="email" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
      </div>

       {/* Password Input */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
        <div className="mt-1">
          <input id="password" name="password" type="password" autoComplete={view === 'signUp' ? 'new-password' : 'current-password'} required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
      </div>

       {/* Confirm Password Input (Sign Up Only) */}
      {view === 'signUp' && (
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <div className="mt-1">
            <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div>
        <button formAction={view === 'signUp' ? signup : login} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          {view === 'signUp' ? 'Create Account' : 'Sign In'}
        </button>
      </div>

      {/* Switch View & Forgot Password */}
      <div className="flex items-center justify-between text-sm">
         {/* Forgot Password Link - Only show on Sign In view */}
         {view === 'signIn' && (
             <button type="button" onClick={() => { setView('forgotPassword'); setMessage(null); }} className="font-medium text-blue-600 hover:text-blue-500">
                 Forgot your password?
             </button>
         )}
         {/* Spacer to push the switch link to the right when forgot link isn't shown */}
         {view !== 'signIn' && <div />}

        <button type="button" onClick={() => setView(view === 'signUp' ? 'signIn' : 'signUp')} className="font-medium text-blue-600 hover:text-blue-500">
          {view === 'signUp' ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
        </button>
      </div>
    </form>
  )
}
