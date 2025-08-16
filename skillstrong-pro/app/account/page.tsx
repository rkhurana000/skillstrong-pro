// /app/account/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AuthForm from './auth-form'

export default async function Account({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Welcome to SkillStrong</h2>
                <p className="mt-2 text-center text-sm text-gray-600">Sign in or create an account to get started</p>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
                    {searchParams.message && (
                        <p className="mb-4 p-4 bg-gray-100 text-gray-800 text-center rounded-md">
                            {searchParams.message}
                        </p>
                    )}
                    <AuthForm />
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="container mx-auto max-w-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Account</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600">Signed in as</p>
            <p className="font-semibold mb-4">{user.email}</p>
            <div className="flex items-center space-x-4">
                <form action="/auth/sign-out" method="post">
                    <button type="submit" className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300">
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    </div>
  )
}
