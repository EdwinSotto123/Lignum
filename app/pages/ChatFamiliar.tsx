import React, { useState, useRef, useEffect } from 'react';
import { FamilyMember } from '../AppShell';
import { ChatMessage } from '../../types';
import { sendMessageToGemini } from '../../services/geminiService';

interface ChatFamiliarProps {
    member: FamilyMember;
    onBack: () => void;
}

const ChatFamiliar: React.FC<ChatFamiliarProps> = ({ member, onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'model',
            text: `¡Hola, mi amor! Soy ${member.name}. ¿En qué te puedo ayudar hoy? Puedes preguntarme lo que quieras, pedirme un consejo, o simplemente conversar conmigo.`
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'active' | 'legacy'>('active');
    const [chatMode, setChatMode] = useState<'text' | 'live'>('text');
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const quickPrompts = {
        active: [
            { text: '¿Cómo hago la receta del arroz?', icon: '🍳' },
            { text: '¿Qué hago si el bebé tiene fiebre?', icon: '👶' },
            { text: '¿Cómo destapo el lavabo?', icon: '🔧' }
        ],
        legacy: [
            { text: 'Te extraño mucho', icon: '💕' },
            { text: 'Necesito un consejo sobre mi vida', icon: '💭' },
            { text: 'Cuéntame una historia tuya', icon: '📖' }
        ]
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        const lowerInput = userMessage.toLowerCase();
        if (lowerInput.includes('extraño') || lowerInput.includes('triste') || lowerInput.includes('consejo') || lowerInput.includes('amor') || lowerInput.includes('miedo')) {
            setMode('legacy');
        } else {
            setMode('active');
        }

        try {
            const systemPrompt = `Eres ${member.name}, un familiar amoroso que responde como si fuera esa persona real. 
      Tu relación con quien te escribe: ${member.relation}.
      
      Características:
      - Hablas con cariño, usando expresiones como "mi amor", "tesoro", "hijo/a"
      - Tienes décadas de experiencia y sabiduría
      - Recuerdas historias de la familia
      - Das consejos prácticos y emocionales
      - Tu tono es cálido pero directo
      
      El mensaje del usuario es: "${userMessage}"
      
      Responde como ${member.name} lo haría, en español, de manera natural y afectuosa. Mantén la respuesta breve (2-4 oraciones).`;

            const response = await sendMessageToGemini(systemPrompt);
            setMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: 'Ay, mi amor, parece que hay problemas con la señal. ¿Me lo repites?' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartLiveCall = () => {
        setIsLiveActive(true);
        // Simulate the family member greeting
        setTimeout(() => {
            setIsSpeaking(true);
            setTimeout(() => {
                setIsSpeaking(false);
            }, 3000);
        }, 500);
    };

    const handleEndLiveCall = () => {
        setIsLiveActive(false);
        setIsListening(false);
        setIsSpeaking(false);
        setLiveTranscript('');
    };

    const handleToggleMic = () => {
        if (isListening) {
            setIsListening(false);
            // Simulate response
            setLiveTranscript('');
            setTimeout(() => {
                setIsSpeaking(true);
                setTimeout(() => {
                    setIsSpeaking(false);
                }, 2500);
            }, 500);
        } else {
            setIsListening(true);
            // Simulate transcript
            setTimeout(() => {
                setLiveTranscript('¿Cómo preparo el ceviche que hacías tú?');
            }, 1000);
        }
    };

    // Live Call Mode UI
    if (chatMode === 'live') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950 flex flex-col relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute inset-0 transition-opacity duration-1000 ${isLiveActive ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
                            {isListening && (
                                <>
                                    <div className="absolute inset-0 bg-canopy-500/20 rounded-full animate-ping" />
                                    <div className="absolute inset-10 bg-canopy-500/15 rounded-full animate-pulse" />
                                </>
                            )}
                            {isSpeaking && (
                                <>
                                    <div className="absolute inset-0 bg-legacy-500/20 rounded-full animate-ping" />
                                    <div className="absolute inset-10 bg-legacy-500/15 rounded-full animate-pulse" />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Header */}
                <div className="relative z-10 p-4 border-b border-white/5 backdrop-blur-xl bg-roots-900/50">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    if (isLiveActive) handleEndLiveCall();
                                    setChatMode('text');
                                }}
                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h2 className="text-white font-medium">Llamada en Vivo</h2>
                                <p className="text-canopy-400 text-xs flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isLiveActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                                    {isLiveActive ? 'Conectado' : 'Desconectado'}
                                </p>
                            </div>
                        </div>

                        {isLiveActive && (
                            <div className="text-red-400 text-sm font-mono animate-pulse">
                                ● EN VIVO
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Live Call Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    {!isLiveActive ? (
                        /* Pre-call State */
                        <div className="text-center animate-fade-in">
                            <div className="relative w-40 h-40 mx-auto mb-8">
                                <div className="absolute inset-0 bg-gradient-to-br from-canopy-500/30 to-legacy-500/30 rounded-full blur-2xl" />
                                <img
                                    src={member.avatar}
                                    alt={member.name}
                                    className="relative w-full h-full rounded-full object-cover border-4 border-canopy-500/50 shadow-2xl"
                                />
                            </div>
                            <h2 className="text-3xl font-serif text-white mb-2">{member.name}</h2>
                            <p className="text-gray-500 mb-8">{member.relation}</p>

                            <button
                                onClick={handleStartLiveCall}
                                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-lg flex items-center gap-3 mx-auto shadow-xl shadow-green-500/30 hover:scale-105 transition-transform"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                Iniciar Llamada
                            </button>

                            <p className="mt-6 text-gray-600 text-sm max-w-xs mx-auto">
                                Habla en tiempo real con {member.name} usando su voz clonada
                            </p>
                        </div>
                    ) : (
                        /* Active Call State */
                        <div className="text-center w-full max-w-md animate-scale-in">
                            {/* Avatar with Voice Animation */}
                            <div className="relative w-48 h-48 mx-auto mb-8">
                                {/* Animated rings */}
                                {isSpeaking && (
                                    <>
                                        <div className="absolute inset-0 rounded-full border-4 border-legacy-500/50 animate-ping" />
                                        <div className="absolute inset-4 rounded-full border-2 border-legacy-400/30 animate-pulse" />
                                    </>
                                )}
                                {isListening && (
                                    <>
                                        <div className="absolute inset-0 rounded-full border-4 border-canopy-500/50 animate-ping" />
                                        <div className="absolute inset-4 rounded-full border-2 border-canopy-400/30 animate-pulse" />
                                    </>
                                )}

                                {/* Avatar */}
                                <div className={`relative w-full h-full rounded-full overflow-hidden border-4 transition-colors duration-300 shadow-2xl ${isSpeaking ? 'border-legacy-500 shadow-legacy-500/30' :
                                        isListening ? 'border-canopy-500 shadow-canopy-500/30' :
                                            'border-white/20'
                                    }`}>
                                    <img
                                        src={member.avatar}
                                        alt={member.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Status Badge */}
                                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-medium ${isSpeaking ? 'bg-legacy-500 text-roots-950' :
                                        isListening ? 'bg-canopy-500 text-white' :
                                            'bg-white/10 text-gray-400'
                                    }`}>
                                    {isSpeaking ? '🔊 Hablando...' : isListening ? '🎤 Escuchando...' : '⏸️ En espera'}
                                </div>
                            </div>

                            <h2 className="text-2xl font-serif text-white mb-1">{member.name}</h2>
                            <p className="text-gray-500 text-sm mb-8">Llamada en curso</p>

                            {/* Audio Visualizer */}
                            <div className="flex items-center justify-center gap-1 h-16 mb-8">
                                {[...Array(25)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1.5 rounded-full transition-all duration-100 ${isSpeaking ? 'bg-gradient-to-t from-legacy-600 to-legacy-400' :
                                                isListening ? 'bg-gradient-to-t from-canopy-600 to-canopy-400' :
                                                    'bg-white/10'
                                            }`}
                                        style={{
                                            height: (isSpeaking || isListening)
                                                ? `${15 + Math.sin(i * 0.5 + Date.now() * 0.005) * 30}px`
                                                : '8px',
                                            animationDelay: `${i * 50}ms`
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Live Transcript */}
                            {liveTranscript && (
                                <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Tu mensaje</p>
                                    <p className="text-white italic">"{liveTranscript}"</p>
                                </div>
                            )}

                            {/* Call Controls */}
                            <div className="flex items-center justify-center gap-6">
                                {/* Mute Button */}
                                <button
                                    className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                </button>

                                {/* Main Mic Button */}
                                <button
                                    onClick={handleToggleMic}
                                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-2xl ${isListening
                                            ? 'bg-gradient-to-br from-canopy-500 to-canopy-600 shadow-canopy-500/40'
                                            : 'bg-gradient-to-br from-white/20 to-white/10 hover:from-canopy-500/50 hover:to-canopy-600/50'
                                        }`}
                                >
                                    <svg className={`w-8 h-8 ${isListening ? 'text-white' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>

                                {/* End Call Button */}
                                <button
                                    onClick={handleEndLiveCall}
                                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-lg shadow-red-500/30"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Help Text */}
                            <p className="mt-8 text-gray-600 text-xs">
                                Mantén presionado el micrófono para hablar
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Text Chat Mode UI (original)
    return (
        <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950 flex flex-col relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] transition-colors duration-1000 ${mode === 'active' ? 'bg-canopy-500/10' : 'bg-legacy-500/10'
                    }`} />
                <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[150px] transition-colors duration-1000 ${mode === 'active' ? 'bg-canopy-600/5' : 'bg-legacy-600/5'
                    }`} />
            </div>

            {/* Header */}
            <div className={`relative z-10 p-4 border-b border-white/5 backdrop-blur-xl transition-colors duration-500 ${mode === 'active' ? 'bg-canopy-900/10' : 'bg-legacy-900/10'
                }`}>
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Avatar with Status Ring */}
                    <div className="relative">
                        <div className={`absolute inset-0 rounded-xl blur-lg opacity-50 transition-colors duration-500 ${mode === 'active' ? 'bg-canopy-500' : 'bg-legacy-500'
                            }`} />
                        <div className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-colors duration-500 ${mode === 'active' ? 'border-canopy-500' : 'border-legacy-500'
                            }`}>
                            <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-roots-900 transition-colors duration-500 ${mode === 'active' ? 'bg-canopy-400' : 'bg-legacy-400'
                            }`}>
                            <div className="w-full h-full rounded-full animate-ping opacity-50 bg-inherit" />
                        </div>
                    </div>

                    <div className="flex-1">
                        <h2 className="text-white font-medium text-lg">{member.name}</h2>
                        <p className={`text-xs flex items-center gap-1.5 transition-colors duration-500 ${mode === 'active' ? 'text-canopy-400' : 'text-legacy-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${mode === 'active' ? 'bg-canopy-400' : 'bg-legacy-400'}`} />
                            {mode === 'active' ? 'Modo Ayuda Activa' : 'Modo Memoria Profunda'}
                        </p>
                    </div>

                    {/* Live Call Button */}
                    <button
                        onClick={() => setChatMode('live')}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 text-green-400 text-sm font-medium hover:from-green-500/30 hover:to-green-600/30 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Llamar
                    </button>

                    {/* Mode Toggle */}
                    <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/5">
                        <button
                            onClick={() => setMode('active')}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${mode === 'active'
                                ? 'bg-canopy-500 text-white shadow-lg shadow-canopy-500/30'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            💚 Ayuda
                        </button>
                        <button
                            onClick={() => setMode('legacy')}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${mode === 'legacy'
                                ? 'bg-legacy-500 text-roots-950 shadow-lg shadow-legacy-500/30'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            💛 Memoria
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            {msg.role === 'model' && (
                                <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 flex-shrink-0 ${mode === 'active' ? 'border-canopy-500/50' : 'border-legacy-500/50'
                                    }`}>
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Message Bubble */}
                            <div className={`max-w-[75%] px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-xl transition-colors duration-500 ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-white/10 to-white/5 text-white border border-white/10 rounded-br-sm'
                                : mode === 'active'
                                    ? 'bg-gradient-to-br from-canopy-900/40 to-canopy-800/20 text-canopy-50 border border-canopy-500/20 rounded-bl-sm'
                                    : 'bg-gradient-to-br from-legacy-900/40 to-legacy-800/20 text-legacy-50 border border-legacy-500/20 rounded-bl-sm'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {/* Loading Animation */}
                    {isLoading && (
                        <div className="flex gap-3 animate-fade-in">
                            <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 flex-shrink-0 ${mode === 'active' ? 'border-canopy-500/50' : 'border-legacy-500/50'
                                }`}>
                                <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                            </div>
                            <div className={`px-6 py-4 rounded-2xl rounded-bl-sm flex items-center gap-2 ${mode === 'active'
                                ? 'bg-gradient-to-br from-canopy-900/40 to-canopy-800/20 border border-canopy-500/20'
                                : 'bg-gradient-to-br from-legacy-900/40 to-legacy-800/20 border border-legacy-500/20'
                                }`}>
                                <div className={`w-2 h-2 rounded-full animate-bounce ${mode === 'active' ? 'bg-canopy-400' : 'bg-legacy-400'}`} style={{ animationDelay: '0ms' }} />
                                <div className={`w-2 h-2 rounded-full animate-bounce ${mode === 'active' ? 'bg-canopy-400' : 'bg-legacy-400'}`} style={{ animationDelay: '150ms' }} />
                                <div className={`w-2 h-2 rounded-full animate-bounce ${mode === 'active' ? 'bg-canopy-400' : 'bg-legacy-400'}`} style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Prompts */}
            <div className="relative z-10 px-6 py-4 border-t border-white/5 bg-roots-900/50 backdrop-blur-xl">
                <div className="max-w-3xl mx-auto">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Sugerencias rápidas</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {quickPrompts[mode].map((prompt, idx) => (
                            <button
                                key={idx}
                                onClick={() => setInput(prompt.text)}
                                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all hover:scale-105 ${mode === 'active'
                                    ? 'bg-canopy-500/10 border-canopy-500/20 text-canopy-300 hover:bg-canopy-500/20'
                                    : 'bg-legacy-500/10 border-legacy-500/20 text-legacy-300 hover:bg-legacy-500/20'
                                    }`}
                            >
                                <span className="mr-2">{prompt.icon}</span>
                                {prompt.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Input Area */}
            <div className="relative z-10 p-4 bg-roots-950/80 backdrop-blur-xl border-t border-white/5">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3 items-center">
                        {/* Voice Button - Goes to Live Mode */}
                        <button
                            type="button"
                            onClick={() => setChatMode('live')}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 text-green-400 hover:from-green-500/30 hover:to-green-600/30`}
                            title="Llamada en vivo"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>

                        {/* Input Field */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={`Habla con ${member.name.split(' ')[0]}...`}
                                className={`w-full bg-white/5 border rounded-xl py-4 px-5 text-white placeholder-gray-500 focus:outline-none transition-all ${mode === 'active'
                                    ? 'border-white/10 focus:border-canopy-500/50 focus:bg-canopy-500/5'
                                    : 'border-white/10 focus:border-legacy-500/50 focus:bg-legacy-500/5'
                                    }`}
                            />
                        </div>

                        {/* Send Button */}
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg ${mode === 'active'
                                ? 'bg-gradient-to-br from-canopy-500 to-canopy-600 shadow-canopy-500/30'
                                : 'bg-gradient-to-br from-legacy-500 to-legacy-600 shadow-legacy-500/30'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>

        </div>
    );
};

export default ChatFamiliar;
