import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || !/^https?:\/\//.test(supabaseUrl)) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  try {
    await supabase.auth.getUser()
  } catch (error) {
    // Stale/invalid refresh token cookie (e.g. expired or from a signed-out session) - clear it so it stops being resent.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'refresh_token_not_found'
    ) {
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.includes('-auth-token')) {
          response.cookies.delete(cookie.name)
        }
      })
    } else {
      throw error
    }
  }

  return response
}
