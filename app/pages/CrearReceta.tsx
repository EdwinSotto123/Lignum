import React, { useState, useRef, useEffect } from 'react';
import { GeminiLiveStorySession } from '../../services/geminiLiveService';
import { RECIPE_CATEGORIES, createRecipeFromInterview, getUserRecipes, RecipeItem } from '../../services/recipeService';
import { auth } from '../../services/firebase';

interface CrearRecetaProps {
    onBack: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const CrearReceta: React.FC<CrearRecetaProps> = ({ onBack }) => {
    const [step, setStep] = useState<'type' | 'interview' | 'processing' | 'complete' | 'history'>('type');
    const [selectedCategory, setSelectedCategory] = useState<typeof RECIPE_CATEGORIES[0] | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [userTranscript, setUserTranscript] = useState('');
    const [fullUserTranscript, setFullUserTranscript] = useState('');
    const [fullConversationTranscript, setFullConversationTranscript] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [processedRecipe, setProcessedRecipe] = useState<RecipeItem | null>(null);
    const [userRecipes, setUserRecipes] = useState<RecipeItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<GeminiLiveStorySession | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentTranscript, userTranscript]);

    // Load history
    useEffect(() => {
        const loadRecipes = async () => {
            const userId = auth.currentUser?.uid;
            if (userId) {
                const list = await getUserRecipes(userId);
                setUserRecipes(list);
            }
        };
        loadRecipes();
    }, [step]);

    useEffect(() => {
        return () => {
            if (sessionRef.current) sessionRef.current.stop();
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        };
    }, []);

    const handleStartInterview = async (category: typeof RECIPE_CATEGORIES[0]) => {
        setSelectedCategory(category);
        setStep('interview');
        setMessages([]);
        setFullUserTranscript('');
        setFullConversationTranscript('');
        setError(null);
        setIsConnecting(true);

        sessionRef.current = new GeminiLiveStorySession(category, {
            onConnect: () => {
                setIsConnected(true);
                setIsConnecting(false);
                durationIntervalRef.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                }, 1000);
            },
            onDisconnect: () => {
                setIsConnected(false);
                if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
            },
            onUserTranscript: (text) => setUserTranscript(text),
            onAssistantTranscript: (text) => setCurrentTranscript(text),
            onTurnComplete: (userText, assistantText) => {
                if (userText) {
                    setMessages(prev => [...prev, { role: 'user', content: userText }]);
                    setFullUserTranscript(prev => prev + (prev ? '\n\n' : '') + userText);
                    setFullConversationTranscript(prev => prev + (prev ? '\n\n' : '') + `[Usuario]: ${userText}`);
                }
                if (assistantText) {
                    setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
                    setFullConversationTranscript(prev => prev + '\n\n' + `[Instructor]: ${assistantText}`);
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
            setError(err.message);
            setIsConnecting(false);
        }
    };

    const handleFinishInterview = async () => {
        if (!sessionRef.current || !selectedCategory) return;

        const audioBlob = sessionRef.current.getUserAudioBlob();
        sessionRef.current.stop();
        setIsConnected(false);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

        setStep('processing');

        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                setError('Debes iniciar sesión');
                return;
            }

            const recipe = await createRecipeFromInterview(
                userId,
                selectedCategory.id,
                selectedCategory.emoji,
                fullConversationTranscript, // Use full conversation for context
                audioBlob,
                recordingDuration
            );

            setProcessedRecipe(recipe);
            setStep('complete');
        } catch (err: any) {
            setError(err.message);
            setStep('type');
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const reset = () => {
        setStep('type');
        setMessages([]);
        setFullUserTranscript('');
        setProcessedRecipe(null);
        setRecordingDuration(0);
        setSelectedCategory(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-roots-900 to-roots-950 p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-serif text-white">Manual de Habilidades y Recetas</h1>
                            <p className="text-gray-500">Preserva tus conocimientos prácticos para la familia</p>
                        </div>
                    </div>
                    {userRecipes.length > 0 && step === 'type' && (
                        <button onClick={() => setStep('history')} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                            📕 Mi Colección ({userRecipes.length})
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex justify-between">
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* TYPE SELECTION */}
                {step === 'type' && (
                    <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                        {RECIPE_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleStartInterview(cat)}
                                className="p-6 rounded-2xl bg-roots-800/50 border border-white/5 hover:border-sap-500/30 transition-all text-left hover:scale-[1.02] hover:bg-roots-800 group"
                            >
                                <span className="text-4xl mb-3 block transform group-hover:scale-110 transition-transform">{cat.emoji}</span>
                                <h3 className="text-xl text-white font-medium mb-1">{cat.name}</h3>
                                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{cat.openingQuestion}</p>
                                <div className="flex items-center gap-2 text-sap-400 text-sm font-medium">
                                    <span className="w-2 h-2 rounded-full bg-sap-400 animate-pulse"></span>
                                    {['cocina', 'reposteria'].includes(cat.id) ? 'Crear Receta' : 'Documentar Habilidad'}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* INTERVIEW */}
                {step === 'interview' && selectedCategory && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{selectedCategory.emoji}</span>
                                <div>
                                    <h2 className="text-xl text-white">{selectedCategory.name}</h2>
                                    <div className="flex items-center gap-2 text-sm">
                                        {isConnected && <span className="text-red-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>Grabando • {formatDuration(recordingDuration)}</span>}
                                        {isConnecting && <span className="text-amber-400">Conectando...</span>}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleFinishInterview}
                                disabled={!isConnected || fullUserTranscript.length < 10}
                                className="px-6 py-2 rounded-xl bg-sap-600 hover:bg-sap-500 disabled:bg-gray-700 text-roots-950 transition-colors font-medium shadow-lg shadow-sap-900/20"
                            >
                                ✅ Terminar y Procesar
                            </button>
                        </div>

                        <div className="bg-roots-800/50 rounded-2xl border border-white/5 h-[500px] flex flex-col relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-roots-900/50 pointer-events-none"></div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-base leading-relaxed ${msg.role === 'user'
                                            ? 'bg-sap-600/90 text-roots-950 rounded-br-sm shadow-md font-medium'
                                            : 'bg-white/10 text-gray-200 rounded-bl-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {currentTranscript && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="max-w-[85%] px-5 py-4 rounded-2xl bg-white/5 text-gray-400 border border-white/10 rounded-bl-sm">
                                            <div className="flex gap-2 items-center mb-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></span>
                                                <span className="text-xs uppercase tracking-wider font-medium">Instructor IA</span>
                                            </div>
                                            {currentTranscript}
                                        </div>
                                    </div>
                                )}
                                {userTranscript && (
                                    <div className="flex justify-end animate-fade-in">
                                        <div className="max-w-[85%] px-5 py-4 rounded-2xl bg-sap-600/50 text-white border border-sap-500/30 rounded-br-sm">
                                            <div className="flex gap-2 items-center justify-end mb-1">
                                                <span className="text-xs uppercase tracking-wider font-medium text-sap-200">Tú</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-sap-300 animate-pulse"></span>
                                            </div>
                                            {userTranscript}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <button onClick={() => { sessionRef.current?.stop(); reset(); }} className="mt-4 text-gray-500 hover:text-white w-full text-center py-2">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* PROCESSING */}
                {step === 'processing' && (
                    <div className="text-center py-20 animate-fade-in">
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-sap-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-sap-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">👨‍🍳</div>
                        </div>
                        <h2 className="text-2xl font-serif text-white mb-2">Estructurando tu Conocimiento...</h2>
                        <p className="text-gray-500">Separando ingredientes, pasos y secretos...</p>
                    </div>
                )}

                {/* COMPLETE - RECIPE CARD */}
                {step === 'complete' && processedRecipe && (
                    <div className="animate-fade-in max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sap-500/20 mb-4 text-3xl">
                                ✅
                            </div>
                            <h2 className="text-3xl font-serif text-white mb-2">¡{processedRecipe.type === 'cocina' ? 'Receta' : 'Habilidad'} Guardada!</h2>
                        </div>

                        {/* RECIPE VIEW */}
                        <div className="bg-roots-800 rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                            <div className="bg-sap-900/30 p-8 border-b border-white/5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 text-sap-400 text-sm font-medium mb-2 uppercase tracking-wider">
                                            <span>{processedRecipe.categoryEmoji} {processedRecipe.category}</span>
                                            <span>•</span>
                                            <span>{processedRecipe.time}</span>
                                            <span>•</span>
                                            <span className={`capitalize ${processedRecipe.difficulty === 'easy' ? 'text-green-400' :
                                                processedRecipe.difficulty === 'medium' ? 'text-yellow-400' : 'text-red-400'
                                                }`}>{processedRecipe.difficulty}</span>
                                        </div>
                                        <h1 className="text-4xl font-serif text-white mb-4">{processedRecipe.title}</h1>
                                        <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">{processedRecipe.description}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {processedRecipe.narratedAudioUrl && (
                                            <div className="bg-sap-900/50 rounded-xl p-3 flex items-center gap-3 border border-sap-500/30">
                                                <div className="w-8 h-8 rounded-full bg-sap-500 flex items-center justify-center text-roots-950">
                                                    <span className="text-sm">🗣️</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-sap-300 uppercase tracking-wider">Narración IA</p>
                                                    <audio controls src={processedRecipe.narratedAudioUrl} className="h-6 w-40 opacity-90" />
                                                </div>
                                            </div>
                                        )}
                                        {processedRecipe.audioUrl && (
                                            <div className="bg-black/20 rounded-xl p-3 backdrop-blur-sm flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                                                    <span className="text-sm">🎤</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Original</p>
                                                    <audio controls src={processedRecipe.audioUrl} className="h-6 w-40" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Video Upload Section */}
                            <div className="bg-roots-900/50 border-t border-white/5 p-8">
                                <h3 className="text-sap-400 font-medium uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span>🎥</span> Video Demostrativo
                                </h3>

                                {processedRecipe.videoUrl ? (
                                    <div className="bg-black/40 rounded-xl overflow-hidden">
                                        <video controls src={processedRecipe.videoUrl} className="w-full max-h-[400px]" />
                                    </div>
                                ) : (
                                    <div className="text-center p-6 border-2 border-dashed border-white/10 rounded-xl hover:border-sap-500/30 transition-colors">
                                        <input
                                            type="file"
                                            id="video-upload"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file || !processedRecipe) return;

                                                setIsUploading(true);
                                                try {
                                                    const { saveRecipeVideo, saveRecipe } = await import('../../services/recipeService');
                                                    const videoUrl = await saveRecipeVideo(processedRecipe.userId, processedRecipe.id, file);

                                                    // Update local state
                                                    const updated = { ...processedRecipe, videoUrl };
                                                    setProcessedRecipe(updated);

                                                    // Update DB
                                                    await saveRecipe(processedRecipe.userId, { id: processedRecipe.id, videoUrl });
                                                } catch (err) {
                                                    console.error(err);
                                                    setError("Error al subir video");
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            }}
                                        />
                                        <label htmlFor="video-upload" disabled={isUploading} className="cursor-pointer">
                                            <div className="w-16 h-16 rounded-full bg-sap-500/10 flex items-center justify-center text-sap-500 text-3xl mx-auto mb-4">
                                                {isUploading ? <span className="animate-spin text-xl">⏳</span> : '+'}
                                            </div>
                                            <p className="text-gray-300 font-medium">
                                                {isUploading ? 'Subiendo video...' : 'Subir Video Demostrativo'}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">MP4, WebM (Max 50MB)</p>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
                                {/* Left: Ingredients */}
                                <div className="p-8 bg-black/10">
                                    <h3 className="text-sap-400 font-medium uppercase tracking-widest mb-6">
                                        {processedRecipe.type === 'cocina' ? 'Ingredientes' : 'Materiales'}
                                    </h3>
                                    <ul className="space-y-3">
                                        {processedRecipe.items.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <span className="w-1.5 h-1.5 rounded-full bg-sap-500 mt-2 flex-shrink-0"></span>
                                                <span className="text-gray-300">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Center: Steps */}
                                <div className="col-span-2 p-8">
                                    <h3 className="text-sap-400 font-medium uppercase tracking-widest mb-6">Instrucciones</h3>
                                    <div className="space-y-8">
                                        {processedRecipe.steps.map((step, i) => (
                                            <div key={i} className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-white/5 text-sap-500 font-serif text-xl flex items-center justify-center flex-shrink-0 border border-white/10">
                                                    {i + 1}
                                                </div>
                                                <p className="text-gray-300 leading-relaxed pt-1">{step}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {processedRecipe.tips && (
                                        <div className="mt-8 p-6 rounded-xl bg-sap-500/5 border border-sap-500/10">
                                            <h4 className="text-sap-400 font-medium mb-2 flex items-center gap-2">
                                                <span>💡</span> Secreto del Experto
                                            </h4>
                                            <p className="text-gray-400 italic">{processedRecipe.tips}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={reset} className="flex-1 py-4 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">
                                + Crear Otra
                            </button>
                            <button onClick={onBack} className="flex-1 py-4 rounded-xl bg-sap-600 hover:bg-sap-500 text-roots-950 font-medium transition-colors">
                                Volver al Menu
                            </button>
                        </div>
                    </div>
                )}

                {/* HISTORY */}
                {step === 'history' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl text-white">Mi Colección</h2>
                            <button onClick={() => setStep('type')} className="px-4 py-2 bg-sap-600 rounded-lg text-roots-950 font-medium hover:bg-sap-500 transition-colors">
                                + Nueva
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {userRecipes.map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => {
                                        setProcessedRecipe(r);
                                        setStep('complete');
                                    }}
                                    className="bg-roots-800/30 rounded-2xl p-6 border border-white/5 hover:border-sap-500/20 transition-all hover:bg-roots-800/50 cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{r.categoryEmoji}</span>
                                            <span className="text-xs uppercase tracking-wider text-gray-500">{r.category}</span>
                                        </div>
                                        {r.type === 'cocina' && <span className="text-xl">🥘</span>}
                                        {r.type === 'habilidad' && <span className="text-xl">🛠️</span>}
                                    </div>
                                    <h3 className="text-xl font-serif text-white mb-2">{r.title}</h3>
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-4">{r.description}</p>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-white/5 pt-4">
                                        <div className="flex items-center gap-1">
                                            <span>⏱️</span> {r.time || 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`w-2 h-2 rounded-full ${r.difficulty === 'easy' ? 'bg-green-500' :
                                                r.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}></span>
                                            <span className="capitalize">{r.difficulty}</span>
                                        </div>
                                        <div className="ml-auto">
                                            {new Date((r.createdAt as any)?.seconds * 1000).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {(r.audioUrl || r.narratedAudioUrl) && (
                                        <div className="mt-2 text-xs text-sap-400 flex items-center gap-1">
                                            <span>🎧 Audio disponible</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {userRecipes.length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                <p>Aún no has documentado recetas ni habilidades.</p>
                            </div>
                        )}
                        <button onClick={() => setStep('type')} className="mt-8 text-gray-500 hover:text-white w-full py-4 block">← Volver</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrearReceta;
