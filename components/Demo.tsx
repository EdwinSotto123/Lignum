import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';
import { IconMic, IconTree, IconActivity, IconHourglass } from './Icons';

const Demo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello darling. I am here. Do you need help with something right now, or do you just want to talk?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'active' | 'legacy'>('active');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    // Heuristic to switch mode based on keywords (for visual effect)
    const lowerInput = userMessage.toLowerCase();
    if (lowerInput.includes('miss') || lowerInput.includes('sad') || lowerInput.includes('advice') || lowerInput.includes('love') || lowerInput.includes('fear')) {
      setMode('legacy');
    } else {
      setMode('active');
    }

    try {
      const response = await sendMessageToGemini(userMessage);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Honey, the signal is weak. Tell me that again?", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="demo" className="py-24 bg-roots-900 border-y border-white/5 relative overflow-hidden">
      {/* Background Transition based on Mode */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${
        mode === 'active' ? 'bg-gradient-to-b from-canopy-900/20 to-roots-950' : 'bg-gradient-to-b from-legacy-900/20 to-roots-950'
      }`}></div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Explanation */}
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 border transition-colors duration-500 ${
              mode === 'active' 
                ? 'bg-canopy-500/10 text-canopy-400 border-canopy-500/20' 
                : 'bg-legacy-500/10 text-legacy-400 border-legacy-500/20'
            }`}>
              {mode === 'active' ? <IconActivity className="w-4 h-4" /> : <IconHourglass className="w-4 h-4" />}
              {mode === 'active' ? 'Mode: Active Helper' : 'Mode: Deep Memory'}
            </div>
            
            <h2 className="text-4xl font-serif text-white mb-6">One App. Two Uses.</h2>
            <p className="text-gray-400 text-lg mb-8">
              LIGNUM adapts to what you need. It can be a practical tool for busy days, or a source of comfort when you miss someone.
            </p>
            
            <div className="space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Try Active Prompts (Green)</p>
              {[
                "Mom, the rice is getting sticky!",
                "Quick, how do I get a stain out of this shirt?"
              ].map((prompt, i) => (
                <button 
                  key={i}
                  onClick={() => { setInput(prompt); setMode('active'); }}
                  className="w-full text-left px-5 py-3 rounded-xl bg-canopy-900/10 hover:bg-canopy-900/20 border border-white/5 hover:border-canopy-500/30 transition-all text-sm text-gray-300 hover:text-white group"
                >
                  "{prompt}"
                </button>
              ))}

              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-6">Try Memory Prompts (Gold)</p>
              {[
                "I feel so lonely without you.",
                "I'm afraid I'm making a mistake with my life."
              ].map((prompt, i) => (
                <button 
                  key={i}
                  onClick={() => { setInput(prompt); setMode('legacy'); }}
                  className="w-full text-left px-5 py-3 rounded-xl bg-legacy-900/10 hover:bg-legacy-900/20 border border-white/5 hover:border-legacy-500/30 transition-all text-sm text-gray-300 hover:text-white group"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          {/* Right: Interface */}
          <div className="relative mx-auto w-full max-w-sm group">
            
            {/* Glow behind phone changes color */}
            <div className={`absolute -inset-1 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-75 transition-all duration-1000 ${
              mode === 'active' ? 'bg-gradient-to-b from-canopy-500/20 to-canopy-600/20' : 'bg-gradient-to-b from-legacy-500/20 to-legacy-600/20'
            }`}></div>

            {/* Phone/Device Frame */}
            <div className="bg-roots-950 rounded-[3rem] p-3 border-4 border-roots-800 shadow-2xl relative z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-roots-950 rounded-b-xl z-20"></div>
              
              <div className="bg-roots-900 rounded-[2.2rem] overflow-hidden h-[600px] flex flex-col relative">
                
                {/* Visualizer Header */}
                <div className={`p-6 pt-12 text-center pb-8 border-b border-white/5 transition-colors duration-700 ${
                   mode === 'active' ? 'bg-gradient-to-b from-canopy-900/20 to-roots-900' : 'bg-gradient-to-b from-legacy-900/20 to-roots-900'
                }`}>
                  <div className="flex justify-center items-center gap-2 mb-4 opacity-70">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${mode === 'active' ? 'bg-canopy-400' : 'bg-legacy-400'}`}></span>
                    <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${mode === 'active' ? 'text-canopy-400' : 'text-legacy-400'}`}>
                      {mode === 'active' ? 'Active • Online' : 'Legacy • Eternal'}
                    </p>
                  </div>
                  
                  <div className="relative inline-block mb-4">
                    <div className={`w-24 h-24 mx-auto rounded-full p-[2px] relative z-10 transition-colors duration-500 ${
                      mode === 'active' ? 'bg-gradient-to-tr from-canopy-400 to-white' : 'bg-gradient-to-tr from-legacy-400 to-legacy-600'
                    }`}>
                      <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&h=200&fit=crop" alt="Mom" className="w-full h-full rounded-full object-cover border-4 border-roots-900" />
                    </div>
                  </div>
                  
                  <h3 className="text-white text-2xl font-serif">Mom</h3>
                </div>

                {/* Chat Stream */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
                   {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-colors duration-500 ${
                        msg.role === 'user' 
                          ? 'bg-roots-800 text-white rounded-br-none border border-white/5' 
                          : mode === 'active' 
                             ? 'bg-canopy-900/20 text-canopy-100 border border-canopy-500/20 rounded-bl-none'
                             : 'bg-legacy-900/20 text-legacy-100 border border-legacy-500/20 rounded-bl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                     <div className="flex flex-col items-start animate-fade-in">
                       <div className={`px-4 py-2 text-xs flex items-center gap-2 ${mode === 'active' ? 'text-canopy-400' : 'text-legacy-400'}`}>
                         <IconTree className="w-3 h-3 animate-bounce" />
                         Thinking...
                       </div>
                     </div>
                  )}
                </div>

                {/* Input Controls */}
                <div className="p-4 bg-roots-950/80 backdrop-blur-md absolute bottom-0 w-full border-t border-white/5">
                   <form onSubmit={handleSend} className="relative">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Talk to Mom..."
                        className={`w-full bg-roots-800 text-white rounded-full py-4 pl-6 pr-14 text-sm border border-white/10 focus:outline-none transition-all shadow-inner ${
                          mode === 'active' ? 'focus:border-canopy-500/50' : 'focus:border-legacy-500/50'
                        }`}
                      />
                      <button 
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white disabled:bg-gray-800 disabled:text-gray-600 transition-all hover:scale-105 active:scale-95 shadow-lg ${
                          mode === 'active' ? 'bg-canopy-600' : 'bg-legacy-600'
                        }`}
                      >
                         {isLoading ? <div className="w-4 h-4 border-2 border-roots-900 border-t-transparent rounded-full animate-spin" /> : <IconMic className="w-5 h-5" />}
                      </button>
                   </form>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Demo;