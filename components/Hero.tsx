import React from 'react';
import { IconArrowRight, IconMic, IconNetwork, IconActivity, IconTree, IconHourglass } from './Icons';

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen flex flex-col md:flex-row pt-20 md:pt-0">

      {/* LEFT SIDE: LIFE & PRESENCE (Green) */}
      <div className="relative w-full md:w-1/2 min-h-[50vh] md:min-h-screen bg-canopy-900/40 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-canopy-900/80 to-roots-950/90 z-0"></div>
        {/* Animated Sprout Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="w-96 h-96 bg-canopy-500 rounded-full blur-[100px] animate-pulse"></div>
        </div>

        <div className="relative z-10 p-8 md:p-16 text-left max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-canopy-500/20 text-canopy-300 text-xs font-bold uppercase tracking-wider mb-6 border border-canopy-500/30">
            <IconActivity className="w-4 h-4" />
            For Today (Active Help)
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-6 leading-tight">
            Be There<br />
            <span className="text-canopy-400">Anytime.</span>
          </h1>
          <p className="text-canopy-100/80 text-lg mb-8 font-light leading-relaxed">
            Don't miss a moment. Help your family with dinner or homework, even when you are stuck at the office. Your voice and advice are always available.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#/app" className="bg-canopy-600 hover:bg-canopy-500 text-white px-8 py-3 rounded-full font-semibold transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-canopy-500/20">
              🚀 LIVE DEMO
            </a>
            <a href="#demo" className="inline-flex items-center gap-2 text-white font-semibold border-b border-canopy-500 pb-1 hover:text-canopy-400 transition-colors">
              See How It Works <IconArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: LEGACY & MEMORY (Gold/Dark) */}
      <div className="relative w-full md:w-1/2 min-h-[50vh] md:min-h-screen bg-roots-950 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tl from-black to-roots-900 z-0"></div>
        {/* Animated Gold Background */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-legacy-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-16 text-left md:text-right max-w-xl">
          <div className="inline-flex md:flex-row-reverse items-center gap-2 px-3 py-1 rounded-full bg-legacy-500/10 text-legacy-400 text-xs font-bold uppercase tracking-wider mb-6 border border-legacy-500/20">
            <IconHourglass className="w-4 h-4" />
            For Tomorrow (Forever)
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-6 leading-tight">
            Love Them<br />
            <span className="text-legacy-400">Forever.</span>
          </h1>
          <p className="text-legacy-100/60 text-lg mb-8 font-light leading-relaxed">
            When you are gone, your wisdom stays. Leave behind a guide that comforts your children and grandchildren with your voice and values.
          </p>
          <div className="flex md:justify-end">
            <a href="#waitlist" className="bg-legacy-500/20 hover:bg-legacy-500/30 text-legacy-100 px-8 py-3 rounded-full border border-legacy-500/40 transition-all flex items-center gap-2">
              Plant Your Roots <IconTree className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Center Connector (Desktop Only) */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-24 h-24 rounded-full bg-roots-950 border-4 border-white/5 items-center justify-center shadow-2xl backdrop-blur-sm">
        <IconNetwork className="w-8 h-8 text-gray-500" />
      </div>

    </section>
  );
};

export default Hero;