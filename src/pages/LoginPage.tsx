import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, ArrowRight, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user?.email) {
          navigate('/dashboard', { replace: true });
        }
      } catch {
        // ignore
      }
    }
  }, [navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const name = email.split('@')[0];
    localStorage.setItem('user', JSON.stringify({ name, email }));
    navigate('/dashboard');
  };

  return (
    <div className="max-w-[420px] mx-auto h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[260px] h-[260px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 flex flex-col px-6 py-8 z-10">
        {/* Back to landing */}
        <button
          onClick={() => navigate('/')}
          className="self-start flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-xs font-bold uppercase tracking-wider"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-10"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4 glow-teal">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to continue your journey.</p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-none pl-10 text-sm font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-none pl-10 text-sm font-medium"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest glow-teal mt-2"
          >
            Sign In
          </Button>
        </motion.form>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-auto pt-8 text-center"
        >
          <p className="text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-primary font-bold hover:underline"
            >
              Sign up
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

