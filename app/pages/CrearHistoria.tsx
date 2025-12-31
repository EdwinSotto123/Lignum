import React, { useState, useRef, useEffect } from 'react';
import { GeminiLiveStorySession, STORY_CATEGORIES, StoryCategory } from '../../services/geminiLiveService';
import { createStoryFromInterview, getUserStories, Story } from '../../services/storyService';
import { auth } from '../../services/firebase';

interface CrearHistoriaProps {
    onBack: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const CrearHistoria: React.FC<CrearHistoriaProps> = ({ onBack }) => {
    const [step, setStep] = useState<'select' | 'metadata' | 'interview' | 'processing' | 'complete' | 'history'>('select');
    const [selectedCategory, setSelectedCategory] = useState<StoryCategory | null>(null);

    // Metadata State
    const [storySummary, setStorySummary] = useState('');
    const [targetAudience, setTargetAudience] = useState<'general' | 'children'>('general');
    const [characterImageOption, setCharacterImageOption] = useState<'upload' | 'ai'>('ai');
    const [characterFile, setCharacterFile] = useState<File | null>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [userTranscript, setUserTranscript] = useState('');
    const [fullUserTranscript, setFullUserTranscript] = useState('');
    const [fullConversationTranscript, setFullConversationTranscript] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [processedStory, setProcessedStory] = useState<Story | null>(null);
    const [userStories, setUserStories] = useState<Story[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<GeminiLiveStorySession | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentTranscript, userTranscript]);

