import React from 'react';
import { IconSprout, IconHourglass, IconLibrary, IconTree, IconActivity } from './Icons';

const Problem: React.FC = () => {
  return (
    <section id="problem" className="py-24 bg-roots-950 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
           <h2 className="text-3xl md:text-4xl font-serif text-white">Why Connection Matters</h2>
           <p className="text-gray-500 mt-2">We miss opportunities to help today, and we leave silence tomorrow.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          
          {/* LEFT: LIFE PROBLEM */}
          <div className="bg-gradient-to-b from-canopy-900/10 to-transparent p-8 rounded-3xl border border-canopy-500/10 hover:border-canopy-500/30 transition-all group">
             <div className="w-12 h-12 rounded-full bg-canopy-900/30 flex items-center justify-center mb-6 text-canopy-400 group-hover:scale-110 transition-transform">
               <IconActivity className="w-6 h-6" />
             </div>
             <h3 className="text-2xl font-serif text-white mb-4">Too Busy to Help?</h3>
             <p className="text-gray-400 leading-relaxed mb-6">
               "I'm at work, I can't talk right now."
             </p>
             <p className="text-sm text-gray-500 leading-relaxed">
               Life moves fast. Often, we aren't there when our kids need a quick recipe, advice on a problem, or just a comforting word. We have the answers, but we aren't always available to give them.
             </p>
          </div>

          {/* RIGHT: DEATH PROBLEM */}
          <div className="bg-gradient-to-b from-legacy-900/10 to-transparent p-8 rounded-3xl border border-legacy-500/10 hover:border-legacy-500/30 transition-all group">
             <div className="w-12 h-12 rounded-full bg-legacy-900/20 flex items-center justify-center mb-6 text-legacy-400 group-hover:scale-110 transition-transform">
               <IconHourglass className="w-6 h-6" />
             </div>
             <h3 className="text-2xl font-serif text-white mb-4">Silence After Goodbye</h3>
             <p className="text-gray-400 leading-relaxed mb-6">
               "I wish I could ask him one last thing."
             </p>
             <p className="text-sm text-gray-500 leading-relaxed">
               When a loved one passes, their stories and advice often disappear with them. Photos are beautiful, but they can't speak, comfort, or guide us when we feel lost.
             </p>
          </div>

        </div>

        {/* Unified Solution Visual */}
        <div className="mt-16 relative rounded-2xl overflow-hidden h-64 md:h-80 group">
           <img 
             src="https://images.unsplash.com/photo-1534590373898-755734c75c35?q=80&w=2544&auto=format&fit=crop" 
             alt="Generations holding hands" 
             className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-700"
           />
           <div className="absolute inset-0 bg-gradient-to-r from-canopy-900/80 via-roots-950/50 to-legacy-900/80"></div>
           
           <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <IconTree className="w-10 h-10 text-white mb-4 opacity-80" />
              <h3 className="text-2xl md:text-3xl font-serif text-white max-w-2xl">
                LIGNUM bridges the gap between<br/>
                <span className="text-canopy-400">Helping Today</span> and <span className="text-legacy-400">Loving Forever</span>.
              </h3>
           </div>
        </div>

      </div>
    </section>
  );
};

export default Problem;