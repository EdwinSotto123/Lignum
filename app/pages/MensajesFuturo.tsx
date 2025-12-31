import React, { useState, useEffect, useRef } from 'react';
import {
    createFutureMessage,
    getUserFutureMessages,
    deleteFutureMessage,
    FutureMessage,
    RecipientType
} from '../../services/futureMessageService';
import { auth } from '../../services/firebase';

interface MensajesFuturoProps {
    onBack: () => void;
}

const MensajesFuturo: React.FC<MensajesFuturoProps> = ({ onBack }) => {
    const [step, setStep] = useState<'list' | 'create'>('list');
    const [messages, setMessages] = useState<FutureMessage[]>([]);

    // Creation State
    const [recipientType, setRecipientType] = useState<RecipientType>('hijo');
    const [recipientName, setRecipientName] = useState('');
    const [title, setTitle] = useState('');
    const [playDate, setPlayDate] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Load with Auth Listener
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                loadMessages(user.uid);
            } else {
                setMessages([]);
            }
        });
        return () => unsubscribe();
    }, []);

    const loadMessages = async (uid?: string) => {
        try {
            const userId = uid || auth.currentUser?.uid;
            if (userId) {
                const list = await getUserFutureMessages(userId);
                setMessages(list);
            }
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);

            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("No se pudo acceder al micrófono.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
    };

    const resetCreation = () => {
        setStep('list');
        setRecipientType('hijo');
        setRecipientName('');
        setTitle('');
        setPlayDate('');
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setIsRecording(false);
    };

    const handleSave = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId || !audioBlob || !title) return;

        setIsSaving(true);
        try {
            await createFutureMessage(
                userId,
                recipientType,
                recipientName,
                title,
                audioBlob,
                recordingTime,
                playDate ? playDate : undefined
            );
            await loadMessages();
            resetCreation();
        } catch (error) {
            console.error(error);
            alert("Error al guardar mensaje.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("¿Estás seguro de eliminar este mensaje?")) {
            await deleteFutureMessage(id);
            loadMessages();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const recipientTypes: { id: RecipientType; label: string; emoji: string }[] = [
        { id: 'hijo', label: 'Hijo/a', emoji: '👶' },
        { id: 'pareja', label: 'Pareja', emoji: '❤️' },
        { id: 'padres', label: 'Padres', emoji: '👵' },
        { id: 'nietos', label: 'Nietos', emoji: '🐣' },
        { id: 'amigo', label: 'Amigo', emoji: '🤝' },
        { id: 'otro', label: 'Otro', emoji: '📬' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-roots-900 to-roots-950 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-serif text-white">Mensajes para el Futuro</h1>
                            <p className="text-gray-500">Graba hoy, que ellos escuchen mañana</p>
                        </div>
                    </div>
                    {step === 'list' && (
                        <button
                            onClick={() => setStep('create')}
                            className="bg-canopy-600 hover:bg-canopy-500 text-white px-6 py-2 rounded-xl transition-all font-medium flex items-center gap-2"
                        >
                            <span className="text-xl">+</span> Nuevo Mensaje
                        </button>
                    )}
                </div>

                {/* LIST VIEW */}
                {step === 'list' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {messages.length === 0 && (
                            <div className="col-span-full text-center py-20 bg-roots-800/30 rounded-3xl border border-white/5">
                                <span className="text-4xl block mb-4">⏳</span>
                                <h3 className="text-xl text-white mb-2">Tu cápsula del tiempo está vacía</h3>
                                <p className="text-gray-500">Empieza a grabar mensajes que perdurarán por siempre.</p>
                            </div>
                        )}

                        {messages.map(msg => (
                            <div key={msg.id} className="bg-roots-800/50 rounded-2xl p-6 border border-white/5 hover:border-canopy-500/30 transition-all group relative overflow-hidden">
                                {msg.playDate && (
                                    <div className="absolute top-3 right-3 bg-roots-950/80 text-gray-400 text-xs px-2 py-1 rounded border border-white/10 flex items-center gap-1">
                                        🔒 Hasta {msg.playDate}
                                    </div>
                                )}

                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-canopy-500/20 flex items-center justify-center text-2xl">
                                        {recipientTypes.find(t => t.id === msg.recipientType)?.emoji || '📬'}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium line-clamp-1" title={msg.title}>{msg.title}</h3>
                                        <p className="text-sm text-gray-400">Para: {msg.recipientName || msg.recipientType}</p>
                                    </div>
                                </div>

                                <div className="bg-roots-900/50 rounded-xl p-3 mb-4 flex items-center justify-between">
                                    <span className="text-xs text-canopy-400 font-mono">AUDIO RAW</span>
                                    <span className="text-xs text-gray-400">{formatTime(msg.duration)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <audio controls src={msg.audioUrl} className="w-full h-8 opacity-70 hover:opacity-100 transition-opacity" />
                                    <button
                                        onClick={(e) => handleDelete(msg.id!, e)}
                                        className="text-red-400/50 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* CREATE VIEW */}
                {step === 'create' && (
                    <div className="max-w-2xl mx-auto bg-roots-800/30 rounded-3xl p-8 border border-white/5 animate-fade-in">
                        <div className="space-y-6">

                            {/* 1. Recipient */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">¿A quién va dirigido?</label>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    {recipientTypes.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setRecipientType(type.id)}
                                            className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${recipientType === type.id
                                                ? 'bg-canopy-600 border-canopy-500 text-white'
                                                : 'bg-roots-900 border-white/10 text-gray-400 hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="text-2xl">{type.emoji}</span>
                                            <span className="text-xs font-medium">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nombre específico (Opcional, ej: 'Juanito')"
                                    value={recipientName}
                                    onChange={e => setRecipientName(e.target.value)}
                                    className="w-full bg-roots-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-canopy-500/50"
                                />
                            </div>

                            {/* 2. Details */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Título del Mensaje</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Para cuando te gradúes, Consejo sobre el amor..."
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-roots-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-canopy-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Fecha de apertura (Opcional)</label>
                                <input
                                    type="date"
                                    value={playDate}
                                    onChange={e => setPlayDate(e.target.value)}
                                    className="w-full bg-roots-900 border border-white/10 rounded-xl px-4 py-3 text-white color-scheme-dark focus:outline-none focus:border-canopy-500/50"
                                />
                                <p className="text-xs text-gray-500 mt-1">Si seleccionas una fecha, marcaremos el mensaje como "Cápsula del Tiempo".</p>
                            </div>

                            {/* 3. Recorder */}
                            <div className="pt-6 border-t border-white/5">
                                {!audioBlob ? (
                                    <div className="text-center">
                                        <div className="mb-4">
                                            <span className="text-5xl font-mono text-white">{formatTime(recordingTime)}</span>
                                        </div>
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording
                                                ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30'
                                                : 'bg-canopy-600 hover:bg-canopy-500 hover:scale-110'
                                                }`}
                                        >
                                            {isRecording ? (
                                                <div className="w-8 h-8 bg-white rounded-md" />
                                            ) : (
                                                <div className="w-8 h-8 bg-white rounded-full" />
                                            )}
                                        </button>
                                        <p className="text-sm text-gray-400 mt-4">
                                            {isRecording ? 'Grabando... (Toca para detener)' : 'Toca para grabar audio'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-roots-900 rounded-xl p-4 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-green-400 text-sm font-medium">✓ Audio grabado</span>
                                            <button onClick={() => setAudioBlob(null)} className="text-xs text-red-400 hover:text-red-300">Descartar y regrabar</button>
                                        </div>
                                        <audio controls src={audioUrl!} className="w-full" />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={resetCreation}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!title || !audioBlob || isSaving}
                                    className="flex-1 py-3 rounded-xl bg-canopy-600 hover:bg-canopy-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-colors flex justify-center items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                                            Guardando...
                                        </>
                                    ) : (
                                        'Guardar Mensaje'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MensajesFuturo;
