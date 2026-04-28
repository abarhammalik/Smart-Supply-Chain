'use client';

import { useState } from 'react';
import MagneticButton from '@/components/MagneticButton';
import { login, signup } from './actions';

export default function LoginForm({ error }: { error?: string }) {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="relative z-10 w-full max-w-md p-8 md:p-12 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl transition-all duration-500">
      <h1 className="text-3xl font-light tracking-widest text-center mb-8 uppercase text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-400">
        RouteXpert
      </h1>
      
      <form className="flex flex-col gap-6">
        {/* Sign Up Fields - Hidden during login */}
        <div className={`flex flex-col md:flex-row gap-4 transition-all duration-500 overflow-hidden ${isSignUp ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 m-0 p-0 pointer-events-none'}`}>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <label className="text-xs uppercase tracking-widest text-white/50 pl-2">First Name</label>
            <input 
              name="first_name" 
              type="text" 
              required={isSignUp}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-colors font-light"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <label className="text-xs uppercase tracking-widest text-white/50 pl-2">Last Name</label>
            <input 
              name="last_name" 
              type="text" 
              required={isSignUp}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-colors font-light"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-white/50 pl-2">Email</label>
          <input 
            name="email" 
            type="email" 
            required 
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-colors font-light"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-white/50 pl-2">Password</label>
          <input 
            name="password" 
            type="password" 
            required 
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-colors font-light"
            placeholder="••••••••"
          />
          {!isSignUp && (
            <div className="flex justify-end mt-1">
              <a href="#" className="text-xs text-white/40 hover:text-cyan-400 transition-colors">Forgot Password?</a>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4 mt-4">
          <MagneticButton className="w-full">
            <button 
              formAction={isSignUp ? signup : login} 
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium tracking-widest uppercase hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </MagneticButton>
          
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full py-3 rounded-xl bg-transparent border border-white/20 text-white font-medium tracking-widest uppercase hover:bg-white/5 transition-colors"
          >
            {isSignUp ? 'Already have an account?' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
