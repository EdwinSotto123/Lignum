import React, { useState, useEffect, useRef } from 'react';
import { createVoiceClone, isElevenLabsConfigured, getSubscriptionInfo, VoiceCloneResult, textToSpeech } from '../../services/elevenLabsService';
import { uploadAudioSample, saveVoiceClone, updateVoiceWithElevenLabsId, markVoiceAsFailed, VoiceClone, getUserVoiceClones } from '../../services/voiceCloneService';
import { auth } from '../../services/firebase';

interface VoiceCloningProps {
    onComplete: () => void;
}

const VoiceCloning: React.FC<VoiceCloningProps> = ({ onComplete }) => {
    const [step, setStep] = useState<'loading' | 'intro' | 'hasVoice' | 'recording' | 'processing' | 'complete' | 'error'>('loading');
    const [recordings, setRecordings] = useState<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [progress, setProgress] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isApiConfigured, setIsApiConfigured] = useState(true);
    const [subscriptionInfo, setSubscriptionInfo] = useState<{ canCloneVoices: boolean; characterLimit: number } | null>(null);
    const [existingVoice, setExistingVoice] = useState<VoiceClone | null>(null);
    const [isPlayingDemo, setIsPlayingDemo] = useState(false);
    const [demoAudioUrl, setDemoAudioUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const requiredRecordings = 10;
    const minRecordingTime = 3; // minimum 3 seconds per recording

    // Prompts with tone/emotion instructions for better voice training
    const samplePhrases = [
        { text: "Hola mi amor, te quiero contar algo muy importante sobre nuestra familia.", tone: "🗣️ Voz normal y cálida" },
        { text: "¡Qué alegría verte! No sabes cuánto te he extrañado estos días.", tone: "😊 Con mucha alegría y entusiasmo" },
        { text: "Recuerdo cuando eras pequeño y jugábamos juntos en el jardín de la abuela.", tone: "😌 Nostálgico y tranquilo" },
        { text: "¡Cuidado! Eso está muy caliente, no lo toques por favor.", tone: "⚠️ Con urgencia y preocupación" },
        { text: "La vida me ha enseñado que el amor y la paciencia son lo más importante.", tone: "🧘 Pausado y reflexivo (voz baja)" },
        { text: "¡Feliz cumpleaños mi vida! Que todos tus sueños se hagan realidad.", tone: "🎉 Muy emocionado y celebrando" },
        { text: "No te preocupes, todo va a estar bien. Yo estoy aquí contigo.", tone: "🤗 Reconfortante y suave" },
        { text: "¡Increíble! No puedo creer que lo lograste, estoy tan orgulloso de ti.", tone: "🎊 Sorprendido y muy feliz" },
        { text: "Cuando te sientas perdido, solo cierra los ojos y escucha tu corazón.", tone: "🙏 Sabio y sereno (susurrando un poco)" },
        { text: "Esta receta de familia ha pasado por generaciones y ahora te la comparto.", tone: "👨‍🍳 Instructivo pero cariñoso" }
    ];

    const demoTexts = [
        "Hola, soy tu voz clonada. Así es como sonaré cuando cuente tus historias.",
        "Te quiero mucho y siempre estaré aquí para ti, aunque sea de esta forma.",
        "Los recuerdos que compartimos juntos son el tesoro más grande de nuestra familia."
    ];

    useEffect(() => {
        const checkExistingVoice = async () => {
            const userId = auth.currentUser?.uid;
            if (userId) {
                try {
                    const voices = await getUserVoiceClones(userId);
                    if (voices.length > 0 && voices[0].status === 'ready') {
                        setExistingVoice(voices[0]);
                        setStep('hasVoice');
                    } else {
                        setStep('intro');
                    }
                } catch (err) {
                    console.error('Error checking existing voice:', err);
                    setStep('intro');
                }
            } else {
                setStep('intro');
            }
        };

        // Check if ElevenLabs is configured
        const configured = isElevenLabsConfigured();
        setIsApiConfigured(configured);

        if (configured) {
            getSubscriptionInfo().then(info => {
                if (info) {
                    setSubscriptionInfo({
                        canCloneVoices: info.canCloneVoices,
                        characterLimit: info.characterLimit || 0
                    });
                }
            });
        }

        checkExistingVoice();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    // Recording timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            streamRef.current = stream;

            // Setup audio analyzer for visualization
            audioContextRef.current = new AudioContext();
            analyzerRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyzerRef.current);
            analyzerRef.current.fftSize = 256;

            // Start visualization
            const updateLevel = () => {
                if (analyzerRef.current) {
                    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
                    analyzerRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    setAudioLevel(average);
                }
                if (isRecording) {
                    animationRef.current = requestAnimationFrame(updateLevel);
                }
            };
            updateLevel();

            // Setup MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                console.log('🎤 Recording stopped, blob size:', audioBlob.size, 'bytes');

                // Get user ID
                const userId = auth.currentUser?.uid;
                console.log('🔐 User ID for upload:', userId);

                if (userId) {
                    try {
                        console.log('📤 Uploading to Firebase Storage...');
                        const fileName = `sample_${Date.now()}.webm`;
                        const { storageUrl } = await uploadAudioSample(userId, audioBlob, fileName);
                        console.log('✅ Upload SUCCESS! URL:', storageUrl);
                    } catch (err: any) {
                        console.error('❌ Upload FAILED:', err.message);
                    }
                } else {
                    console.error('❌ No user ID - cannot upload');
                }

                setRecordings(prev => {
                    const newRecordings = [...prev, audioBlob];
                    console.log('🎤 Total recordings now:', newRecordings.length, 'of', requiredRecordings);
                    return newRecordings;
                });
                chunksRef.current = [];

                // Stop the stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
                setAudioLevel(0);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            setStep('recording');

        } catch (err: any) {
            console.error('Error accessing microphone:', err);
            setError('No se pudo acceder al micrófono. Por favor, permite el acceso.');
            setStep('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const playVoiceDemo = async () => {
        if (!existingVoice?.elevenLabsVoiceId || existingVoice.elevenLabsVoiceId === 'demo_mode') {
            // Demo mode - just show message
            alert('Tu voz está en modo demo. Para escucharla, necesitas un plan de ElevenLabs.');
            return;
        }

        setIsPlayingDemo(true);
        try {
            const randomText = demoTexts[Math.floor(Math.random() * demoTexts.length)];
            const audioBlob = await textToSpeech(randomText, existingVoice.elevenLabsVoiceId);

            if (audioBlob) {
                const url = URL.createObjectURL(audioBlob);
                setDemoAudioUrl(url);

                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.play();
                } else {
                    const audio = new Audio(url);
                    audioRef.current = audio;
                    audio.play();
                    audio.onended = () => setIsPlayingDemo(false);
                }
            } else {
                alert('No se pudo generar el audio. Verifica tu plan de ElevenLabs.');
            }
        } catch (err) {
            console.error('Error playing demo:', err);
            alert('Error al reproducir la voz.');
        } finally {
            setIsPlayingDemo(false);
        }
    };

    const handleRetrain = () => {
        setExistingVoice(null);
        setRecordings([]);
        setStep('intro');
    };

    const handleProcessVoice = async () => {
        console.log('🎙️ handleProcessVoice called, recordings:', recordings.length);

        if (recordings.length < requiredRecordings) {
            setError(`Se necesitan ${requiredRecordings} grabaciones mínimo.`);
            return;
        }

        const userId = auth.currentUser?.uid;
        console.log('🔐 Current user ID:', userId);

        if (!userId) {
            setError('Debes iniciar sesión para clonar tu voz.');
            setStep('error');
            return;
        }

        setStep('processing');
        setProgress(0);

        let voiceId: string | null = null;

        try {
            // Step 1: Create voice record in Firestore (10%)
            console.log('📝 Creating voice record in Firestore...');
            setProgress(5);
            voiceId = await saveVoiceClone(userId, {
                name: 'Mi Voz Familiar',
                description: 'Clon de voz creado para preservar mi legado',
                audioSamples: [],
                status: 'processing'
            });
            console.log('📝 Voice record created with ID:', voiceId);
            setProgress(10);

            // Step 2: Upload each audio sample to Firebase Storage (10-60%)
            const uploadedSamples = [];
            for (let i = 0; i < recordings.length; i++) {
                const blob = recordings[i];
                const fileName = `sample_${i + 1}.webm`;

                const { storageUrl } = await uploadAudioSample(userId, blob, fileName);

                uploadedSamples.push({
                    id: `sample_${Date.now()}_${i}`,
                    fileName,
                    storageUrl,
                    duration: minRecordingTime, // approximate
                });

                setProgress(10 + Math.floor((i + 1) / recordings.length * 50));
            }

            // Update voice record with uploaded samples
            await saveVoiceClone(userId, {
                id: voiceId,
                audioSamples: uploadedSamples as any,
            });
            setProgress(65);

            // Step 3: Create voice clone with ElevenLabs (65-95%)
            const result: VoiceCloneResult = await createVoiceClone(
                'Mi Voz Familiar',
                recordings
            );

            if (result.success && result.voiceId) {
                // Save ElevenLabs voice ID to Firestore
                await updateVoiceWithElevenLabsId(voiceId, result.voiceId);
                setProgress(100);
                setTimeout(() => setStep('complete'), 500);
            } else if (result.demoMode) {
                // Demo mode - mark as ready without real ElevenLabs ID
                await saveVoiceClone(userId, {
                    id: voiceId,
                    elevenLabsVoiceId: 'demo_mode',
                    status: 'ready'
                });
                setProgress(100);
                setTimeout(() => setStep('complete'), 500);
            } else {
                throw new Error(result.error || 'Error desconocido');
            }

        } catch (err: any) {
            console.error('Voice cloning error:', err);

            // Mark voice as failed if we created a record
            if (voiceId) {
                await markVoiceAsFailed(voiceId, err.message);
            }

            setError(err.message || 'Error al crear el clon de voz');
            setStep('error');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // If API not configured, show warning
    if (!isApiConfigured) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950 flex items-center justify-center p-8">
                <div className="max-w-lg text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <h1 className="text-2xl font-serif text-white mb-4">Configuración Requerida</h1>
                    <p className="text-gray-400 mb-6">
                        Para usar la clonación de voz, el administrador debe configurar la API key de ElevenLabs en Vercel.
                    </p>
                    <div className="bg-roots-800/50 rounded-xl p-4 text-left mb-6">
                        <p className="text-gray-300 text-sm mb-2">Variable de entorno en Vercel Dashboard:</p>
                        <code className="text-canopy-400 text-sm">
                            ELEVENLABS_API_KEY=tu_api_key
                        </code>
                    </div>
                    <a
                        href="https://elevenlabs.io/app/settings/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-canopy-600 hover:bg-canopy-500 text-white font-medium transition-colors"
                    >
                        Obtener API Key
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                    <button
                        onClick={onComplete}
                        className="block w-full mt-4 text-gray-500 hover:text-white transition-colors"
                    >
                        Continuar sin clonar voz
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-canopy-500/10 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px]" />

                {/* Sound Wave Decoration */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="flex items-center gap-1">
                        {[...Array(50)].map((_, i) => (
                            <div
                                key={i}
                                className="w-1 bg-canopy-400 rounded-full transition-all duration-100"
                                style={{
                                    height: `${20 + Math.sin(i * 0.3) * 40 + (isRecording ? audioLevel * 0.5 : 0)}px`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
                <div className="max-w-2xl w-full">

                    {/* Step: Loading */}
                    {step === 'loading' && (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center animate-pulse">
                                <span className="text-3xl">🎙️</span>
                            </div>
                            <p className="text-gray-500">Cargando...</p>
                        </div>
                    )}

                    {/* Step: Has Voice - User already has a cloned voice */}
                    {step === 'hasVoice' && existingVoice && (
                        <div className="text-center animate-fade-in">
                            {/* Success Icon */}
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <div className="absolute inset-0 bg-gradient-to-br from-canopy-500 to-canopy-600 rounded-3xl blur-2xl opacity-50" />
                                <div className="relative w-full h-full bg-gradient-to-br from-canopy-500 to-canopy-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-canopy-500/30">
                                    <span className="text-6xl">🎤</span>
                                </div>
                            </div>

                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-canopy-500/10 text-canopy-400 text-sm font-medium border border-canopy-500/20 mb-6">
                                ✅ Voz Clonada
                            </span>

                            <h1 className="text-4xl font-serif text-white mb-3">
                                Tu Voz Legado
                            </h1>
                            <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
                                Tu voz ha sido clonada y está lista para preservar tus historias y consejos para tu familia.
                            </p>

                            {/* Voice Info Card */}
                            <div className="bg-white/[0.05] backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="text-left">
                                        <h3 className="text-white font-medium text-lg">{existingVoice.name}</h3>
                                        <p className="text-gray-500 text-sm">
                                            {existingVoice.audioSamples?.length || 0} muestras de audio
                                        </p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${existingVoice.status === 'ready'
                                        ? 'bg-canopy-500/20 text-canopy-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {existingVoice.status === 'ready' ? '✅ Lista' : '⏳ Procesando'}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={playVoiceDemo}
                                    disabled={isPlayingDemo}
                                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-canopy-600 to-canopy-500 hover:from-canopy-500 hover:to-canopy-400 text-white font-semibold text-lg transition-all hover:scale-105 shadow-xl shadow-canopy-500/30 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isPlayingDemo ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Reproduciendo...
                                        </>
                                    ) : (
                                        <>
                                            🔊 Escuchar Mi Voz Legado
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleRetrain}
                                    className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all border border-white/10 hover:border-white/20"
                                >
                                    🔄 Entrenar de Nuevo
                                </button>
                            </div>

                            <button
                                onClick={onComplete}
                                className="mt-6 text-gray-500 hover:text-white transition-colors"
                            >
                                Volver al Dashboard
                            </button>
                        </div>
                    )}

                    {/* Step: Intro */}
                    {step === 'intro' && (
                        <div className="text-center animate-fade-in">
                            {/* Hero Icon */}
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <div className="absolute inset-0 bg-gradient-to-br from-canopy-500 to-canopy-600 rounded-3xl blur-2xl opacity-50" />
                                <div className="relative w-full h-full bg-gradient-to-br from-canopy-500 to-canopy-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-canopy-500/30">
                                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                            </div>

                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-canopy-500/10 text-canopy-400 text-sm font-medium border border-canopy-500/20 mb-6">
                                ✨ Tecnología ElevenLabs
                            </span>

                            <h1 className="text-5xl font-serif text-white mb-4">
                                Preserva tu Voz
                            </h1>
                            <h2 className="text-5xl font-serif text-canopy-400 mb-6">
                                para Siempre
                            </h2>
                            <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                                Tu voz es única e irrepetible. Con IA avanzada, podemos clonarla para que tus historias y consejos suenen exactamente como tú.
                            </p>

                            {/* Info about free tier */}
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8 max-w-md mx-auto">
                                <p className="text-yellow-400 text-sm">
                                    ⚠️ <strong>Nota:</strong> La clonación de voz requiere al menos el plan Starter de ElevenLabs ($5/mes).
                                </p>
                            </div>

                            {/* How it works */}
                            <div className="grid md:grid-cols-3 gap-4 mb-10">
                                {[
                                    { icon: '🎙️', title: 'Graba', desc: `Lee ${requiredRecordings} frases` },
                                    { icon: '🧠', title: 'Procesa', desc: 'La IA aprende tu voz' },
                                    { icon: '💬', title: 'Habla', desc: 'Tu voz preservada' }
                                ].map((item, idx) => (
                                    <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <span className="text-3xl mb-3 block">{item.icon}</span>
                                        <h3 className="text-white font-medium mb-1">{item.title}</h3>
                                        <p className="text-gray-500 text-sm">{item.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={startRecording}
                                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-canopy-600 to-canopy-500 hover:from-canopy-500 hover:to-canopy-400 text-white font-semibold text-lg transition-all hover:scale-105 shadow-xl shadow-canopy-500/30"
                            >
                                Comenzar Grabación
                            </button>
                        </div>
                    )}

                    {/* Step: Recording */}
                    {step === 'recording' && (
                        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm rounded-3xl p-10 border border-white/10 shadow-2xl animate-scale-in">
                            {/* Progress Bar */}
                            <div className="mb-10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-gray-400 text-sm">Progreso de grabación</span>
                                    <span className="text-canopy-400 font-medium">{recordings.length} de {requiredRecordings}</span>
                                </div>
                                <div className="h-2 bg-roots-950 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-canopy-600 to-canopy-400 transition-all duration-500 rounded-full"
                                        style={{ width: `${(recordings.length / requiredRecordings) * 100}%` }}
                                    />
                                </div>
                                {/* Progress Dots */}
                                <div className="flex justify-between mt-2">
                                    {[...Array(requiredRecordings)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-3 h-3 rounded-full transition-all ${i < recordings.length
                                                ? 'bg-canopy-500 shadow-lg shadow-canopy-500/50'
                                                : i === recordings.length
                                                    ? 'bg-canopy-500/50 animate-pulse'
                                                    : 'bg-white/10'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {recordings.length < requiredRecordings ? (
                                <>
                                    {/* Current Phrase with Tone */}
                                    <div className="text-center mb-10">
                                        <p className="text-gray-500 text-sm mb-2 uppercase tracking-widest">Lee esta frase en voz alta</p>

                                        {/* Tone Instruction */}
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium border border-purple-500/20 mb-4">
                                            {samplePhrases[recordings.length]?.tone}
                                        </div>

                                        <p className="text-2xl text-white font-serif italic leading-relaxed px-6">
                                            "{samplePhrases[recordings.length]?.text}"
                                        </p>
                                    </div>

                                    {/* Recording Time */}
                                    {isRecording && (
                                        <div className="text-center mb-4">
                                            <span className="text-4xl font-mono text-red-400">{formatTime(recordingTime)}</span>
                                            <p className="text-gray-500 text-sm mt-1">Mínimo {minRecordingTime} segundos</p>
                                        </div>
                                    )}

                                    {/* Audio Visualizer */}
                                    <div className="flex items-center justify-center gap-1 h-20 mb-6">
                                        {[...Array(30)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-2 rounded-full transition-all duration-75 ${isRecording ? 'bg-gradient-to-t from-canopy-600 to-canopy-400' : 'bg-white/10'
                                                    }`}
                                                style={{
                                                    height: isRecording
                                                        ? `${10 + Math.sin(i * 0.5 + Date.now() * 0.005) * 20 + audioLevel * 0.6}px`
                                                        : '10px'
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Mic Button */}
                                    <div className="flex flex-col items-center">
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            disabled={isRecording && recordingTime < minRecordingTime}
                                            className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all ${isRecording ? 'scale-110' : 'hover:scale-105'
                                                }`}
                                        >
                                            {/* Animated Rings */}
                                            {isRecording && (
                                                <>
                                                    <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                                                    <div className="absolute inset-2 rounded-full bg-red-500/20 animate-pulse" />
                                                </>
                                            )}
                                            <div className={`relative w-full h-full rounded-full flex items-center justify-center shadow-2xl ${isRecording
                                                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30'
                                                : 'bg-gradient-to-br from-canopy-600 to-canopy-500 shadow-canopy-500/30 hover:from-canopy-500 hover:to-canopy-400'
                                                }`}>
                                                {isRecording ? (
                                                    <div className="w-8 h-8 rounded bg-white" />
                                                ) : (
                                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                        <p className={`mt-4 text-sm font-medium ${isRecording ? 'text-red-400' : 'text-gray-500'}`}>
                                            {isRecording
                                                ? (recordingTime < minRecordingTime
                                                    ? `Grabando... (espera ${minRecordingTime - recordingTime}s más)`
                                                    : 'Toca para detener')
                                                : 'Toca para grabar'}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                /* All recordings done */
                                <div className="text-center py-8 animate-fade-in">
                                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center shadow-2xl shadow-canopy-500/30">
                                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl text-white font-medium mb-2">¡Grabaciones completas!</h2>
                                    <p className="text-gray-400 mb-8">Ahora procesaremos tu voz para crear tu clon único.</p>
                                    <button
                                        onClick={handleProcessVoice}
                                        className="px-10 py-4 rounded-2xl bg-gradient-to-r from-canopy-600 to-canopy-500 text-white font-semibold transition-all hover:scale-105 shadow-xl shadow-canopy-500/30"
                                    >
                                        Procesar Mi Voz
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Processing */}
                    {step === 'processing' && (
                        <div className="text-center animate-fade-in">
                            {/* Animated Processing Icon */}
                            <div className="relative w-40 h-40 mx-auto mb-10">
                                <div className="absolute inset-0 bg-gradient-to-br from-canopy-500 to-purple-500 rounded-full blur-3xl opacity-30 animate-pulse" />
                                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-roots-800 to-roots-900 border border-white/10 flex items-center justify-center">
                                    <div className="w-20 h-20 border-4 border-canopy-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            </div>

                            <h2 className="text-3xl text-white font-serif mb-3">Procesando tu voz...</h2>
                            <p className="text-gray-400 mb-8">Nuestra IA está aprendiendo tu tono y personalidad única</p>

                            {/* Progress */}
                            <div className="max-w-md mx-auto">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500">Creando clon de voz</span>
                                    <span className="text-canopy-400 font-medium">{progress}%</span>
                                </div>
                                <div className="h-3 bg-roots-800 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-canopy-600 via-canopy-400 to-purple-400 transition-all duration-300 rounded-full relative overflow-hidden"
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step: Complete */}
                    {step === 'complete' && (
                        <div className="text-center animate-fade-in">
                            {/* Success Animation */}
                            <div className="relative w-40 h-40 mx-auto mb-10">
                                <div className="absolute inset-0 bg-gradient-to-br from-canopy-500 to-canopy-400 rounded-full blur-3xl opacity-40 animate-pulse" />
                                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center shadow-2xl shadow-canopy-500/40">
                                    <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>

                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-canopy-500/10 text-canopy-400 text-sm font-medium border border-canopy-500/20 mb-6">
                                ✅ Proceso completado
                            </span>

                            <h2 className="text-4xl text-white font-serif mb-3">¡Tu voz ha sido clonada!</h2>
                            <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                                Ahora puedes crear historias, compartir consejos y grabar tu sabiduría. Tu familia podrá escucharte con tu propia voz.
                            </p>

                            <button
                                onClick={onComplete}
                                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-canopy-600 to-canopy-500 hover:from-canopy-500 hover:to-canopy-400 text-white font-semibold text-lg transition-all hover:scale-105 shadow-xl shadow-canopy-500/30"
                            >
                                Comenzar a Crear
                            </button>
                        </div>
                    )}

                    {/* Step: Error */}
                    {step === 'error' && (
                        <div className="text-center animate-fade-in">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
                                <span className="text-5xl">❌</span>
                            </div>
                            <h2 className="text-2xl text-white font-medium mb-4">Error en el proceso</h2>
                            <p className="text-gray-400 mb-6">{error}</p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => {
                                        setStep('intro');
                                        setRecordings([]);
                                        setError(null);
                                    }}
                                    className="px-6 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                                >
                                    Intentar de nuevo
                                </button>
                                <button
                                    onClick={onComplete}
                                    className="px-6 py-3 rounded-xl bg-canopy-600 hover:bg-canopy-500 text-white transition-colors"
                                >
                                    Continuar sin clonar
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default VoiceCloning;