    // Load user stories on mount
    useEffect(() => {
        const loadStories = async () => {
            const userId = auth.currentUser?.uid;
            if (userId) {
                const stories = await getUserStories(userId);
                setUserStories(stories);
            }
        };
        loadStories();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sessionRef.current) {
                sessionRef.current.stop();
            }
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        };
    }, []);

    const handleCategorySelect = (category: StoryCategory) => {
        setSelectedCategory(category);
        setStep('metadata');
    };

    const handleStartInterview = async () => {
        if (!selectedCategory) return;
        setStep('interview');
        setMessages([]);
        setFullUserTranscript('');
        setError(null);
        setIsConnecting(true);

        // Create Gemini Live session
        sessionRef.current = new GeminiLiveStorySession(selectedCategory, {
            onConnect: () => {
                setIsConnected(true);
                setIsConnecting(false);
                // Start duration counter
                durationIntervalRef.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                }, 1000);
            },
            onDisconnect: () => {
                setIsConnected(false);
                if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                }
            },
            onUserTranscript: (text) => {
                setUserTranscript(text);
            },
            onAssistantTranscript: (text) => {
                setCurrentTranscript(text);
            },
            onTurnComplete: (userText, assistantText) => {
                if (userText) {
                    setMessages(prev => [...prev, { role: 'user', content: userText }]);
                    setFullUserTranscript(prev => prev + (prev ? '\n\n' : '') + userText);
                    setFullConversationTranscript(prev => prev + (prev ? '\n\n' : '') + `[Usuario]: ${userText}`);
                }
                if (assistantText) {
                    setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
                    setFullConversationTranscript(prev => prev + '\n\n' + `[Entrevistador]: ${assistantText}`);
                }
                setUserTranscript('');
                setCurrentTranscript('');
            },
            onError: (errorMsg) => {
                setError(errorMsg);
                setIsConnecting(false);
            }
        });

        try {
            await sessionRef.current.start();
        } catch (err: any) {
            setError(err.message || 'Error al iniciar la sesión');
            setIsConnecting(false);
        }
    };

    const handleFinishInterview = async () => {
        if (!sessionRef.current || !selectedCategory) return;

        // Stop the session and get audio
        const audioBlob = sessionRef.current.getUserAudioBlob();
        sessionRef.current.stop();
        setIsConnected(false);

        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
        }

        // Process the story
        setStep('processing');

        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                setError('Debes iniciar sesión para guardar tu historia');
                return;
            }

            const story = await createStoryFromInterview(
                userId,
                selectedCategory.id,
                selectedCategory.emoji,
                fullUserTranscript,
                audioBlob,
                recordingDuration,
                {
                    summary: storySummary,
                    targetAudience,
                    characterImageOption,
                    characterFile: characterFile || undefined
                }
            );

            setProcessedStory(story);
            setStep('complete');
        } catch (err: any) {
            setError(err.message || 'Error al procesar la historia');
            setStep('select');
        }
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const resetAndCreateNew = () => {
        setStep('select');
        setMessages([]);
        setFullUserTranscript('');
        setProcessedStory(null);
        setRecordingDuration(0);
        setSelectedCategory(null);
        // Reset form
        setStorySummary('');
        setTargetAudience('general');
        setCharacterImageOption('ai');
        setCharacterFile(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-roots-900 to-roots-950 p-8">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-serif text-white">Crear Historia</h1>
                            <p className="text-gray-500">Narra tus memorias con ayuda de la IA</p>
                        </div>
                    </div>

                    {userStories.length > 0 && step === 'select' && (
                        <button
                            onClick={() => setStep('history')}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                        >
                            📚 Mis Historias ({userStories.length})
                        </button>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                        ⚠️ {error}
                        <button onClick={() => setError(null)} className="ml-4 underline">Cerrar</button>
                    </div>
                )}

                {/* Step: Select Category */}
                {step === 'select' && (
                    <div className="animate-fade-in">
                        <h2 className="text-xl text-white mb-2">¿Qué tipo de historia quieres contar?</h2>
                        <p className="text-gray-500 mb-6">Selecciona una categoría para comenzar</p>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {STORY_CATEGORIES.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategorySelect(category)}
                                    className="p-6 rounded-2xl bg-roots-800/50 border border-white/5 hover:border-canopy-500/30 transition-all text-left group hover:scale-[1.02] hover:bg-roots-800"
                                >
                                    <span className="text-4xl mb-4 block">{category.emoji}</span>
                                    <h3 className="text-lg text-white font-medium mb-1">{category.name}</h3>
                                    <p className="text-gray-500 text-sm mb-3">{category.openingQuestion.slice(0, 60)}...</p>
                                    <div className="flex items-center gap-2 text-canopy-400 text-sm">
                                        <span className="w-2 h-2 rounded-full bg-canopy-400 animate-pulse"></span>
                                        Comenzar
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step: Metadata Form */}
                {step === 'metadata' && selectedCategory && (
                    <div className="animate-fade-in max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <span className="text-4xl block mb-2">{selectedCategory.emoji}</span>
                            <h2 className="text-2xl text-white font-serif">{selectedCategory.name}</h2>
                            <p className="text-gray-500">Antes de grabar, cuéntanos un poco más sobre esta historia</p>
                        </div>

                        <div className="bg-roots-800/50 rounded-2xl border border-white/5 p-8 space-y-8">
                            {/* Summary */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-300">Resumen Breve</label>
                                <textarea
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-canopy-500/50 h-32 resize-none placeholder-gray-600"
                                    placeholder="¿De qué trata esta historia? Ej: Cuando aprendí a montar bicicleta con mi abuelo..."
                                    value={storySummary}
                                    onChange={(e) => setStorySummary(e.target.value)}
                                />
                            </div>

                            {/* Audience */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-300">¿Para quién es esta historia?</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setTargetAudience('general')}
                                        className={`p-4 rounded-xl border transition-all text-left ${targetAudience === 'general'
                                            ? 'bg-canopy-600/20 border-canopy-500 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">👥</div>
                                        <div className="font-medium">Público General</div>
                                        <div className="text-xs opacity-70 mt-1">Adultos, familia entera</div>
                                    </button>
                                    <button
                                        onClick={() => setTargetAudience('children')}
                                        className={`p-4 rounded-xl border transition-all text-left ${targetAudience === 'children'
                                            ? 'bg-canopy-600/20 border-canopy-500 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">🧸</div>
                                        <div className="font-medium">Niños</div>
                                        <div className="text-xs opacity-70 mt-1">Lenguaje simple y mágico</div>
                                    </button>
                                </div>
                            </div>

                            {/* Character Image */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-300">Imagen del Personaje o Portada</label>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <button
                                        onClick={() => setCharacterImageOption('upload')}
                                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${characterImageOption === 'upload'
                                            ? 'bg-white/10 border-white text-white'
                                            : 'border-transparent text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        📤 Subir Foto
                                    </button>
                                    <button
                                        onClick={() => setCharacterImageOption('ai')}
                                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${characterImageOption === 'ai'
                                            ? 'bg-white/10 border-white text-white'
                                            : 'border-transparent text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        ✨ Crear con IA
                                    </button>
                                </div>

                                {characterImageOption === 'upload' ? (
                                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-canopy-500/30 transition-colors">
                                        <input
                                            type="file"
                                            id="char-upload"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    setCharacterFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        <label htmlFor="char-upload" className="cursor-pointer block">
                                            {characterFile ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 rounded-lg bg-black/30 mb-2 overflow-hidden">
                                                        <img src={URL.createObjectURL(characterFile)} className="w-full h-full object-cover" />
                                                    </div>
                                                    <span className="text-sm text-green-400">Imagen seleccionada</span>
                                                    <span className="text-xs text-gray-500 mt-1">{characterFile.name}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-gray-500">
                                                    <div className="text-3xl mb-2">📁</div>
                                                    <span>Click para subir imagen</span>
                                                    <span className="text-xs mt-1">JPG, PNG (Max 5MB)</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                ) : (
                                    <div className="bg-canopy-500/10 border border-canopy-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <span className="text-xl mt-0.5">🎨</span>
                                        <div>
                                            <p className="text-sm text-canopy-200 font-medium">Nosotros nos encargamos</p>
                                            <p className="text-xs text-canopy-400 mt-1">Generaremos una ilustración mágica basada en tu historia automáticamente.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleStartInterview}
                                disabled={!storySummary.trim()}
                                className="w-full py-4 rounded-xl bg-canopy-600 hover:bg-canopy-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium text-lg transition-colors shadow-lg shadow-canopy-900/20 mt-6"
                            >
                                🎙️ Comenzar Grabación
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Voice Interview */}
                {step === 'interview' && selectedCategory && (
                    <div className="animate-fade-in">
                        {/* Interview Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{selectedCategory.emoji}</span>
                                <div>
                                    <h2 className="text-xl text-white">{selectedCategory.name}</h2>
                                    <div className="flex items-center gap-2">
                                        {isConnected && (
                                            <>
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                <span className="text-red-400 text-sm">Grabando</span>
                                                <span className="text-gray-500 text-sm">• {formatDuration(recordingDuration)}</span>
                                            </>
                                        )}
                                        {isConnecting && (
                                            <span className="text-amber-400 text-sm">Conectando...</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleFinishInterview}
                                disabled={!isConnected || fullUserTranscript.length < 50}
                                className="px-6 py-2 rounded-xl bg-canopy-600 hover:bg-canopy-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
                            >
                                ✅ Terminar Historia
                            </button>
                        </div>

                        {/* Conversation */}
                        <div className="bg-roots-800/50 rounded-2xl border border-white/5 h-[500px] flex flex-col">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user'
                                            ? 'bg-canopy-600/80 text-white rounded-br-sm'
                                            : 'bg-white/[0.05] text-gray-300 rounded-bl-sm'
                                            }`}>
                                            {msg.role === 'assistant' && (
                                                <p className="text-canopy-400 text-xs mb-1 font-medium">🤖 Entrevistador IA</p>
                                            )}
                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Live transcripts */}
                                {currentTranscript && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-white/[0.05] text-gray-300 rounded-bl-sm border border-canopy-500/30">
                                            <p className="text-canopy-400 text-xs mb-1 font-medium flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-canopy-400 animate-pulse"></span>
                                                🤖 Hablando...
                                            </p>
                                            <p className="text-sm leading-relaxed">{currentTranscript}</p>
                                        </div>
                                    </div>
                                )}

                                {userTranscript && (
                                    <div className="flex justify-end">
                                        <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-canopy-600/50 text-white rounded-br-sm border border-canopy-500/50">
                                            <p className="text-canopy-200 text-xs mb-1 font-medium flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-canopy-300 animate-pulse"></span>
                                                🎤 Escuchando...
                                            </p>
                                            <p className="text-sm leading-relaxed">{userTranscript}</p>
                                        </div>
                                    </div>
                                )}

                                {isConnecting && (
                                    <div className="flex justify-center py-8">
                                        <div className="flex items-center gap-3 text-amber-400">
                                            <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
                                            <span>Conectando con la IA...</span>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Voice indicator */}
                            <div className="p-4 border-t border-white/5 flex items-center justify-center gap-4">
                                {isConnected ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1 bg-canopy-500 rounded-full animate-pulse"
                                                    style={{
                                                        height: `${12 + Math.random() * 20}px`,
                                                        animationDelay: `${i * 0.1}s`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-gray-400 text-sm">Habla naturalmente, la IA está escuchando...</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-500 text-sm">Esperando conexión...</span>
                                )}
                            </div>
                        </div>

                        {/* Cancel button */}
                        <button
                            onClick={() => {
                                if (sessionRef.current) sessionRef.current.stop();
                                resetAndCreateNew();
                            }}
                            className="mt-4 w-full py-3 text-gray-500 hover:text-white transition-colors"
                        >
                            Cancelar y volver
                        </button>
                    </div>
                )}

                {/* Step: Processing */}
                {step === 'processing' && (
                    <div className="text-center py-16 animate-fade-in">
                        <div className="w-24 h-24 mx-auto mb-6 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-canopy-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-canopy-500 animate-spin"></div>
                            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-canopy-500/20 to-canopy-600/20 flex items-center justify-center">
                                <span className="text-3xl">📝</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-serif text-white mb-3">Procesando tu Historia</h2>
                        <p className="text-gray-500 mb-2">Gemini está organizando tu narración...</p>
                        <p className="text-gray-600 text-sm">Esto tomará unos segundos</p>
                    </div>
                )}

                {/* Step: Complete */}
                {step === 'complete' && processedStory && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-canopy-500/20 flex items-center justify-center">
                                <span className="text-4xl">✨</span>
                            </div>
                            <h2 className="text-2xl font-serif text-white mb-2">¡Historia Guardada!</h2>
                            <p className="text-gray-400">Tu historia ha sido preservada para tu familia</p>
                        </div>

                        {/* Story Preview */}
                        <div className="bg-roots-800/50 rounded-2xl border border-white/5 p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-2xl">{processedStory.categoryEmoji}</span>
                                <div>
                                    <h3 className="text-xl font-serif text-white">{processedStory.title}</h3>
                                    <p className="text-gray-500 text-sm">{processedStory.category} • {formatDuration(processedStory.duration || 0)}</p>
                                </div>
                            </div>

                            {/* Display Character Image if available */}
                            {processedStory.characterImageUrl && (
                                <div className="mb-6 rounded-xl overflow-hidden h-64 bg-black/20">
                                    <img src={processedStory.characterImageUrl} className="w-full h-full object-cover" alt="Imagen del personaje" />
                                </div>
                            )}

                            {/* Cinematic Storyboard View */}
                            <div className="space-y-8">
                                {/* Characters Section */}
                                {processedStory.characters && processedStory.characters.length > 0 && (
                                    <div className="bg-roots-800/50 rounded-2xl border border-white/5 p-6 animate-fade-in-up">
                                        <h3 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
                                            <span>🎭</span> Reparto Principal
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {processedStory.characters.map((char, idx) => (
                                                <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                    <div className="font-bold text-canopy-300 text-lg mb-1">{char.name}</div>
                                                    <p className="text-gray-400 text-sm italic">"{char.description}"</p>
                                                    <div className="mt-3 text-[10px] text-gray-600 border-t border-white/5 pt-2 font-mono">
                                                        Visual Prompt: {char.visualPrompt.slice(0, 50)}...
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Scenes Section */}
                                {processedStory.scenes && processedStory.scenes.length > 0 ? (
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-serif text-white flex items-center gap-2 px-2">
                                            <span>🎬</span> Guión Gráfico (Storyboard)
                                        </h3>
                                        {processedStory.scenes.map((scene, idx) => (
                                            <div key={idx} className="bg-roots-800/50 rounded-2xl border border-white/5 overflow-hidden group hover:border-canopy-500/30 transition-all animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                                                <div className="bg-white/5 px-6 py-3 flex items-center justify-between border-b border-white/5">
                                                    <span className="text-canopy-400 font-mono text-sm uppercase tracking-wider">Escena {scene.sceneNumber}</span>
                                                    <div className="flex gap-2">
                                                        {scene.charactersInScene?.map((charName, i) => (
                                                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                                                {charName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="p-6 grid md:grid-cols-[1fr_2fr] gap-6">
                                                    {/* Visual Description */}
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Visual</div>
                                                        <p className="text-gray-300 text-sm leading-relaxed italic">
                                                            {scene.description}
                                                        </p>
                                                        <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/5">
                                                            <div className="text-[10px] text-gray-600 font-mono mb-1">AI PROMPT</div>
                                                            <p className="text-[10px] text-gray-500 line-clamp-3">{scene.visualPrompt}</p>
                                                        </div>
                                                    </div>

                                                    {/* Narration */}
                                                    <div className="space-y-2 border-l border-white/5 pl-6 md:border-l-0 md:pl-0 md:border-t-0">
                                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Narración (Audio)</div>
                                                        <p className="text-white text-lg font-serif leading-relaxed">
                                                            "{scene.narrationText}"
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Fallback to legacy text view */
                                    <div className="bg-roots-800/50 rounded-2xl border border-white/5 p-6 mb-6">
                                        <div className="prose prose-invert max-w-none">
                                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                {processedStory.organizedStory}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audio Players */}
                        <div className="bg-roots-800/50 rounded-xl p-4 mb-6">
                            <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Audios de la Historia</h4>
                            <div className="flex flex-col gap-4">
                                {/* AI Narration */}
                                {processedStory.narratedAudioUrl && (
                                    <div className="bg-canopy-600/20 rounded-xl p-3 border border-canopy-500/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xl">🗣️</span>
                                            <div>
                                                <p className="text-sm font-bold text-canopy-300">Narración IA (Voz Clonada)</p>
                                                <p className="text-[10px] text-canopy-400">Historia optimizada leída con tu voz</p>
                                            </div>
                                        </div>
                                        <audio controls src={processedStory.narratedAudioUrl} className="w-full h-8 opacity-90" />
                                    </div>
                                )}

                                {/* Original Interview */}
                                {processedStory.audioUrl && (
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xl">🎙️</span>
                                            <div>
                                                <p className="text-sm font-bold text-gray-300">Entrevista Original</p>
                                                <p className="text-[10px] text-gray-500">Audio crudo de la conversación</p>
                                            </div>
                                        </div>
                                        <audio controls src={processedStory.audioUrl} className="w-full h-8 opacity-60 hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={resetAndCreateNew}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors"
                            >
                                ✨ Crear Otra Historia
                            </button>
                            <button
                                onClick={onBack}
                                className="flex-1 py-3 rounded-xl bg-canopy-600 hover:bg-canopy-500 text-white font-medium transition-colors"
                            >
                                Volver a Mi Legado
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: History */}
                {step === 'history' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl text-white">Mis Historias</h2>
                            <button
                                onClick={() => setStep('select')}
                                className="px-4 py-2 rounded-xl bg-canopy-600 hover:bg-canopy-500 text-white text-sm transition-colors"
                            >
                                + Crear Nueva
                            </button>
                        </div>

                        {userStories.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <span className="text-4xl block mb-4">📚</span>
                                <p>Aún no has creado ninguna historia</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {userStories.map((story) => (
                                    <div
                                        key={story.id}
                                        onClick={() => {
                                            setProcessedStory(story);
                                            setStep('complete');
                                        }}
                                        className="bg-roots-800/50 rounded-xl border border-white/5 p-5 hover:border-canopy-500/30 transition-all cursor-pointer hover:bg-roots-800 group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <span className="text-3xl">{story.categoryEmoji}</span>
                                            <div className="flex-1">
                                                <h3 className="text-white font-medium mb-1">{story.title}</h3>
                                                <p className="text-gray-500 text-sm mb-2">
                                                    {story.category} • {story.duration ? formatDuration(story.duration) : ''}
                                                </p>
                                                <p className="text-gray-400 text-sm line-clamp-2">
                                                    {story.organizedStory?.slice(0, 150)}...
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setStep('select')}
                            className="mt-6 w-full py-3 text-gray-500 hover:text-white transition-colors"
                        >
                            ← Volver a Categorías
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrearHistoria;
