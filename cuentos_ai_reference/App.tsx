import React, { useState, useRef, useEffect } from 'react';
import Canvas, { CanvasRef } from './components/Canvas';
import StoryViewer from './components/StoryViewer';
import BrushPreview from './components/BrushPreview';
import { generateStoryPlan, generateSceneImage, generateSpeech, generatePromptFromDrawing, generateQuizFromImage } from './services/geminiService';
import { AppState, DrawingTool, StoryPlan, Scene, VoiceName } from './types';

function App() {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.DRAWING);
  const [tool, setTool] = useState<DrawingTool>({ type: 'marker', color: '#000000', width: 5 });
  const [promptText, setPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [story, setStory] = useState<StoryPlan | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Story Config State
  const [age, setAge] = useState<number>(5);
  const [voice, setVoice] = useState<VoiceName>('Puck');

  // Color State
  const [savedColors, setSavedColors] = useState<string[]>([
      '#000000', '#FF3B30', '#FF9500', '#FFCC00', 
      '#4CD964', '#5AC8FA', '#007AFF', '#5856D6'
  ]);

  const canvasRef = useRef<CanvasRef>(null);

  // Speech Recognition Setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPromptText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setPromptText('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleAddFavoriteColor = () => {
    if (!savedColors.includes(tool.color)) {
        setSavedColors([...savedColors, tool.color]);
    }
  };

  const handleSurpriseMe = async () => {
    const drawingData = canvasRef.current?.getImageData();
    if (!drawingData) {
        alert("¡Dibuja algo primero para que la IA pueda inspirarse!");
        return;
    }

    try {
        setLoadingMessage("Analizando tu dibujo...");
        setAppState(AppState.GENERATING_PLAN); // Use visual loading state for analysis too
        
        const generatedPrompt = await generatePromptFromDrawing(drawingData);
        setPromptText(generatedPrompt);
        
        // Return to drawing state but with prompt filled
        setAppState(AppState.DRAWING); 
    } catch (error) {
        console.error(error);
        setAppState(AppState.DRAWING); // Reset if fails
        alert("No pude ver bien tu dibujo, inténtalo de nuevo.");
    }
  };

  const handleGenerate = async () => {
    if (!promptText) {
        alert("Por favor, dime de qué quieres que trate el cuento (usa el micrófono).");
        return;
    }

    const drawingData = canvasRef.current?.getImageData();
    if (!drawingData) return;

    try {
      setAppState(AppState.GENERATING_PLAN);
      setErrorMsg('');
      setLoadingMessage(`Escribiendo un cuento para ${age} años... 🧠`);

      // 1. Get Initial Story Plan
      const plan = await generateStoryPlan(drawingData, promptText, age);
      setStory(plan);

      setAppState(AppState.GENERATING_ASSETS);
      setLoadingMessage('Dibujando escenas... 🎨');

      // 2. Process Scenes SEQUENTIALLY per scene relative to image->quiz, but scenes can be parallel
      // We need to generate the Image FIRST, then use that image to generate the Quiz + Audio
      const enrichedScenes: Scene[] = await Promise.all(
        plan.scenes.map(async (scene) => {
          try {
            // A. Generate Image First
            const generatedImgUrl = await generateSceneImage(drawingData, scene.imagePrompt);
            
            // B. Now Generate Audio AND regenerate Quiz based on the ACTUAL image
            // We run these in parallel to save time
            const [audio, realQuiz] = await Promise.all([
                 generateSpeech(
                    scene.narrative, 
                    new (window.AudioContext || (window as any).webkitAudioContext)(),
                    voice
                  ),
                  generateQuizFromImage(generatedImgUrl, age, scene.educationalSummary)
            ]);

            return { 
                ...scene, 
                generatedImageUrl: generatedImgUrl, 
                generatedAudioBuffer: audio,
                quiz: realQuiz // Overwrite the planned quiz with the visual audit quiz
            };

          } catch (e) {
            console.error("Error generating assets for scene", scene.number, e);
            return scene; // Return scene with partial assets if fail
          }
        })
      );

      setStory({ ...plan, scenes: enrichedScenes });
      setAppState(AppState.VIEWING_STORY);

    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      setErrorMsg('¡Ups! La magia falló un poco. Inténtalo de nuevo.');
    }
  };

  const resetApp = () => {
    setAppState(AppState.DRAWING);
    setStory(null);
    setPromptText('');
    setLoadingMessage('');
  };

  if (appState === AppState.VIEWING_STORY && story) {
    return (
        <div className="min-h-screen bg-kid-blue/10 p-4 md:p-8 font-sans">
            <StoryViewer story={story} onReset={resetApp} />
        </div>
    );
  }

  const voiceOptions: {id: VoiceName, label: string, icon: string}[] = [
      { id: 'Puck', label: 'Juguetón', icon: '🤡' },
      { id: 'Kore', label: 'Tranquilo', icon: '🍃' },
      { id: 'Fenrir', label: 'Fuerte', icon: '🦁' },
      { id: 'Zephyr', label: 'Suave', icon: '🌬️' },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-kid-blue/20 to-kid-purple/20 p-4 font-sans flex flex-col overflow-hidden">
      
      <header className="mb-2 text-center shrink-0">
        <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-kid-purple to-kid-pink drop-shadow-sm">
          Cuentos Mágicos ✨
        </h1>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* LEFT COLUMN: Input & Story Control */}
        <div className={`lg:w-1/4 flex flex-col gap-4 transition-opacity duration-300 ${appState !== AppState.DRAWING ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-white/50 flex-1 flex flex-col overflow-y-auto">
                <h2 className="text-xl font-bold text-kid-blue mb-4">1. Crea tu historia</h2>
                
                <div className="flex flex-col gap-4 flex-1">
                    {/* Prompt Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                            ¿De qué trata?
                        </label>
                        <textarea
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                            placeholder='Di: "Quiero una historia de piratas..."'
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg focus:ring-2 focus:ring-kid-purple focus:outline-none resize-none h-24"
                        />
                         <div className="flex gap-2 mt-2">
                             <button 
                                onClick={toggleListening}
                                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {isListening ? (<span>⏹️</span>) : (<span>🎙️ Grabar</span>)}
                            </button>
                            
                            <button
                                onClick={handleSurpriseMe}
                                className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-kid-yellow text-kid-purple shadow-md hover:scale-105 transition-all"
                            >
                                🪄 Sorpresa
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-2"></div>

                    {/* Age Slider */}
                    <div>
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase">Edad: {age} años</span>
                            <span className="text-xl">{age < 5 ? '👶' : age < 9 ? '🧒' : '😎'}</span>
                        </div>
                        <input 
                            type="range" 
                            min="3" 
                            max="12" 
                            step="1"
                            value={age} 
                            onChange={(e) => setAge(parseInt(e.target.value))}
                            className="w-full accent-kid-pink"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>3</span>
                            <span>12</span>
                        </div>
                    </div>

                    {/* Voice Selector */}
                    <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Voz del Narrador</span>
                        <div className="grid grid-cols-2 gap-2">
                            {voiceOptions.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setVoice(v.id)}
                                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${voice === v.id ? 'bg-kid-purple/10 border-kid-purple text-kid-purple font-bold' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <span className="text-xl">{v.icon}</span>
                                    <span className="text-sm">{v.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto pt-4">
                        <button 
                            onClick={handleGenerate}
                            disabled={!promptText}
                            className={`w-full bg-gradient-to-r from-kid-pink to-orange-400 text-white font-black text-xl py-4 rounded-2xl shadow-xl transform transition-all ${!promptText ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:rotate-1'}`}
                        >
                            ¡Crear Magia! 🚀
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* CENTER COLUMN: Canvas */}
        <div className="flex-1 flex flex-col relative min-h-[300px]">
             {/* Loading Overlay */}
             {appState === AppState.GENERATING_PLAN || appState === AppState.GENERATING_ASSETS ? (
                <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-fade-in border-4 border-kid-blue/20">
                    <div className="w-24 h-24 mb-6 relative">
                        <div className="absolute inset-0 border-4 border-kid-blue/30 rounded-full animate-ping"></div>
                        <div className="absolute inset-2 border-4 border-kid-pink/50 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-4xl">🤖</div>
                    </div>
                    <h3 className="text-2xl font-bold text-kid-purple mb-2">{loadingMessage}</h3>
                    {appState === AppState.GENERATING_ASSETS && (
                         <p className="text-sm text-gray-500 animate-pulse">Analizando las imágenes para crear los retos...</p>
                    )}
                </div>
            ) : null}

             {appState === AppState.ERROR ? (
                <div className="absolute inset-0 z-20 bg-white/90 rounded-2xl flex flex-col items-center justify-center p-8 text-center border-4 border-red-100">
                    <div className="text-6xl mb-4">😿</div>
                    <h3 className="text-2xl font-bold text-red-500 mb-4">{errorMsg}</h3>
                    <button 
                        onClick={resetApp}
                        className="bg-kid-blue text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105"
                    >
                        Intentar de nuevo
                    </button>
                </div>
            ) : null}

            <Canvas ref={canvasRef} tool={tool} />
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-400 pointer-events-none">
                Área de dibujo
            </div>
        </div>

        {/* RIGHT COLUMN: Tools */}
        <div className={`lg:w-1/4 flex flex-col gap-4 transition-opacity duration-300 ${appState !== AppState.DRAWING ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-white/50 h-full overflow-y-auto">
                <h2 className="text-xl font-bold text-kid-purple mb-4">2. Herramientas</h2>
                
                <div className="space-y-6">
                    {/* Preview */}
                    <BrushPreview tool={tool} />

                    {/* Brushes */}
                    <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Pincel</span>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => setTool({...tool, type: 'marker'})}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${tool.type === 'marker' ? 'bg-kid-blue/10 border-kid-blue' : 'border-gray-100 hover:bg-gray-50'}`}
                            >
                                <span className="text-2xl mb-1">🖍️</span>
                                <span className="text-xs font-bold text-gray-600">Rotulador</span>
                            </button>
                            <button 
                                onClick={() => setTool({...tool, type: 'watercolor'})}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${tool.type === 'watercolor' ? 'bg-kid-pink/10 border-kid-pink' : 'border-gray-100 hover:bg-gray-50'}`}
                            >
                                <span className="text-2xl mb-1">🖌️</span>
                                <span className="text-xs font-bold text-gray-600">Acuarela</span>
                            </button>
                            <button 
                                onClick={() => setTool({...tool, type: 'spray'})}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${tool.type === 'spray' ? 'bg-kid-green/10 border-kid-green' : 'border-gray-100 hover:bg-gray-50'}`}
                            >
                                <span className="text-2xl mb-1">🚿</span>
                                <span className="text-xs font-bold text-gray-600">Spray</span>
                            </button>
                            <button 
                                onClick={() => setTool({...tool, type: 'eraser'})}
                                className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${tool.type === 'eraser' ? 'bg-gray-100 border-gray-400' : 'border-gray-100 hover:bg-gray-50'}`}
                            >
                                <span className="text-2xl mb-1">🧼</span>
                                <span className="text-xs font-bold text-gray-600">Borrador</span>
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100"></div>

                    {/* Size */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase">Grosor</span>
                            <span className="text-xs font-bold text-gray-600">{tool.width}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="2" 
                            max="50" 
                            value={tool.width} 
                            onChange={(e) => setTool({...tool, width: parseInt(e.target.value)})}
                            className="w-full accent-kid-purple"
                        />
                    </div>

                    <div className="h-px bg-gray-100"></div>

                    {/* Advanced Color Picker */}
                    <div className={`${tool.type === 'eraser' ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="block text-xs font-bold text-gray-400 uppercase">Color</span>
                            <button 
                                onClick={handleAddFavoriteColor}
                                className="text-xs text-kid-blue font-bold hover:underline"
                            >
                                + Guardar Actual
                            </button>
                        </div>
                        
                        {/* Custom Input */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 shadow-inner">
                                <input 
                                    type="color" 
                                    value={tool.color}
                                    onChange={(e) => setTool({...tool, color: e.target.value})}
                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0"
                                />
                            </div>
                            <input 
                                type="text" 
                                value={tool.color.toUpperCase()}
                                onChange={(e) => {
                                    if(/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                        setTool({...tool, color: e.target.value})
                                    }
                                }}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-mono text-gray-600 uppercase"
                            />
                        </div>

                        {/* Favorites Grid */}
                        <div className="grid grid-cols-4 gap-2">
                            {savedColors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setTool({ ...tool, color })}
                                    className={`aspect-square rounded-full border-2 transition-transform shadow-sm ${tool.color === color ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: color, border: color === '#FFFFFF' ? '1px solid #ddd' : '' }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto pt-4">
                        <button 
                            onClick={() => canvasRef.current?.clear()}
                            className="w-full bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors border border-red-100"
                        >
                            🗑️ Borrar todo
                        </button>
                    </div>

                </div>
            </div>
        </div>

      </div>
      
      <footer className="mt-2 text-center text-gray-400 text-xs">
        Powered by Google Gemini ✨
      </footer>
    </div>
  );
}

export default App;