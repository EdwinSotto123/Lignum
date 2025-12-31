import React, { useState, useEffect, useRef } from 'react';
import { StoryPlan, Scene } from '../types';

interface StoryViewerProps {
  story: StoryPlan;
  onReset: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ story, onReset }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quizState, setQuizState] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const currentScene = story.scenes[currentIndex];

  useEffect(() => {
    // Initialize Audio Context on mount
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    }
  }, []);

  // Reset quiz state when scene changes
  useEffect(() => {
    setQuizState('unanswered');
    setSelectedOption(null);
  }, [currentIndex]);

  const playAudio = async (buffer?: AudioBuffer) => {
    if (!buffer || !audioContextRef.current) return;

    // Stop previous if playing
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    if(audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const stopAudio = () => {
      if(sourceNodeRef.current) {
          sourceNodeRef.current.stop();
          setIsPlaying(false);
      }
  }

  // Auto-play audio when slide changes
  useEffect(() => {
    stopAudio();
    if (currentScene.generatedAudioBuffer) {
      const timer = setTimeout(() => {
          playAudio(currentScene.generatedAudioBuffer);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentScene]);

  const handleNext = () => {
    if (currentIndex < story.scenes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleOptionClick = (index: number) => {
    if (quizState === 'correct') return; // Lock if already correct

    setSelectedOption(index);
    if (index === currentScene.quiz.correctAnswerIndex) {
      setQuizState('correct');
      // Optional sound effect for correct answer could go here
    } else {
      setQuizState('incorrect');
      // Shake effect timeout
      setTimeout(() => setQuizState('unanswered'), 1000);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-bold text-kid-purple">{story.title}</h2>
           <span className="text-sm font-bold bg-kid-yellow px-2 py-1 rounded-md text-kid-purple">
             {currentIndex === 0 ? "Inicio" : 
              currentIndex === story.scenes.length - 1 ? "Desenlace" : "Nudo"}
           </span>
        </div>
        <button 
          onClick={onReset}
          className="bg-kid-pink text-white px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
        >
          Nuevo Dibujo ✏️
        </button>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Image Area */}
        <div className="w-full md:w-1/2 h-64 md:h-auto bg-gray-100 relative group">
          {currentScene.generatedImageUrl ? (
            <img 
              src={currentScene.generatedImageUrl} 
              alt={currentScene.imagePrompt} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="animate-pulse">Generando imagen...</span>
            </div>
          )}
          
          {/* Audio Play Button Overlay */}
           <button 
              onClick={(e) => {
                e.stopPropagation();
                isPlaying ? stopAudio() : playAudio(currentScene.generatedAudioBuffer)
              }}
              className={`absolute bottom-4 right-4 rounded-full p-4 shadow-lg transition-transform hover:scale-110 z-10 ${isPlaying ? 'bg-kid-pink text-white' : 'bg-white text-kid-blue'}`}
          >
              {isPlaying ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
              ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
          </button>
        </div>

        {/* Interaction Area */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col bg-white overflow-y-auto">
            {/* Story Text */}
            <div className="mb-6">
                <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-comic mb-4">
                    {currentScene.narrative}
                </p>
                
                {/* Educational Summary */}
                <div className="inline-block bg-kid-blue/10 px-4 py-2 rounded-full border border-kid-blue/30 mb-6">
                    <span className="text-kid-purple font-bold mr-2">💡 Aprende:</span>
                    <span className="text-gray-700">{currentScene.educationalSummary}</span>
                </div>
            </div>

            <hr className="border-t-2 border-dashed border-gray-100 mb-6" />

            {/* Interactive Quiz */}
            <div className="flex-1">
                <h3 className="text-lg font-bold text-kid-pink mb-3 flex items-center">
                    ❓ Pregunta Rápida
                    {quizState === 'correct' && <span className="ml-2 animate-bounce">🌟 ¡Muy bien!</span>}
                </h3>
                <p className="text-lg text-gray-700 font-medium mb-4">{currentScene.quiz.question}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentScene.quiz.options.map((option, idx) => {
                         const isSelected = selectedOption === idx;
                         const isCorrect = idx === currentScene.quiz.correctAnswerIndex;
                         
                         let btnClass = "p-4 rounded-xl border-2 text-lg font-bold transition-all transform hover:scale-102 ";
                         
                         if (quizState === 'correct') {
                             if (isCorrect) btnClass += "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-300";
                             else btnClass += "bg-gray-50 border-gray-200 text-gray-400 opacity-50";
                         } else if (quizState === 'incorrect' && isSelected) {
                             btnClass += "bg-red-100 border-red-500 text-red-700 animate-shake";
                         } else {
                             btnClass += "bg-white border-gray-200 hover:border-kid-blue hover:bg-blue-50 text-gray-600";
                         }

                         return (
                            <button
                                key={idx}
                                onClick={() => handleOptionClick(idx)}
                                disabled={quizState === 'correct'}
                                className={btnClass}
                            >
                                {option}
                            </button>
                         );
                    })}
                </div>
            </div>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none z-20">
            <button 
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`pointer-events-auto bg-white p-3 rounded-full shadow-lg border border-gray-100 transition-opacity ${currentIndex === 0 ? 'opacity-0' : 'opacity-100 hover:bg-gray-50'}`}
            >
                ⬅️ Anterior
            </button>
            
            <button 
                onClick={handleNext}
                disabled={currentIndex === story.scenes.length - 1}
                className={`pointer-events-auto flex items-center gap-2 px-6 py-3 rounded-full shadow-lg border-2 font-bold transition-all
                    ${quizState === 'correct' 
                        ? 'bg-kid-green border-kid-green text-white animate-pulse hover:scale-105' 
                        : 'bg-white border-gray-100 text-gray-400'}`}
            >
                Siguiente ➡️
            </button>
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;