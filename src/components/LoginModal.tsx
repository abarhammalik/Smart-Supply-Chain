'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import MagneticButton from '@/components/MagneticButton';
import { createClient } from '@/utils/supabase/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name,
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        // If sign up is successful, they might be logged in or need to verify email
        // For simplicity, we assume auto-login if email confirmations are disabled,
        // or we just call onSuccess anyway so they can proceed.
        onSuccess();
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) throw signInError;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-40%" }}
            className="fixed top-1/2 left-1/2 z-[101] w-full max-w-md p-8 md:p-12 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)]"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-3xl font-light tracking-widest text-center mb-8 uppercase text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-400">
              RouteXpert
            </h2>
            
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              {/* Sign Up Fields - Hidden during login */}
              <div className={`flex flex-col md:flex-row gap-4 transition-all duration-500 overflow-hidden ${isSignUp ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 m-0 p-0 pointer-events-none'}`}>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <label className="text-xs uppercase tracking-widest text-white/50 pl-2">First Name</label>
                  <input 
                    name="first_name" 
                    type="text" 
                    required={isSignUp}
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-colors font-light text-white"
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <label className="text-xs uppercase tracking-widest text-white/50 pl-2">Last Name</label>
                  <input 
                    name="last_name" 
                    type="text" 
                    required={isSignUp}
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-colors font-light text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-white/50 pl-2">Email</label>
                <input 
                  name="email" 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-colors font-light text-white"
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-white/50 pl-2">Password</label>
                <input 
                  name="password" 
                  type="password" 
                  required 
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-colors font-light text-white"
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
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium tracking-widest uppercase hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
