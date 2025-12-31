import React, { useState, useRef, useEffect } from 'react';
import { GeminiLiveStorySession } from '../../services/geminiLiveService';
import { WISDOM_TOPICS, createWisdomFromInterview, getUserWisdom, Wisdom } from '../../services/wisdomService';
import { auth } from '../../services/firebase';

interface CrearSabiduriaProps {
    onBack: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const CrearSabiduria: React.FC<CrearSabiduriaProps> = ({ onBack }) => {
    const [step, setStep] = useState<'select' | 'interview' | 'processing' | 'complete' | 'history'>('select');
    const [selectedTopic, setSelectedTopic] = useState<typeof WISDOM_TOPICS[0] | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [userTranscript, setUserTranscript] = useState('');
    const [fullUserTranscript, setFullUserTranscript] = useState('');
    const [fullConversationTranscript, setFullConversationTranscript] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [processedWisdom, setProcessedWisdom] = useState<Wisdom | null>(null);
    const [userWisdomList, setUserWisdomList] = useState<Wisdom[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<GeminiLiveStorySession | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentTranscript, userTranscript]);

    // Load user wisdom
    useEffect(() => {
        const loadWisdom = async () => {
            const userId = auth.currentUser?.uid;
            if (userId) {
                const list = await getUserWisdom(userId);
                setUserWisdomList(list);
            }
        };
        loadWisdom();
    }, [step]); // Reload when changing steps (e.g. after saving)

    // Cleanup
    useEffect(() => {
        return () => {
            if (sessionRef.current) sessionRef.current.stop();
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        };
    }, []);

