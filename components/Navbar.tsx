import React, { useState, useEffect } from 'react';
import { IconTree } from './Icons';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-roots-950/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-canopy-600 to-canopy-400 flex items-center justify-center text-roots-950">
              <IconTree className="w-5 h-5" />
            </div>
            <span className="font-serif text-2xl text-white tracking-wide">LIGNUM</span>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#problem" className="text-gray-300 hover:text-canopy-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Why Lignum</a>
              <a href="#solution" className="text-gray-300 hover:text-canopy-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">The Modules</a>
              <a href="#/app" className="text-gray-300 hover:text-canopy-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Live Demo</a>
            </div>
          </div>

          <div>
            <a href="#waitlist" className="bg-white/5 hover:bg-canopy-600 hover:text-white text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border border-white/10 hover:border-canopy-500 shadow-lg hover:shadow-canopy-500/20">
              Plant Your Tree
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;