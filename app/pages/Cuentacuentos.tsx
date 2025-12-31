import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../services/firebase';
import { processStoryWithGemini, generateStoryAudio, saveStory, getUserStories, Story, uploadSceneImage } from '../../services/storyService';
import { generateSceneImage } from '../../services/imageService';
import DrawingCanvas, { CanvasRef, DrawingTool, BrushType } from '../components/DrawingCanvas';

interface CuentacuentosProps {
    onBack: () => void;
}

interface StoryPage {
    id: number;
    text: string;
    imagePrompt: string;
    generatedImage?: string;
    audioUrl?: string;
}

interface Character {
    name: string;
    description: string;
    visualPrompt: string;
    imageUrl?: string;
}

const Cuentacuentos: React.FC<CuentacuentosProps> = ({ onBack }) => {
    const [step, setStep] = useState<'intro' | 'details' | 'kids' | 'recording' | 'processing' | 'editing' | 'preview' | 'viewer'>('intro');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const [progress, setProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [narratedAudioUrl, setNarratedAudioUrl] = useState<string | null>(null);

    // Viewer State
    const [viewingStory, setViewingStory] = useState<Story | null>(null);
    const [viewerSlide, setViewerSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Form State
    const [storyTitle, setStoryTitle] = useState('');
    const [storySummary, setStorySummary] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);

    // Kids Mode State
    const canvasRef = useRef<CanvasRef>(null);
    const [drawingTool, setDrawingTool] = useState<DrawingTool>({
        type: 'marker',
        color: '#FF6B6B',
        width: 8
    });
    const [savedColors] = useState(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#000000']);

    // Saved Stories State
    const [savedStories, setSavedStories] = useState<Story[]>([]);
    const [loadingStories, setLoadingStories] = useState(false);

    // Recording Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch saved stories on mount
    useEffect(() => {
        const fetchStories = async () => {
            const userId = auth.currentUser?.uid;
            if (userId) {
                setLoadingStories(true);
                try {
                    const stories = await getUserStories(userId);
                    setSavedStories(stories.filter(s => s.category === 'cuento'));
                } catch (error) {
                    console.error('Error fetching stories:', error);
                }
                setLoadingStories(false);
            }
        };
        fetchStories();
    }, []);

    // Recording timer
    useEffect(() => {
        if (isRecording) {
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
                setAudioLevel(Math.random() * 100);
            }, 1000);
        } else if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isRecording]);

    // Auto-slideshow effect for viewer mode
    useEffect(() => {
        if (step !== 'viewer' || !isPlaying || !viewingStory?.scenes?.length) return;

        const totalSlides = viewingStory.scenes.length;
        const audioDuration = audioRef.current?.duration || 60;
        const slideInterval = (audioDuration / totalSlides) * 1000;

        const timer = setInterval(() => {
            setViewerSlide(prev => {
                if (prev >= totalSlides - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, Math.max(slideInterval, 5000)); // Min 5 seconds per slide

        return () => clearInterval(timer);
    }, [step, isPlaying, viewingStory]);

    // Open a story in viewer mode
    const openStoryViewer = (story: Story) => {
        setViewingStory(story);
        setViewerSlide(0);
        setIsPlaying(false);
        setStep('viewer');
    };

    // Start playing the story
    const playStory = () => {
        setIsPlaying(true);
        audioRef.current?.play();
    };

    const handleStartSetup = () => {
        setStep('details');
    };

    const handleStartRecording = async () => {
        if (!storyTitle) setStoryTitle('Mi Nueva Historia');
        audioChunksRef.current = [];
        setRecordingTime(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                // After recording stops, process the audio
                processRecordedAudio();
            };

            recorder.start();
            setIsRecording(true);
            setStep('recording');
        } catch (error) {
            console.error('Microphone access denied:', error);
            alert('Por favor, permite el acceso al micrófono para grabar tu historia.');
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processRecordedAudio = async () => {
        setStep('processing');
        setProgress(0);
        setLoadingMessage('Transcribiendo tu historia... 🎙️');

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // For now, we'll use the summary as the transcript (real transcription would need Gemini Audio)
        // In a real app, you'd send audioBlob to a transcription service
        const transcriptText = storySummary || storyTitle || 'Una historia mágica contada con la voz del corazón.';

        await runAIProcessing(transcriptText, audioBlob);
    };

    const handleGenerateWithAI = async () => {
        if (!storyTitle) setStoryTitle('Cuento Mágico Generado');
        setStep('processing');
        setProgress(0);

        // Use summary + title as the prompt for AI
        const aiPrompt = `Título: ${storyTitle}. ${storySummary || 'Crea una historia mágica e interesante para niños.'}`;
        await runAIProcessing(aiPrompt, null);
    };

    const runAIProcessing = async (inputText: string, audioBlob: Blob | null) => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                throw new Error('Usuario no autenticado');
            }

            // Step 1: Generate Story Structure with Gemini
            setLoadingMessage('Escribiendo el guión mágico... ✨');
            setProgress(10);

            const { title, organizedStory, characters: aiCharacters, scenes } = await processStoryWithGemini(
                inputText,
                'cuento'
            );

            if (title) setStoryTitle(title);
            setProgress(30);

            // Step 2: Generate Character Images
            setLoadingMessage('Creando personajes... 👤');
            const enrichedCharacters: Character[] = [];
            if (aiCharacters && aiCharacters.length > 0) {
                for (const char of aiCharacters) {
                    const imgUrl = await generateSceneImage(char.visualPrompt);
                    enrichedCharacters.push({ ...char, imageUrl: imgUrl });
                }
            }
            setCharacters(enrichedCharacters);
            setProgress(50);

            // Step 3: Generate Scene Images and Upload to Storage
            setLoadingMessage('Dibujando escenas... 🎨');
            const storyId = `cuento_${Date.now()}`;
            const pages: StoryPage[] = [];
            const scenesWithImages: any[] = [];

            if (scenes && scenes.length > 0) {
                for (let i = 0; i < scenes.length; i++) {
                    const scene = scenes[i];
                    setLoadingMessage(`Dibujando escena ${i + 1} de ${scenes.length}... 🎨`);

                    // Generate image with AI
                    const base64Image = await generateSceneImage(scene.visualPrompt);

                    // Upload to Firebase Storage if it's base64
                    let storageUrl = base64Image;
                    if (base64Image.startsWith('data:')) {
                        setLoadingMessage(`Guardando escena ${i + 1}... ☁️`);
                        try {
                            storageUrl = await uploadSceneImage(userId, storyId, base64Image, i + 1);
                        } catch (uploadError) {
                            console.error('Failed to upload image, using fallback:', uploadError);
                            // Use Picsum fallback if upload fails
                            storageUrl = `https://picsum.photos/seed/${encodeURIComponent(scene.visualPrompt?.substring(0, 20) || 'scene')}/1920/1080`;
                        }
                    }

                    pages.push({
                        id: scene.sceneNumber || i + 1,
                        text: scene.narrationText,
                        imagePrompt: scene.visualPrompt,
                        generatedImage: storageUrl
                    });

                    scenesWithImages.push({
                        sceneNumber: scene.sceneNumber || i + 1,
                        description: scene.description,
                        narrationText: scene.narrationText,
                        charactersInScene: scene.charactersInScene,
                        visualPrompt: scene.visualPrompt,
                        imageUrl: storageUrl  // Store the Firebase URL
                    });

                    setProgress(50 + Math.round((i + 1) / scenes.length * 30));
                }
            } else {
                // Fallback if no scenes
                const fallbackImage = await generateSceneImage('A magical storybook opening with sparkles');
                pages.push({
                    id: 1,
                    text: organizedStory || inputText,
                    imagePrompt: 'A magical storybook scene',
                    generatedImage: fallbackImage
                });
            }
            setStoryPages(pages);
            setProgress(80);

            // Step 4: Generate Narration Audio
            setLoadingMessage('Grabando la voz del narrador... 🗣️');
            const fullNarration = pages.map(p => p.text).join(' ');
            const audioUrl = await generateStoryAudio(userId, fullNarration, storyId);
            if (audioUrl) {
                setNarratedAudioUrl(audioUrl);
            }
            setProgress(100);

            // Step 5: Save to Firestore (now with Storage URLs!)
            const charactersForStorage = enrichedCharacters.map(({ imageUrl, ...rest }) => rest);

            await saveStory(userId, {
                title: storyTitle,
                category: 'cuento',
                categoryEmoji: '📖',
                rawTranscript: inputText,
                organizedStory,
                characters: charactersForStorage,
                scenes: scenesWithImages,
                narratedAudioUrl: audioUrl,
            });

            setStep('editing');

        } catch (error) {
            console.error('AI Processing Error:', error);
            setLoadingMessage('¡Ups! Algo salió mal. Intenta de nuevo.');
            // Fallback to mock data
            setStoryPages([
                { id: 1, text: 'Había una vez...', imagePrompt: 'forest', generatedImage: 'https://source.unsplash.com/1600x900/?forest,magical' }
            ]);
            setStep('editing');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-legacy-500/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => {
                            if (step === 'details') setStep('intro');
                            else onBack();
                        }}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-serif text-white">Cuentacuentos Interactivo</h1>
                        <p className="text-gray-500">Cuenta una historia y la IA la hará visual y mágica</p>
                    </div>
                </div>

                {/* Step: Intro */}
                {step === 'intro' && (
                    <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
                        <div className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/30">
                            <span className="text-5xl">📖</span>
                        </div>

                        <h2 className="text-4xl font-serif text-white mb-4">Cuenta tu Historia</h2>
                        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                            Narra con tu voz una historia, un recuerdo o un cuento familiar.
                            Nuestra IA lo transformará en un libro ilustrado interactivo para que tu familia lo disfrute.
                        </p>

                        {/* How it works */}
                        <div className="grid md:grid-cols-3 gap-6 mb-12">
                            {[
                                { icon: '🎙️', title: 'Narra', desc: 'Cuenta tu historia con tu voz' },
                                { icon: '✨', title: 'Magia IA', desc: 'Creamos ilustraciones y páginas' },
                                { icon: '📚', title: 'Comparte', desc: 'Tu familia lo leerá y escuchará' }
                            ].map((item, idx) => (
                                <div key={idx} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <span className="text-4xl mb-4 block">{item.icon}</span>
                                    <h3 className="text-white font-medium mb-2">{item.title}</h3>
                                    <p className="text-gray-500 text-sm">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleStartSetup}
                            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-lg transition-all hover:scale-105 shadow-xl shadow-purple-500/30"
                        >
                            Comenzar a Narrar
                        </button>

                        {/* Child Mode Button */}
                        <div className="mt-6">
                            <button
                                onClick={() => setStep('kids')}
                                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500/20 to-orange-500/20 hover:from-pink-500/30 hover:to-orange-500/30 border-2 border-dashed border-pink-500/40 hover:border-pink-400 text-pink-300 font-medium transition-all hover:scale-105 flex items-center gap-3 mx-auto"
                            >
                                <span className="text-3xl group-hover:animate-bounce">🧒</span>
                                <div className="text-left">
                                    <span className="block text-lg">Soy un Niño</span>
                                    <span className="block text-xs text-pink-400/70">¡Dibuja tu cuento mágico!</span>
                                </div>
                                <span className="text-2xl group-hover:animate-bounce">🎨</span>
                            </button>
                        </div>

                        {/* Tips */}
                        <div className="mt-12 p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-left">
                            {/* ... tips content ... */}
                            <h4 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
                                <span>💡</span>
                                Consejos para una buena historia
                            </h4>
                            <ul className="text-gray-400 text-sm space-y-2">
                                <li>• Habla claro y sin prisa</li>
                                <li>• Incluye descripciones visuales: colores, lugares, personajes</li>
                                <li>• Las historias de 2-5 minutos funcionan mejor</li>
                                <li>• ¡Deja volar tu imaginación!</li>
                            </ul>
                        </div>

                        {/* Mis Cuentos Gallery */}
                        {savedStories.length > 0 && (
                            <div className="mt-12">
                                <h3 className="text-lg font-serif text-white mb-4 flex items-center gap-2">
                                    <span>📚</span> Mis Cuentos Publicados
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {savedStories.map((story) => (
                                        <div
                                            key={story.id}
                                            className="group p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer hover:scale-[1.02]"
                                            onClick={() => openStoryViewer(story)}
                                        >
                                            <div className="aspect-video rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-3 flex items-center justify-center overflow-hidden">
                                                {story.coverImage ? (
                                                    <img src={story.coverImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-4xl">📖</span>
                                                )}
                                            </div>
                                            <h4 className="text-white font-medium truncate">{story.title}</h4>
                                            <p className="text-gray-500 text-xs mt-1">
                                                {story.createdAt?.toDate?.()?.toLocaleDateString() || 'Reciente'}
                                            </p>
                                            {story.narratedAudioUrl && (
                                                <span className="mt-2 inline-flex items-center gap-1 text-xs text-purple-400">
                                                    <span>🗣️</span> Con audio
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {loadingStories && (
                            <div className="mt-8 text-center">
                                <span className="text-gray-500">Cargando cuentos...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Kids Drawing Mode */}
                {step === 'kids' && (
                    <div className="flex-1 flex flex-col lg:flex-row gap-6 animate-fade-in">
                        {/* Left Panel: Story Prompt */}
                        <div className="lg:w-1/4 bg-roots-800/50 rounded-2xl p-6 border border-white/5">
                            <h2 className="text-xl font-bold text-pink-400 mb-4 flex items-center gap-2">
                                <span>🌟</span> Tu Historia
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">¿De qué trata?</label>
                                    <textarea
                                        value={storySummary}
                                        onChange={(e) => setStorySummary(e.target.value)}
                                        placeholder="Ej: Un dragón que hace amigos..."
                                        className="w-full bg-roots-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50 resize-none h-24"
                                    />
                                </div>

                                <button
                                    onClick={async () => {
                                        const drawingData = canvasRef.current?.getImageData();
                                        if (!drawingData || drawingData === "") {
                                            alert("¡Dibuja algo primero! 🎨");
                                            return;
                                        }
                                        // Use drawing as input for AI
                                        const prompt = storySummary || "Un cuento mágico basado en este dibujo";
                                        setStoryTitle('Cuento Mágico');
                                        setStorySummary(prompt);
                                        setStep('processing');
                                        await runAIProcessing(prompt, null);
                                    }}
                                    disabled={!storySummary}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${storySummary
                                        ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:scale-105 shadow-lg shadow-pink-500/30'
                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    🚀 ¡Crear Magia!
                                </button>
                            </div>
                        </div>

                        {/* Center: Canvas */}
                        <div className="flex-1 min-h-[400px] lg:min-h-0">
                            <DrawingCanvas ref={canvasRef} tool={drawingTool} />
                        </div>

                        {/* Right Panel: Tools */}
                        <div className="lg:w-1/4 bg-roots-800/50 rounded-2xl p-6 border border-white/5">
                            <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                                <span>🎨</span> Herramientas
                            </h2>

                            {/* Brushes */}
                            <div className="mb-6">
                                <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Pincel</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { type: 'marker' as BrushType, icon: '🖍️', label: 'Rotulador' },
                                        { type: 'watercolor' as BrushType, icon: '🖌️', label: 'Acuarela' },
                                        { type: 'spray' as BrushType, icon: '🌫️', label: 'Spray' },
                                        { type: 'eraser' as BrushType, icon: '🧼', label: 'Borrador' }
                                    ].map((brush) => (
                                        <button
                                            key={brush.type}
                                            onClick={() => setDrawingTool({ ...drawingTool, type: brush.type })}
                                            className={`p-3 rounded-xl border-2 flex flex-col items-center transition-all ${drawingTool.type === brush.type
                                                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                                                : 'border-white/10 text-gray-400 hover:bg-white/5'
                                                }`}
                                        >
                                            <span className="text-2xl mb-1">{brush.icon}</span>
                                            <span className="text-xs font-medium">{brush.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Size */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Grosor</span>
                                    <span className="text-xs text-gray-500">{drawingTool.width}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="2"
                                    max="40"
                                    value={drawingTool.width}
                                    onChange={(e) => setDrawingTool({ ...drawingTool, width: parseInt(e.target.value) })}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                            {/* Colors */}
                            <div className={`${drawingTool.type === 'eraser' ? 'opacity-30 pointer-events-none' : ''}`}>
                                <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Color</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {savedColors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setDrawingTool({ ...drawingTool, color })}
                                            className={`aspect-square rounded-full border-2 transition-transform ${drawingTool.color === color
                                                ? 'border-white scale-110 ring-2 ring-offset-2 ring-offset-roots-900 ring-purple-500'
                                                : 'border-transparent hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Clear Button */}
                            <button
                                onClick={() => canvasRef.current?.clear()}
                                className="w-full mt-6 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-colors"
                            >
                                🗑️ Borrar Todo
                            </button>

                            {/* Back Button */}
                            <button
                                onClick={() => setStep('intro')}
                                className="w-full mt-2 py-3 rounded-xl bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors"
                            >
                                ← Volver
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Details Form (NEW) */}
                {step === 'details' && (
                    <div className="max-w-xl mx-auto animate-fade-in bg-roots-800/30 p-8 rounded-3xl border border-white/5">
                        <div className="text-center mb-8">
                            <span className="text-4xl mb-4 block">✨</span>
                            <h2 className="text-2xl font-serif text-white mb-2">Detalles del Cuento</h2>
                            <p className="text-gray-500">Antes de narrar, cuéntame un poco de qué trata.</p>
                        </div>

                        <div className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Título de la Historia</label>
                                <input
                                    type="text"
                                    value={storyTitle}
                                    onChange={(e) => setStoryTitle(e.target.value)}
                                    placeholder="Ej: El gato que quería volar..."
                                    className="w-full bg-roots-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                />
                            </div>

                            {/* Summary */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Resumen (Opcional)</label>
                                <textarea
                                    value={storySummary}
                                    onChange={(e) => setStorySummary(e.target.value)}
                                    placeholder="Ej: Trata sobre un gatito que conoce a un pájaro..."
                                    className="w-full bg-roots-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors h-32 resize-none"
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Imagen de Portada (Opcional)</label>
                                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setSelectedImage(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    {selectedImage ? (
                                        <div className="flex items-center justify-center gap-2 text-purple-400">
                                            <span>🖼️</span>
                                            <span className="text-sm font-medium">{selectedImage.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-3xl block mb-2">📷</span>
                                            <span className="text-sm text-gray-500">Sube una foto o dibujo</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={handleStartRecording}
                                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-lg transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                >
                                    <span>🎙️</span>
                                    Narrar Historia
                                </button>

                                <button
                                    onClick={handleGenerateWithAI}
                                    className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg transition-all flex items-center justify-center gap-2 group"
                                >
                                    <span>✨</span>
                                    Generar con IA
                                </button>
                            </div>
                            <p className="text-center text-xs text-gray-500 mt-4">
                                "Narrar" usa tu voz. "Generar con IA" escribe el cuento por ti basado en el título y resumen.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step: Recording */}
                {step === 'recording' && (
                    <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
                        {/* Recording Indicator */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 font-medium">GRABANDO</span>
                        </div>

                        {/* Title Display */}
                        <h3 className="text-2xl text-white font-serif mb-8 max-w-lg mx-auto line-clamp-2">
                            "{storyTitle}"
                        </h3>

                        {/* Timer */}
                        <div className="text-6xl font-mono text-white mb-8">
                            {formatTime(recordingTime)}
                        </div>

                        {/* Audio Visualizer */}
                        <div className="flex items-center justify-center gap-1 h-24 mb-8">
                            {[...Array(40)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-2 rounded-full bg-gradient-to-t from-purple-600 to-purple-400 transition-all duration-100"
                                    style={{
                                        height: `${15 + Math.sin(i * 0.3 + Date.now() * 0.003) * 30 + audioLevel * 0.4}px`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Instructions */}
                        <p className="text-gray-400 mb-8">
                            Narra tu historia... La IA está escuchando y creando mientras hablas.
                        </p>

                        {/* Recording Button */}
                        <button
                            onClick={handleStopRecording}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center mx-auto hover:scale-105 transition-transform shadow-2xl shadow-red-500/30"
                        >
                            <div className="w-8 h-8 rounded bg-white" />
                        </button>
                        <p className="mt-4 text-gray-500 text-sm">Toca para terminar</p>
                    </div>
                )}

                {/* Step: Processing */}
                {step === 'processing' && (
                    <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
                        <div className="relative w-32 h-32 mx-auto mb-8">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-legacy-500 rounded-full blur-2xl opacity-40 animate-pulse" />
                            <div className="relative w-full h-full rounded-full bg-roots-800 border border-white/10 flex items-center justify-center">
                                <span className="text-5xl">✨</span>
                            </div>
                        </div>

                        <h2 className="text-2xl font-serif text-white mb-4">{loadingMessage || 'Creando tu cuento mágico...'}</h2>
                        <p className="text-gray-400 mb-8">La IA está transformando tu idea en un libro ilustrado</p>

                        {/* Progress Steps */}
                        <div className="space-y-4 mb-8 max-w-md mx-auto text-left">
                            {[
                                { label: 'Transcribiendo audio', done: progress >= 25 },
                                { label: 'Identificando escenas', done: progress >= 50 },
                                { label: 'Generando ilustraciones', done: progress >= 75 },
                                { label: 'Creando libro interactivo', done: progress >= 100 }
                            ].map((item, idx) => (
                                <div key={idx} className={`flex items-center gap-3 transition-opacity ${item.done ? 'opacity-100' : 'opacity-40'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.done ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-500'
                                        }`}>
                                        {item.done ? '✓' : (idx + 1)}
                                    </div>
                                    <span className={item.done ? 'text-white' : 'text-gray-500'}>{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Progress Bar */}
                        <div className="max-w-md mx-auto">
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-600 to-legacy-400 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-right text-purple-400 text-sm mt-2">{progress}%</p>
                        </div>
                    </div>
                )}

                {/* Step: Editing / Preview */}
                {(step === 'editing' || step === 'preview') && (
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        {/* Story Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <input
                                    type="text"
                                    value={storyTitle}
                                    onChange={(e) => setStoryTitle(e.target.value)}
                                    className="text-3xl font-serif text-white bg-transparent border-none outline-none focus:ring-0"
                                    placeholder="Título del cuento..."
                                />
                                <p className="text-gray-500 text-sm mt-1">Por Abuelo Taita · {storyPages.length} páginas</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('preview')}
                                    className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-sm"
                                >
                                    Vista Previa
                                </button>
                                <button
                                    onClick={() => {
                                        alert('✅ ¡Cuento publicado! Tu familia ahora puede leerlo.');
                                        onBack();
                                    }}
                                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium text-sm shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform"
                                >
                                    Publicar Cuento
                                </button>
                            </div>
                        </div>

                        {/* Book Preview */}
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Page Navigator */}
                            <div className="space-y-4">
                                <p className="text-gray-500 text-sm uppercase tracking-widest">Páginas</p>
                                {storyPages.map((page, idx) => (
                                    <div
                                        key={page.id}
                                        onClick={() => setCurrentPage(idx)}
                                        className={`w-full p-4 rounded-xl text-left transition-all cursor-pointer ${currentPage === idx
                                            ? 'bg-purple-500/20 border-2 border-purple-500/50'
                                            : 'bg-white/[0.03] border border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <img
                                                src={page.generatedImage}
                                                alt=""
                                                className="w-20 h-14 rounded-lg object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                                                    Página {idx + 1}
                                                </p>
                                                <p className="text-white text-sm line-clamp-2">{page.text}</p>
                                            </div>
                                            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Page */}
                                <button className="w-full p-4 rounded-xl border-2 border-dashed border-white/10 text-gray-500 hover:border-purple-500/50 hover:text-purple-400 transition-all flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Agregar página
                                </button>
                            </div>

                            {/* Current Page Preview */}
                            {storyPages[currentPage] && (
                                <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-3xl border border-white/10 overflow-hidden">
                                    {/* Page Image */}
                                    <div className="relative aspect-video">
                                        <img
                                            src={storyPages[currentPage].generatedImage}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-roots-950 via-transparent to-transparent" />
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <button className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                                                <span>🎨</span>
                                                Regenerar imagen
                                            </button>
                                        </div>
                                        <div className="absolute bottom-4 left-4">
                                            <span className="px-3 py-1 rounded-full bg-purple-500/80 text-white text-xs font-medium">
                                                Página {currentPage + 1} de {storyPages.length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Page Text */}
                                    <div className="p-6">
                                        <textarea
                                            value={storyPages[currentPage].text}
                                            onChange={(e) => {
                                                const updated = [...storyPages];
                                                updated[currentPage].text = e.target.value;
                                                setStoryPages(updated);
                                            }}
                                            className="w-full bg-transparent text-white text-lg leading-relaxed resize-none outline-none min-h-[100px]"
                                        />

                                        {/* Audio Player */}
                                        {narratedAudioUrl && (
                                            <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                                <p className="text-xs text-purple-400 mb-2 flex items-center gap-2">
                                                    <span>🗣️</span> Narración con tu voz
                                                </p>
                                                <audio
                                                    controls
                                                    src={narratedAudioUrl}
                                                    className="w-full h-10"
                                                    style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation */}
                                    <div className="px-6 pb-6 flex justify-between">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                            disabled={currentPage === 0}
                                            className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Anterior
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(storyPages.length - 1, currentPage + 1))}
                                            disabled={currentPage === storyPages.length - 1}
                                            className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Siguiente
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step: Story Viewer (Fullscreen Slideshow) */}
                {step === 'viewer' && viewingStory && (
                    <div className="fixed inset-0 z-50 bg-roots-950 flex flex-col animate-fade-in">
                        {/* Hidden Audio Element */}
                        <audio
                            ref={audioRef}
                            src={viewingStory.narratedAudioUrl || ''}
                            onEnded={() => setIsPlaying(false)}
                            onLoadedMetadata={() => {
                                // Recalculate when audio metadata loads
                            }}
                        />

                        {/* Top Bar */}
                        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                            <button
                                onClick={() => {
                                    setStep('intro');
                                    setViewingStory(null);
                                    audioRef.current?.pause();
                                }}
                                className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h2 className="text-white font-serif text-xl">{viewingStory.title}</h2>
                            <div className="w-10" />
                        </div>

                        {/* Main Slideshow */}
                        <div className="flex-1 relative overflow-hidden">
                            {viewingStory.scenes?.map((scene, idx) => (
                                <div
                                    key={idx}
                                    className={`absolute inset-0 transition-all duration-700 ${idx === viewerSlide
                                        ? 'opacity-100 translate-x-0'
                                        : idx < viewerSlide
                                            ? 'opacity-0 -translate-x-full'
                                            : 'opacity-0 translate-x-full'
                                        }`}
                                >
                                    {/* Scene with Dynamic Background Image */}
                                    <div
                                        className="w-full h-full relative"
                                        style={{
                                            backgroundImage: `url(${(scene as any).imageUrl || `https://picsum.photos/seed/${encodeURIComponent(scene.visualPrompt?.substring(0, 30) || 'story' + idx)}/1920/1080`})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center'
                                        }}
                                    >
                                        {/* Dark overlay for text readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                                        {/* Scene Number Badge */}
                                        <div className="absolute top-6 left-6 px-4 py-2 rounded-full bg-purple-500/80 backdrop-blur-sm text-white text-sm font-medium">
                                            Escena {scene.sceneNumber || idx + 1}
                                        </div>

                                        {/* Narration Text at Bottom */}
                                        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                                            <div className="max-w-4xl mx-auto">
                                                <p className="text-white text-xl md:text-3xl font-serif leading-relaxed text-center drop-shadow-lg">
                                                    {scene.narrationText || scene.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* No scenes fallback */}
                            {(!viewingStory.scenes || viewingStory.scenes.length === 0) && (
                                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                                    <div className="text-center max-w-2xl p-8">
                                        <span className="text-7xl mb-6 block">📖</span>
                                        <h3 className="text-white text-3xl font-serif mb-4">{viewingStory.title}</h3>
                                        <p className="text-white/80 text-lg leading-relaxed">
                                            {viewingStory.organizedStory}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Controls */}
                        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/80 to-transparent">
                            {/* Slide Indicators */}
                            <div className="flex justify-center gap-2 mb-4">
                                {viewingStory.scenes?.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setViewerSlide(idx)}
                                        className={`w-3 h-3 rounded-full transition-all ${idx === viewerSlide
                                            ? 'bg-purple-500 scale-125'
                                            : 'bg-white/30 hover:bg-white/50'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Play/Pause Controls */}
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setViewerSlide(Math.max(0, viewerSlide - 1))}
                                    disabled={viewerSlide === 0}
                                    className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => {
                                        if (isPlaying) {
                                            setIsPlaying(false);
                                            audioRef.current?.pause();
                                        } else {
                                            playStory();
                                        }
                                    }}
                                    className="p-5 rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-400 transition-colors"
                                >
                                    {isPlaying ? (
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>

                                <button
                                    onClick={() => setViewerSlide(Math.min((viewingStory.scenes?.length || 1) - 1, viewerSlide + 1))}
                                    disabled={viewerSlide >= (viewingStory.scenes?.length || 1) - 1}
                                    className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Audio indicator */}
                            {viewingStory.narratedAudioUrl && (
                                <p className="text-center text-purple-400 text-sm mt-4 flex items-center justify-center gap-2">
                                    <span>🗣️</span>
                                    {isPlaying ? 'Reproduciendo narración...' : 'Toca play para escuchar'}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cuentacuentos;
