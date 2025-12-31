import React from 'react';
import { IconTree } from './Icons';

const Footer: React.FC = () => {
  return (
    <footer className="bg-roots-950 border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-canopy-600 flex items-center justify-center text-roots-950">
             <IconTree className="w-4 h-4" />
          </div>
          <span className="text-gray-400 font-serif">LIGNUM © 2024</span>
        </div>
        
        <div className="text-gray-600 text-sm">
          Roots Deep. Branches High. Always Present.
        </div>

        <div className="flex gap-6">
          <a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Privacy Policy</a>
          <a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;