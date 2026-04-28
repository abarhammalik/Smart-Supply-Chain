import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { signout } from '@/app/login/actions'

export default async function Navbar() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('first_name').eq('id', user.id).single();
    profile = data;
  }

  return (
    <nav className="fixed top-0 left-0 w-full p-6 z-50 flex justify-between items-center pointer-events-none">
      <Link href="/" className="pointer-events-auto text-xl font-light tracking-widest uppercase text-white mix-blend-difference hover-target">
      </Link>
      
      <div className="pointer-events-auto flex items-center gap-6 mix-blend-difference">
        {user ? (
          <div className="flex items-center gap-4 text-sm font-light tracking-widest uppercase text-white">
            <span className="opacity-60 hidden md:inline">Welcome, {profile?.first_name || 'User'}</span>
            <form action={signout}>
              <button className="hover:text-pink-400 transition-colors hover-target">Sign Out</button>
            </form>
          </div>
        ) : (
          <Link href="/login" className="text-sm font-light tracking-widest uppercase text-white hover:text-pink-400 transition-colors hover-target">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}
