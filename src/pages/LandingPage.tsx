import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
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

// Stagger container animation
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

// Item animation
const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

// Glow animation for logo
const glowVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
  pulse: {
    boxShadow: [
      '0 0 20px rgba(79, 209, 197, 0.4)',
      '0 0 50px rgba(79, 209, 197, 0.7)',
      '0 0 20px rgba(79, 209, 197, 0.4)',
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Card hover animation
const cardHoverVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.04,
    transition: { duration: 0.3 },
  },
};

// CTA button animation
const ctaVariants = {
  pulse: {
    boxShadow: [
      '0 0 15px rgba(79, 209, 197, 0.3)',
      '0 0 30px rgba(79, 209, 197, 0.6)',
      '0 0 15px rgba(79, 209, 197, 0.3)',
    ],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[420px] mx-auto bg-background flex flex-col relative overflow-hidden">
      {/* Animated background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ y: [-30, 30, -30] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-250px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{ y: [30, -30, 30] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-300px] right-[-150px] w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px]"
        />
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {/* Hero Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 pt-14 pb-8 text-center"
        >
          {/* Logo with pulse glow */}
          <motion.div
            variants={glowVariants}
            animate={['visible', 'pulse']}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 mb-8 border border-primary/20"
            style={{
              boxShadow: '0 0 30px rgba(79, 209, 197, 0.5)',
            }}
          >
            <Route className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </motion.div>

          {/* Title */}
          <motion.div variants={itemVariants} className="mb-3">
            <h1 className="text-5xl font-black tracking-tight text-primary leading-tight">
              ROUTECRAFT
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div variants={itemVariants}>
            <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
              Smart Multi-Modal Travel Companion
            </p>
          </motion.div>

          {/* Description */}
          <motion.div variants={itemVariants}>
            <p className="text-sm text-muted-foreground/80 leading-relaxed px-1">
              Plan smarter journeys across metro, bus, auto, and cabs with real-time optimization
              and live safety tracking.
            </p>
          </motion.div>
        </motion.div>

        {/* Feature Cards Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="px-6 mb-8"
        >
          <div className="grid grid-cols-3 gap-4">
            {/* Smart Routing Card */}
            <motion.div
              variants={itemVariants}
              whileHover="hover"
              initial="rest"
              animate="rest"
              variants={cardHoverVariants}
              className="glass rounded-3xl p-5 flex flex-col items-center text-center gap-3 border border-white/10 cursor-pointer backdrop-blur-md transition-all"
            >
              <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl border border-primary/20">
                <Navigation className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
                  Smart Routing
                </p>
                <p className="text-[8px] text-muted-foreground/70 mt-1 leading-tight">
                  AI-powered routes across all modes
                </p>
              </div>
            </motion.div>

            {/* Live Tracking Card */}
            <motion.div
              variants={itemVariants}
              whileHover="hover"
              initial="rest"
              animate="rest"
              variants={cardHoverVariants}
              className="glass rounded-3xl p-5 flex flex-col items-center text-center gap-3 border border-white/10 cursor-pointer backdrop-blur-md transition-all"
            >
              <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl border border-primary/20">
                <MapPin className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
                  Live Tracking
                </p>
                <p className="text-[8px] text-muted-foreground/70 mt-1 leading-tight">
                  Share location and track in real-time
                </p>
              </div>
            </motion.div>

            {/* SOS Emergency Card */}
            <motion.div
              variants={itemVariants}
              whileHover="hover"
              initial="rest"
              animate="rest"
              variants={cardHoverVariants}
              className="glass rounded-3xl p-5 flex flex-col items-center text-center gap-3 border border-white/10 cursor-pointer backdrop-blur-md transition-all"
            >
              <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl border border-primary/20">
                <ShieldAlert className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
                  SOS Emergency
                </p>
                <p className="text-[8px] text-muted-foreground/70 mt-1 leading-tight">
                  One-tap SOS with instant alerts
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Journey Overview Section */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="px-6 mb-8"
        >
          <div className="glass rounded-3xl border border-white/10 overflow-hidden backdrop-blur-md">
            {/* Section header */}
            <div className="px-5 pt-5 pb-3 border-b border-white/5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-primary">
                Journey Overview
              </h3>
            </div>

            {/* Map preview and info grid */}
            <div className="p-5 flex flex-col gap-4">
              {/* Map Container */}
              <div className="relative rounded-2xl overflow-hidden h-48 bg-background/50 border border-white/5">
                {/* Grid pattern background */}
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(79,209,197,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,209,197,0.1) 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                  }}
                />

                {/* Road lines */}
                <div className="absolute top-[25%] left-0 right-0 h-px bg-white/15" />
                <div className="absolute top-[70%] left-0 right-0 h-px bg-white/15" />
                <div className="absolute left-[20%] top-0 bottom-0 w-px bg-white/15" />
                <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/15" />

                {/* Route line SVG */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <motion.path
                    d="M 50 110 Q 90 70 130 85 T 210 55"
                    fill="none"
                    stroke="rgba(79,209,197,0.7)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.5, delay: 0.6, ease: 'easeInOut' }}
                  />
                </svg>

                {/* Start point */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2, type: 'spring', stiffness: 120 }}
                  className="absolute top-[35%] left-[15%] w-4 h-4 bg-primary rounded-full border-2 border-background z-10"
                  style={{
                    boxShadow: '0 0 15px rgba(79, 209, 197, 1)',
                  }}
                />

                {/* End point */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.4, type: 'spring', stiffness: 120 }}
                  className="absolute top-[15%] left-[72%] w-4 h-4 bg-emerald-400 rounded-full border-2 border-background z-10"
                  style={{
                    boxShadow: '0 0 15px rgba(52, 211, 153, 1)',
                  }}
                />

                {/* Animated moving dot */}
                <motion.div
                  initial={{ offsetDistance: '0%', opacity: 1 }}
                  animate={{ offsetDistance: '100%', opacity: 1 }}
                  transition={{
                    duration: 4,
                    delay: 2,
                    repeat: Infinity,
                    repeatType: 'loop',
                    ease: 'linear',
                  }}
                  className="absolute w-2.5 h-2.5 bg-primary rounded-full z-5"
                  style={{
                    offsetPath: 'path("M 50 110 Q 90 70 130 85 T 210 55")',
                    boxShadow: '0 0 12px rgba(79, 209, 197, 1)',
                  }}
                />

                {/* Glow dots */}
                <motion.div
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute top-[42%] left-[50%] w-2 h-2 rounded-full bg-primary/70 blur-sm"
                />
              </div>

              {/* Info cards grid - 2 rows x 2 columns */}
              <div className="grid grid-cols-2 gap-3">
                {/* Duration */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  className="bg-white/5 rounded-xl p-3 border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">
                      Duration
                    </p>
                  </div>
                  <p className="text-xs font-black text-primary">~15 min</p>
                </motion.div>

                {/* Modes */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6, duration: 0.5 }}
                  className="bg-white/5 rounded-xl p-3 border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">
                      Modes
                    </p>
                  </div>
                  <p className="text-xs font-black text-primary">3 Modes</p>
                </motion.div>

                {/* Transfers */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.7, duration: 0.5 }}
                  className="bg-white/5 rounded-xl p-3 border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Share2 className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">
                      Transfers
                    </p>
                  </div>
                  <p className="text-xs font-black text-primary">2 Transfers</p>
                </motion.div>

                {/* Safe Journey */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8, duration: 0.5 }}
                  className="bg-white/5 rounded-xl p-3 border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">
                      Safety
                    </p>
                  </div>
                  <p className="text-xs font-black text-primary">Live Tracking</p>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Why RouteCraft Section */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
          className="px-6 mb-8"
        >
          <div className="glass rounded-3xl border border-white/10 p-5 backdrop-blur-md overflow-hidden group cursor-pointer hover:border-primary/40 transition-colors">
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Why RouteCraft?
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  Real-time updates • Smarter routes • Safer journeys
                </p>
              </div>
              {/* Icon illustration */}
              <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 flex items-center justify-center">
                  <div className="text-2xl">🚌</div>
                </div>
                <div className="w-12 h-12 flex items-center justify-center">
                  <div className="text-2xl">🚗</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Spacing */}
        <div className="h-4" />
      </div>

      {/* Sticky CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="relative z-10 p-6 bg-gradient-to-t from-background via-background/98 to-transparent backdrop-blur-md"
      >
        <motion.div
          animate="pulse"
          variants={ctaVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative"
        >
          <Button
            onClick={() => navigate('/login')}
            className="w-full h-14 rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 text-background font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300"
            style={{
              boxShadow: '0 0 20px rgba(79, 209, 197, 0.6)',
            }}
          >
            Get Started
            <ChevronRight className="w-5 h-5" />
          </Button>
        </motion.div>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-3 uppercase tracking-widest font-bold">
          Free Multi-Modal Travel Planner
        </p>
      </motion.div>
    </div>
  );
}

