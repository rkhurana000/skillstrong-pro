// /app/api/user/update-location/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { location } = await req.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && location) {
    const { error } = await supabase
      .from('profiles')
      .update({ zip_code: location })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'User not found or location missing' }, { status: 400 })
}
