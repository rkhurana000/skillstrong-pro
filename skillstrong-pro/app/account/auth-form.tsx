// /app/account/auth-form.tsx
'use client'

import { useState } from 'react'
import { login, signup } from './actions'

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)

  return (
    <form className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
        <div className="mt-1">
          <input id="email" name="email" type="email" autoComplete="email" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
        <div className="mt-1">
          <input id="password" name="password" type="password" autoComplete="current-password" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
      </div>

      {isSignUp && (
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <div className="mt-1">
            <input id="confirm-password" name="confirm-password" type="password" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
        </div>
      )}

      <div>
        <button formAction={isSignUp ? signup : login} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </div>

      <div className="text-center text-sm">
        <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-blue-600 hover:text-blue-500">
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
        </button>
      </div>
    </form>
  )
}
