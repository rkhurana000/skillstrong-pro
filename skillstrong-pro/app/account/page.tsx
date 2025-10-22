// /app/account/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AuthForm from './auth-form'
import Link from 'next/link' // Import Link
import { Cpu } from 'lucide-react' // Import icon

export default async function Account({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- Login/Signup View ---
  if (!user) {
    return (
        // Use dark theme consistent with homepage/chat
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                 {/* Logo/Brand Link */}
                 <Link href="/" className="flex justify-center items-center text-3xl font-bold text-slate-100 mb-4">
                     <Cpu className="w-8 h-8 mr-2 text-blue-500" />
                     Project SkillStrong
                 </Link>
                <h2 className="mt-6 text-center text-2xl font-semibold text-slate-300"> {/* Adjusted size/color */}
                    Sign in or create an account
                </h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                 {/* Dark theme card */}
                <div className="bg-slate-800 py-8 px-6 shadow-xl rounded-lg sm:px-10 border border-slate-700">
                    {/* Message Styling */}
                    {searchParams.message && (
                        <p className="mb-4 p-3 bg-slate-700 text-slate-200 text-center rounded-md text-sm border border-slate-600">
                            {searchParams.message}
                        </p>
                    )}
                    <AuthForm />
                </div>
            </div>
        </div>
    )
  }

  // --- Logged-In Account View ---
  return (
    // Use dark theme
    <div className="min-h-screen bg-slate-950 text-slate-200 pt-10">
        <div className="container mx-auto max-w-lg p-8">
            <h1 className="text-3xl font-bold mb-6 text-slate-100">Account</h1>
            {/* Dark theme card */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
                <p className="text-slate-400 text-sm">Signed in as</p>
                <p className="font-semibold mb-4 text-lg text-slate-100">{user.email}</p>
                <div className="flex items-center space-x-4">
                    <form action="/auth/sign-out" method="post">
                        {/* Styled Button */}
                        <button type="submit" className="px-4 py-2 bg-slate-600 text-slate-100 font-semibold rounded-md hover:bg-slate-500 transition-colors">
                            Sign out
                        </button>
                    </form>
                    {/* Optional: Add link back to home or dashboard */}
                     <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
                         Go to Homepage
                     </Link>
                </div>
            </div>
        </div>
    </div>
  )
}
