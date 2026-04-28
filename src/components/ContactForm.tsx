'use client';

import { useState } from 'react';
import { User, MapPin, Phone, Mail, Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsSuccess(true);
        // Only empty the boxes after the email is successfully sent
        setFormData({ name: '', email: '', subject: '', message: '' });
        
        // Reset success state after 4 seconds
        setTimeout(() => setIsSuccess(false), 4000);
      } else {
        alert("Failed to send message. Please verify your email connection settings.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("An error occurred connecting to the mail server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-24 font-sans relative z-30">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        
        {/* Left Column: Contact Info */}
        <div className="flex flex-col">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Get in touch</h2>
          <p className="text-[15px] font-light text-white/70 leading-relaxed max-w-md mb-12">
            Have any questions or ideas you'd like to discuss? Feel free to reach out through the form below or via email. I'll get back to you as soon as possible.
          </p>

          <div className="space-y-8">
            {/* Contact Item: Name */}
            <div className="flex items-center gap-5 group">
              <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-white/50 mb-0.5">Name</span>
                <span className="text-[15px] font-medium text-white">RouteXpert Enterprise</span>
              </div>
            </div>

            {/* Contact Item: Location */}
            <div className="flex items-center gap-5 group">
              <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-white/50 mb-0.5">Location</span>
                <span className="text-[15px] font-medium text-white">Mumbai, INDIA</span>
              </div>
            </div>

            {/* Contact Item: Phone */}
            <div className="flex items-center gap-5 group">
              <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-white/50 mb-0.5">Phone</span>
                <span className="text-[15px] font-medium text-white">+91 99706 54553</span>
              </div>
            </div>

            {/* Contact Item: Email */}
            <div className="flex items-center gap-5 group">
              <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-white/50 mb-0.5">Email</span>
                <span className="text-[15px] font-medium text-white">routexpertenterprize@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="flex flex-col">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Message Me</h2>
          
          <div className="bg-[#1a1f2e]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <form className="flex flex-col gap-5 relative z-10" onSubmit={handleSend}>
              
              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name" 
                  required
                  disabled={isSubmitting}
                  className="w-full bg-transparent border border-white/10 rounded-2xl py-4 px-5 text-[15px] text-white font-light focus:border-cyan-400 focus:bg-white/5 outline-none transition-all placeholder:text-white/30 disabled:opacity-50"
                />
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Your Email" 
                  required
                  disabled={isSubmitting}
                  className="w-full bg-transparent border border-white/10 rounded-2xl py-4 px-5 text-[15px] text-white font-light focus:border-cyan-400 focus:bg-white/5 outline-none transition-all placeholder:text-white/30 disabled:opacity-50"
                />
              </div>

              {/* Row 2: Subject */}
              <input 
                type="text" 
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Subject" 
                required
                disabled={isSubmitting}
                className="w-full bg-transparent border border-white/10 rounded-2xl py-4 px-5 text-[15px] text-white font-light focus:border-cyan-400 focus:bg-white/5 outline-none transition-all placeholder:text-white/30 disabled:opacity-50"
              />

              {/* Row 3: Message */}
              <textarea 
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your Message..." 
                rows={5}
                required
                disabled={isSubmitting}
                className="w-full bg-transparent border border-white/10 rounded-2xl py-4 px-5 text-[15px] text-white font-light focus:border-cyan-400 focus:bg-white/5 outline-none transition-all placeholder:text-white/30 resize-none disabled:opacity-50"
              ></textarea>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isSubmitting || isSuccess}
                className={`mt-2 w-full py-4 rounded-2xl text-white font-bold tracking-wide uppercase transition-all shadow-[0_10px_30px_rgba(6,182,212,0.3)] flex items-center justify-center gap-3 ${
                  isSuccess 
                    ? 'bg-emerald-500 hover:bg-emerald-600' 
                    : 'bg-gradient-to-r from-cyan-400 to-purple-500 hover:opacity-90'
                } disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    SENDING...
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    MESSAGE SENT
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    SEND MESSAGE
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
