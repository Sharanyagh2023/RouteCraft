import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Navigation,
  MapPin,
  ShieldAlert,
  Route,
  ChevronRight,
  Clock,
  Layers,
  Share2,
  Shield,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ---------------- Animations ---------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const glowVariants = {
  visible: { scale: 1, opacity: 1 },
  pulse: {
    boxShadow: [
      '0 0 20px rgba(79,209,197,0.4)',
      '0 0 50px rgba(79,209,197,0.7)',
      '0 0 20px rgba(79,209,197,0.4)',
    ],
    transition: { duration: 3, repeat: Infinity },
  },
};

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
};

const ctaVariants = {
  pulse: {
    boxShadow: [
      '0 0 15px rgba(79,209,197,0.3)',
      '0 0 30px rgba(79,209,197,0.6)',
      '0 0 15px rgba(79,209,197,0.3)',
    ],
    transition: { duration: 2.5, repeat: Infinity },
  },
};

/* ---------------- Component ---------------- */

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[420px] mx-auto bg-background flex flex-col min-h-screen overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          animate={{ y: [-20, 20, -20] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/20 blur-[120px] rounded-full"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 pt-14 text-center"
        >
          <motion.div
            variants={glowVariants}
            animate="pulse"
            className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-primary/20"
          >
            <Route className="text-primary w-10 h-10" />
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl font-black text-primary"
          >
            ROUTECRAFT
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xs uppercase tracking-widest text-muted-foreground mt-2"
          >
            Smart Multi-Modal Travel Companion
          </motion.p>

          <motion.p
            variants={itemVariants}
            className="text-sm text-muted-foreground mt-4"
          >
            Plan smarter journeys across metro, bus, auto and cabs with real-time tracking.
          </motion.p>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-4 px-6 mt-8"
        >

          {[ 
            { icon: Navigation, title: "Smart Routing", desc: "AI optimized routes" },
            { icon: MapPin, title: "Live Tracking", desc: "Real-time location" },
            { icon: ShieldAlert, title: "SOS", desc: "Emergency alerts" },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              initial="rest"
              whileHover="hover"
              animate="rest"
              className="glass p-4 rounded-2xl text-center"
            >
              <motion.div variants={cardHoverVariants}>
                <item.icon className="mx-auto text-primary mb-2" />
                <p className="text-xs font-bold">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </motion.div>
            </motion.div>
          ))}

        </motion.div>

        {/* Journey Card */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="px-6 mt-8"
        >
          <div className="glass p-5 rounded-3xl">

            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-primary w-4 h-4" />
              <p className="text-xs font-bold text-primary">Journey Overview</p>
            </div>

            {/* Journey preview animation */}
            <div className="h-36 rounded-xl mb-4 flex items-center justify-center text-xs relative overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-background border border-primary/20">
              {/* Animated background blobs */}
              <motion.div
                animate={{ x: [0, 20, 0], y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-2 left-4 w-16 h-16 bg-emerald-400/30 rounded-full blur-xl"
              />
              <motion.div
                animate={{ x: [0, -15, 0], y: [0, 15, 0], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute bottom-2 right-6 w-14 h-14 bg-teal-400/30 rounded-full blur-xl"
              />

              <svg
                className="w-full h-full relative z-10"
                viewBox="0 0 200 100"
                preserveAspectRatio="none"
              >
                {/* Glow filter */}
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>

                {/* Background route segments */}
                <path
                  d="M 20,50 C 40,20 80,20 100,50 S 160,80 180,50"
                  fill="transparent"
                  strokeWidth="4"
                  stroke="rgba(79,209,197,0.15)"
                  strokeLinecap="round"
                />

                {/* Animated route path */}
                <motion.path
                  d="M 20,50 C 40,20 80,20 100,50 S 160,80 180,50"
                  fill="transparent"
                  strokeWidth="3"
                  stroke="url(#routeGrad)"
                  strokeLinecap="round"
                  filter="url(#glow)"
                  strokeDasharray="300"
                  strokeDashoffset="300"
                  initial={{ strokeDashoffset: 300 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatType: 'loop', ease: 'linear' }}
                />

                {/* Start point */}
                <motion.circle
                  cx="20"
                  cy="50"
                  r="4"
                  fill="#34d399"
                  filter="url(#glow)"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ delay: 0.2, duration: 1.5, repeat: Infinity }}
                />
                <text x="20" y="65" textAnchor="middle" fill="#34d399" fontSize="8" fontWeight="bold">A</text>

                {/* Mid pivot point */}
                <motion.circle
                  cx="100"
                  cy="50"
                  r="3"
                  fill="#2dd4bf"
                  filter="url(#glow)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                />

                {/* End point */}
                <motion.circle
                  cx="180"
                  cy="50"
                  r="4"
                  fill="#22d3ee"
                  filter="url(#glow)"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ delay: 2.5, duration: 1.5, repeat: Infinity }}
                />
                <text x="180" y="65" textAnchor="middle" fill="#22d3ee" fontSize="8" fontWeight="bold">B</text>

                {/* Traveling dot */}
                <motion.circle
                  r="3"
                  fill="#ffffff"
                  filter="url(#glow)"
                  initial={{ offsetDistance: '0%' }}
                  animate={{ offsetDistance: '100%' }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  style={{ offsetPath: "path('M 20,50 C 40,20 80,20 100,50 S 160,80 180,50')" }}
                />
              </svg>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>⏱ 15 min</div>
              <div>🚆 3 Modes</div>
              <div>🔄 2 Transfers</div>
              <div>🛡 Safe Travel</div>
            </div>

          </div>
        </motion.div>

        {/* Why */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="px-6 mt-8"
        >
          <div className="glass p-4 rounded-2xl">
            <p className="text-xs font-bold">Why RouteCraft?</p>
            <p className="text-xs text-muted-foreground">
              Smarter routes • Real-time updates • Safe journeys
            </p>
          </div>
        </motion.div>

      </div>

      {/* CTA */}
      <div className="p-6">
        <motion.div variants={ctaVariants} animate="pulse">
          <Button
            onClick={() => navigate('/login')}
            className="w-full h-14 rounded-full text-lg font-bold"
          >
            Get Started <ChevronRight />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}