    const handleStartInterview = async (topic: typeof WISDOM_TOPICS[0]) => {
        setSelectedTopic(topic);
        setStep('interview');
        setMessages([]);
        setFullUserTranscript('');
        setFullConversationTranscript('');
        setError(null);
        setIsConnecting(true);

        // Reuse GeminiLiveStorySession but with Wisdom topics
        sessionRef.current = new GeminiLiveStorySession(topic, {
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
                    setFullConversationTranscript(prev => prev + '\n\n' + `[Mentor]: ${assistantText}`);
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
            setError(err.message || 'Error al iniciar sesión');
            setIsConnecting(false);
        }
    };

    const handleFinishInterview = async () => {
        if (!sessionRef.current || !selectedTopic) return;

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

            // Use the full conversation for better context, or just user transcript?
            // Wisdom prompt is tuned for "transcript", let's pass user transcript mainly but full context helps.
            // Actually wisdomService uses rawTranscript. Let's pass fullUserTranscript for now as prompt says "ignore interviewer".
            // But let's pass full conversation to be safe if prompt changes.
            // Wait, wisdomService prompt says: "IGNORA las intervenciones del entrevistador".
            // So passing fullConversationTranscript is safer so it knows what was asked.

            const wisdom = await createWisdomFromInterview(
                userId,
                selectedTopic.id,
                selectedTopic.emoji,
                fullConversationTranscript, // Passing full conversation
                audioBlob,
                recordingDuration
            );

            setProcessedWisdom(wisdom);
            setStep('complete');
        } catch (err: any) {
            setError(err.message);
            setStep('select');
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const reset = () => {
        setStep('select');
        setMessages([]);
        setFullUserTranscript('');
        setProcessedWisdom(null);
        setRecordingDuration(0);
        setSelectedTopic(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-roots-900 to-roots-950 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-serif text-white">Compartir Sabiduría</h1>
                            <p className="text-gray-500">Deja tus mejores consejos para el futuro</p>
                        </div>
                    </div>
                    {userWisdomList.length > 0 && step === 'select' && (
                        <button onClick={() => setStep('history')} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                            📚 Mis Consejos ({userWisdomList.length})
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex justify-between">
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* SELECT TOPIC */}
                {step === 'select' && (
                    <div className="animate-fade-in">
                        <h2 className="text-xl text-white mb-2">¿Sobre qué quieres reflexionar hoy?</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                            {WISDOM_TOPICS.map(topic => (
                                <button
                                    key={topic.id}
                                    onClick={() => handleStartInterview(topic)}
                                    className="p-6 rounded-2xl bg-roots-800/50 border border-white/5 hover:border-legacy-500/30 transition-all text-left hover:scale-[1.02] hover:bg-roots-800"
                                >
                                    <span className="text-4xl mb-3 block">{topic.emoji}</span>
                                    <h3 className="text-lg text-white font-medium mb-1">{topic.name}</h3>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{topic.openingQuestion}</p>
                                    <div className="flex items-center gap-2 text-legacy-400 text-sm font-medium">
                                        <span className="w-2 h-2 rounded-full bg-legacy-400 animate-pulse"></span>
                                        Iniciar reflexión
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* INTERVIEW */}
                {step === 'interview' && selectedTopic && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{selectedTopic.emoji}</span>
                                <div>
                                    <h2 className="text-xl text-white">{selectedTopic.name}</h2>
                                    <div className="flex items-center gap-2 text-sm">
                                        {isConnected && <span className="text-red-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>Grabando • {formatDuration(recordingDuration)}</span>}
                                        {isConnecting && <span className="text-amber-400">Conectando...</span>}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleFinishInterview}
                                disabled={!isConnected || fullUserTranscript.length < 10}
                                className="px-6 py-2 rounded-xl bg-legacy-600 hover:bg-legacy-500 disabled:bg-gray-700 text-white transition-colors font-medium shadow-lg shadow-legacy-900/20"
                            >
                                ✅ Guardar Sabiduría
                            </button>
                        </div>

                        <div className="bg-roots-800/50 rounded-2xl border border-white/5 h-[500px] flex flex-col relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-roots-900/50 pointer-events-none"></div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-base leading-relaxed ${msg.role === 'user'
                                            ? 'bg-legacy-600/90 text-white rounded-br-sm shadow-md'
                                            : 'bg-white/10 text-gray-200 rounded-bl-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}

                                {/* Live Transcription Bubbles */}
                                {currentTranscript && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="max-w-[85%] px-5 py-4 rounded-2xl bg-white/5 text-gray-400 border border-white/10 rounded-bl-sm">
                                            <div className="flex gap-2 items-center mb-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></span>
                                                <span className="text-xs uppercase tracking-wider font-medium">Mentor IA</span>
                                            </div>
                                            {currentTranscript}
                                        </div>
                                    </div>
                                )}
                                {userTranscript && (
                                    <div className="flex justify-end animate-fade-in">
                                        <div className="max-w-[85%] px-5 py-4 rounded-2xl bg-legacy-600/50 text-white border border-legacy-500/30 rounded-br-sm">
                                            <div className="flex gap-2 items-center justify-end mb-1">
                                                <span className="text-xs uppercase tracking-wider font-medium text-legacy-200">Tú</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-legacy-300 animate-pulse"></span>
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
                            <div className="absolute inset-0 rounded-full border-4 border-legacy-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-legacy-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
                        </div>
                        <h2 className="text-2xl font-serif text-white mb-2">Destilando Sabiduría...</h2>
                        <p className="text-gray-500">La IA está extrayendo la esencia de tus palabras</p>
                    </div>
                )}

                {/* COMPLETE - QUOTE CARD */}
                {step === 'complete' && processedWisdom && (
                    <div className="animate-fade-in max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-legacy-500/20 mb-4 text-3xl">
                                💎
                            </div>
                            <h2 className="text-3xl font-serif text-white mb-2">¡Sabiduría Inmortalizada!</h2>
                            <p className="text-gray-400">Tu legado ha sido guardado para la posteridad.</p>
                        </div>

                        {/* QUOTE CARD */}
                        <div className="bg-gradient-to-br from-roots-800 to-roots-900 rounded-3xl p-8 border border-legacy-500/20 shadow-2xl shadow-legacy-900/50 transform transition-all hover:scale-[1.01] mb-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl font-serif text-white pointer-events-none">"</div>

                            <div className="relative z-10">
                                <div className="flex gap-2 mb-6">
                                    {processedWisdom.tags.map(tag => (
                                        <span key={tag} className="px-3 py-1 rounded-full bg-white/5 text-legacy-300 text-xs uppercase tracking-wider font-medium border border-white/5">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <blockquote className="text-2xl md:text-3xl font-serif text-white leading-relaxed mb-6 italic">
                                    "{processedWisdom.quote}"
                                </blockquote>

                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>

                                <h4 className="text-sm text-legacy-400 uppercase tracking-widest mb-2 font-medium">La Lección</h4>
                                <p className="text-gray-300 leading-relaxed text-lg">
                                    {processedWisdom.lesson}
                                </p>
                            </div>

                            {/* Audio Player Tiny */}
                            {/* Audio Players */}
                            <div className="mt-8 space-y-3">
                                {processedWisdom.narratedAudioUrl && (
                                    <div className="bg-legacy-900/30 rounded-xl p-3 flex items-center gap-3 border border-legacy-500/30">
                                        <div className="w-8 h-8 rounded-full bg-legacy-500 flex items-center justify-center text-roots-950">
                                            <span className="text-sm">🗣️</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-legacy-300 mb-1">Tu Voz Clonada (IA)</p>
                                            <audio controls src={processedWisdom.narratedAudioUrl} className="h-6 w-full opacity-90" />
                                        </div>
                                    </div>
                                )}
                                {processedWisdom.audioUrl && (
                                    <div className="bg-black/20 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                            <span className="text-sm">🎤</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 mb-1">Grabación Original</p>
                                            <audio controls src={processedWisdom.audioUrl} className="h-6 w-full opacity-70 hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={reset} className="flex-1 py-4 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">
                                + Agregar Otra
                            </button>
                            <button onClick={onBack} className="flex-1 py-4 rounded-xl bg-legacy-600 hover:bg-legacy-500 text-white font-medium shadow-lg shadow-legacy-900/30 transition-colors">
                                Volver al Inicio
                            </button>
                        </div>
                    </div>
                )}

                {/* HISTORY */}
                {step === 'history' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl text-white">Mis Perlas de Sabiduría</h2>
                            <button onClick={() => setStep('select')} className="px-4 py-2 bg-legacy-600 rounded-lg text-white text-sm hover:bg-legacy-500 transition-colors">
                                + Nueva
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {userWisdomList.map(wisdom => (
                                <div
                                    key={wisdom.id}
                                    onClick={() => {
                                        setProcessedWisdom(wisdom);
                                        setStep('complete');
                                    }}
                                    className="bg-roots-800/30 rounded-2xl p-6 border border-white/5 hover:border-legacy-500/20 transition-all group cursor-pointer hover:bg-roots-800/50"
                                >
                                    <div className="text-4xl text-legacy-500/20 font-serif absolute -mt-4 -ml-2">"</div>
                                    <div className="relative">
                                        <p className="text-xl text-white font-serif italic mb-4 line-clamp-3">"{wisdom.quote}"</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {wisdom.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md">{tag}</span>
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-400 line-clamp-3 mb-4">{wisdom.lesson}</p>
                                        {(wisdom.audioUrl || wisdom.narratedAudioUrl) && (
                                            <div className="flex items-center gap-2 text-legacy-400 text-xs mt-auto pt-4 border-t border-white/5">
                                                <span>🎤 Audio disponible</span>
                                                <span className="text-gray-600">•</span>
                                                <span>{new Date((wisdom.createdAt as any)?.seconds * 1000).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {userWisdomList.length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                <p>No has guardado ninguna sabiduría aún.</p>
                            </div>
                        )}
                        <button onClick={() => setStep('select')} className="mt-8 text-gray-500 hover:text-white w-full py-4 block">← Volver</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrearSabiduria;
