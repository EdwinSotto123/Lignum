import React from 'react';
import { 
  IconUtensils, 
  IconShield, 
  IconJournal, 
  IconFeather,
  IconTree
} from './Icons';
import { ModuleFeature } from '../types';

const modules: ModuleFeature[] = [
  {
    id: '01',
    title: 'Your Kitchen Helper',
    subtitle: 'Help with Daily Tasks',
    description: 'Be in two places at once. If your daughter asks "Mom, the rice is sticky!", the app replies with your voice and your trick: "Honey, just use the parchment paper trick I showed you."',
    icon: <IconUtensils className="w-6 h-6 text-sap-400" />,
    techStack: 'Sharing Skills'
  },
  {
    id: '02',
    title: 'Your Values',
    subtitle: 'Moral Compass',
    description: 'Share your thoughts on money, honesty, and family. Even if you are gone, your family can ask for advice and receive answers that match your true beliefs and personality.',
    icon: <IconShield className="w-6 h-6 text-canopy-400" />,
    techStack: 'Decision Guide'
  },
  {
    id: '03',
    title: 'Daily Memories',
    subtitle: 'Building a Legacy',
    description: 'A simple daily question: "What did you learn today?" We collect these answers to build a living story of your life, creating a treasure chest of wisdom for your kids.',
    icon: <IconJournal className="w-6 h-6 text-blue-400" />,
    techStack: 'Journaling'
  },
  {
    id: '04',
    title: 'Story Time',
    subtitle: 'Grandpa\'s Tales',
    description: 'Grandparents record stories from their youth. We turn them into bedtime stories where Grandpa\'s voice narrates the tale, and he can even answer simple questions about it.',
    icon: <IconFeather className="w-6 h-6 text-purple-400" />,
    techStack: 'Storytelling'
  }
];

const Solution: React.FC = () => {
  return (
    <section id="solution" className="py-24 bg-roots-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-2 mb-4 text-canopy-500">
            <IconTree className="w-5 h-5" />
            <span className="uppercase tracking-widest text-sm font-semibold">How It Works</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">A Network of Wisdom</h2>
          <p className="max-w-3xl mx-auto text-gray-400 text-lg">
            We use smart technology to capture your voice and personality, creating a private family network that is useful today and priceless tomorrow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {modules.map((module) => (
            <div key={module.id} className="group bg-roots-900 border border-white/5 rounded-2xl p-8 hover:border-canopy-500/30 transition-all duration-500 hover:bg-roots-800 relative overflow-hidden">
              
              {/* Hover Glow Effect */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-canopy-500/5 rounded-full blur-[60px] group-hover:bg-canopy-500/10 transition-colors opacity-0 group-hover:opacity-100 duration-500" />

              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors shadow-inner border border-white/5 group-hover:border-canopy-500/20">
                  {module.icon}
                </div>
                <span className="text-xs font-mono text-gray-500 border border-white/5 px-2 py-1 rounded bg-roots-950">
                  {module.id}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-1 relative z-10 group-hover:text-canopy-100 transition-colors">{module.title}</h3>
              <p className="text-sm text-sap-400 mb-5 font-medium uppercase tracking-wide relative z-10 opacity-80">{module.subtitle}</p>
              
              <p className="text-gray-400 text-base leading-relaxed mb-8 relative z-10 border-b border-white/5 pb-8 group-hover:border-white/10">
                {module.description}
              </p>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-sap-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                <p className="text-xs text-gray-500 font-mono tracking-tight uppercase">
                  Features: <span className="text-gray-400">{module.techStack}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solution;