import React, { useState, useRef, useEffect } from 'react';
import { GeminiLiveStorySession } from '../../services/geminiLiveService';
import { DAILY_COMPANION, DAILY_PROMPTS, createDailyEntryFromInterview, getUserDailyEntries, getUserStreak, DailyEntry } from '../../services/dailyService';
import { auth } from '../../services/firebase';

interface GrabacionDiariaProps {
    onBack: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const GrabacionDiaria: React.FC<GrabacionDiariaProps> = ({ onBack }) => {
    const [step, setStep] = useState<'prompt' | 'recording' | 'processing' | 'saved'>('prompt');
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [userTranscript, setUserTranscript] = useState('');
    const [fullUserTranscript, setFullUserTranscript] = useState('');
    const [fullConversationTranscript, setFullConversationTranscript] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [processedEntry, setProcessedEntry] = useState<DailyEntry | null>(null);
    const [history, setHistory] = useState<DailyEntry[]>([]);
    const [streak, setStreak] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Pick a random prompt once
    const [currentPrompt] = useState(DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)]);

    const sessionRef = useRef<GeminiLiveStorySession | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load streak and history
    useEffect(() => {
        const loadData = async () => {
            const userId = auth.currentUser?.uid;
            if (userId) {
                const s = await getUserStreak(userId);
                setStreak(s);
                const h = await getUserDailyEntries(userId);
                setHistory(h);
            }
        };
        loadData();
    }, [step]); // Refresh when step changes (e.g. after save)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentTranscript, userTranscript]);

    useEffect(() => {
        return () => {
            if (sessionRef.current) sessionRef.current.stop();
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        };
    }, []);

    const handleStartRecording = async () => {
        setStep('recording');
        setMessages([]);
        setFullUserTranscript('');
        setFullConversationTranscript('');
        setError(null);
        setIsConnecting(true);

        sessionRef.current = new GeminiLiveStorySession(DAILY_COMPANION, {
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
                    setFullConversationTranscript(prev => prev + '\n\n' + `[Diario]: ${assistantText}`);
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

    const handleFinish = async () => {
        if (!sessionRef.current) return;

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

            const entry = await createDailyEntryFromInterview(
                userId,
                currentPrompt,
                fullConversationTranscript, // Better context for mood analysis
                audioBlob,
                recordingDuration
            );

            setProcessedEntry(entry);
            setStep('saved');
        } catch (err: any) {
            setError(err.message);
            setStep('prompt');
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-roots-900 to-roots-950 p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-serif text-white">Grabación Diaria</h1>
                        <p className="text-gray-500">Un espacio seguro para tus pensamientos</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex justify-between">
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* Mode: Prompt (Start) */}
                {step === 'prompt' && (
                    <div className="animate-fade-in">
                        {/* Streak Card */}
                        <div className="mb-6 bg-roots-800/30 rounded-2xl p-4 flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🔥</span>
                                <div>
                                    <p className="text-white font-bold">{streak} día(s) seguidos</p>
                                    <p className="text-gray-500 text-xs text-start">Construyendo tu legado día a día</p>
                                </div>
                            </div>
                            {streak > 0 && <span className="text-green-400 text-sm font-medium">¡Sigue así!</span>}
                        </div>

                        {/* Prompt Card */}
                        <div className="bg-gradient-to-br from-canopy-900/30 to-roots-800/50 rounded-3xl p-8 border border-canopy-500/20 mb-8 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 bg-canopy-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 text-canopy-400 text-sm mb-4 uppercase tracking-wider font-medium">
                                    <span className="w-2 h-2 rounded-full bg-canopy-400 animate-pulse"></span>
                                    Pregunta del día
                                </div>
                                <h2 className="text-3xl text-white font-serif leading-relaxed mb-8">
                                    "{currentPrompt}"
                                </h2>

                                <button
                                    onClick={handleStartRecording}
                                    className="w-full py-5 rounded-2xl bg-canopy-600 hover:bg-canopy-500 text-white font-semibold transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-canopy-900/40 flex items-center justify-center gap-3"
                                >
                                    <span className="text-xl">🎙️</span>
                                    Reflexionar ahora
                                </button>
                                <p className="text-center text-gray-500 text-sm mt-4">
                                    Tu compañero de diario IA te escuchará y guiará
                                </p>
                            </div>
                        </div>

                        {/* Recent History */}
                        <h3 className="text-lg text-white mb-4 font-serif">Tus momentos recientes</h3>
                        <div className="space-y-3">
                            {history.slice(0, 3).map((entry) => (
                                <div
                                    key={entry.id}
                                    onClick={() => {
                                        setProcessedEntry(entry);
                                        setStep('saved');
                                    }}
                                    className="p-4 rounded-2xl bg-roots-800/30 border border-white/5 flex items-center gap-4 hover:border-canopy-500/20 transition-all cursor-pointer hover:bg-roots-800/50"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl flex-shrink-0">
                                        {entry.moodEmoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-white font-medium truncate pr-2">{entry.summary}</p>
                                            <span className="text-gray-500 text-xs whitespace-nowrap">{entry.date}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {entry.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="text-xs text-canopy-400 bg-canopy-500/10 px-2 py-0.5 rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    {entry.audioUrl && <span className="text-gray-600 text-xs">🎤 {formatDuration(entry.duration || 0)}</span>}
                                </div>
                            ))}
                            {history.length === 0 && (
                                <p className="text-gray-500 italic text-center py-4">Aún no hay reflexiones. ¡Empieza hoy!</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Mode: Recording (Chat) */}
                {step === 'recording' && (
                    <div className="animate-fade-in flex flex-col h-[600px]">
                        <div className="flex items-center justify-between mb-4 bg-roots-800/30 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                <span className="text-white font-mono">{formatDuration(recordingDuration)}</span>
                            </div>
                            <button
                                onClick={handleFinish}
                                disabled={!isConnected || fullUserTranscript.length < 5}
                                className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors uppercase text-xs font-bold tracking-wider"
                            >
                                ■ Finalizar
                            </button>
                        </div>

                        {/* Chat Window */}
                        <div className="flex-1 bg-roots-800/30 rounded-2xl border border-white/5 overflow-hidden relative mb-4">
                            <div className="absolute inset-0 overflow-y-auto p-6 space-y-6">
                                {/* Prompt Bubble */}
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] px-5 py-3 rounded-2xl bg-canopy-900/30 text-canopy-200 border border-canopy-500/20 rounded-bl-sm">
                                        {currentPrompt}
                                    </div>
                                </div>

                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-base ${msg.role === 'user'
                                            ? 'bg-canopy-600 text-white rounded-br-sm'
                                            : 'bg-white/10 text-gray-200 rounded-bl-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}

                                {/* Live Transcripts */}
                                {currentTranscript && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="max-w-[85%] px-5 py-3 rounded-2xl bg-white/5 text-gray-400 border border-white/10 rounded-bl-sm italic">
                                            {currentTranscript}
                                        </div>
                                    </div>
                                )}
                                {userTranscript && (
                                    <div className="flex justify-end animate-fade-in">
                                        <div className="max-w-[85%] px-5 py-3 rounded-2xl bg-canopy-600/50 text-white border border-canopy-500/30 rounded-br-sm italic">
                                            {userTranscript}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <button onClick={() => { sessionRef.current?.stop(); setStep('prompt'); }} className="text-gray-500 hover:text-white text-sm">
                            Cancelar grabación
                        </button>
                    </div>
                )}

                {/* Processing */}
                {step === 'processing' && (
                    <div className="text-center py-20 animate-fade-in">
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-canopy-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-canopy-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">🧘</div>
                        </div>
                        <h2 className="text-2xl font-serif text-white mb-2">Guardando tu momento...</h2>
                        <p className="text-gray-500">Analizando sentimientos y guardando recuerdos</p>
                    </div>
                )}

                {/* Saved Summary */}
                {step === 'saved' && processedEntry && (
                    <div className="animate-fade-in text-center py-8">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-canopy-500 to-canopy-700 flex items-center justify-center text-6xl shadow-2xl shadow-canopy-900/50">
                            {processedEntry.moodEmoji}
                        </div>

                        <h2 className="text-3xl font-serif text-white mb-2">¡Día Registrado!</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                            "{processedEntry.summary}"
                        </p>

                        <div className="flex flex-wrap gap-2 justify-center mb-10">
                            {processedEntry.tags.map(tag => (
                                <span key={tag} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                            <button
                                onClick={() => setStep('prompt')}
                                className="py-4 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Volver al Inicio
                            </button>
                            <button
                                onClick={onBack}
                                className="py-4 rounded-xl bg-canopy-600 hover:bg-canopy-500 text-white font-medium transition-colors"
                            >
                                Ir a Mi Legado
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default GrabacionDiaria;
