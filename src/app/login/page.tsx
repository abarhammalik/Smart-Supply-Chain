import ParticleBackground from '@/components/ParticleBackground'
import CustomCursor from '@/components/CustomCursor'
import LoginForm from './LoginForm'

export default function LoginPage({ searchParams }: { searchParams: { error: string } }) {
  return (
    <div className="relative w-full min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
      <CustomCursor />
      <ParticleBackground />
      <LoginForm error={searchParams?.error} />
    </div>
  )
}
