// /app/account/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AuthForm from './auth-form' // We will create this component next

export default async function Account() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
                    <AuthForm />
                </div>
            </div>
        </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('zip_code')
    .eq('id', user.id)
    .single()

  return (
    <div className="container mx-auto max-w-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Account</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600">Signed in as</p>
            <p className="font-semibold mb-4">{user.email}</p>

            <form action="/auth/update-zip" method="post" className="space-y-4">
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                    ZIP code (for nearby results)
                </label>
                <input
                    id="zip"
                    name="zip"
                    type="text"
                    defaultValue={profile?.zip_code || ''}
                    placeholder="e.g. 94582"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex items-center space-x-4">
                     <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                        Save
                    </button>
                    <form action="/auth/signout" method="post">
                        <button type="submit" className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300">
                            Sign out
                        </button>
                    </form>
                </div>
            </form>
        </div>
    </div>
  )
}
