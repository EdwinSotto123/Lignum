// Gemini Live API Service for LIGNUM
// Real-time voice conversations for story creation

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Types
export interface StoryCategory {
    id: string;
    name: string;
    emoji: string;
    systemPrompt: string;
    openingQuestion: string;
    followUps: string[];
}

export interface GeminiLiveSession {
    send: (message: any) => void;
    sendRealtimeInput: (input: any) => void;
    close: () => void;
}

export interface GeminiLiveCallbacks {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onUserTranscript?: (text: string) => void;
    onAssistantTranscript?: (text: string) => void;
    onTurnComplete?: (userText: string, assistantText: string) => void;
    onAudioResponse?: (audioData: Uint8Array) => void;
    onError?: (error: string) => void;
}

// Audio helpers
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function encode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// Story categories with custom prompts
export const STORY_CATEGORIES: StoryCategory[] = [
    {
        id: 'infancia',
        name: 'Mi Infancia',
        emoji: '🧒',
        systemPrompt: `Eres un entrevistador cálido y empático que ayuda a las personas a recordar y narrar historias de su infancia.
Tu objetivo es guiar una conversación natural donde la persona cuente anécdotas de cuando era niño/a.
Hazle preguntas de seguimiento para obtener más detalles: lugares, personas, emociones, fechas aproximadas.
Sé genuinamente curioso y celebra los recuerdos que comparten.
Mantén respuestas BREVES (2-3 oraciones) para no interrumpir mucho.
Cuando sientas que la historia está completa, agradece y pregunta si hay algo más que quieran agregar.`,
        openingQuestion: '¡Hola! Me encantaría escuchar una historia de tu infancia. ¿Qué anécdota de cuando eras pequeño o pequeña recuerdas con más cariño?',
        followUps: [
            '¿Cuántos años tenías aproximadamente?',
            '¿Dónde estabas cuando pasó esto?',
            '¿Quién más estaba contigo?',
            '¿Cómo te sentiste en ese momento?',
            '¿Por qué crees que este recuerdo es tan especial para ti?'
        ]
    },
    {
        id: 'familia',
        name: 'Familia',
        emoji: '👨‍👩‍👧‍👦',
        systemPrompt: `Eres un entrevistador cálido que ayuda a las personas a preservar momentos especiales con su familia.
Guía la conversación para capturar detalles importantes: quiénes participaron, cuándo fue, qué lo hizo especial.
Muestra interés genuino por los lazos familiares y las tradiciones.
Pregunta sobre emociones y aprendizajes de estos momentos.
Mantén respuestas BREVES (2-3 oraciones).`,
        openingQuestion: '¡Hola! Cuéntame un momento especial que hayas vivido con tu familia. ¿Cuál es esa historia que siempre te hace sonreír?',
        followUps: [
            '¿Quiénes de tu familia estaban presentes?',
            '¿Cuándo fue esto, más o menos?',
            '¿Qué hizo que ese momento fuera tan especial?',
            '¿Hay alguna tradición familiar relacionada?'
        ]
    },
    {
        id: 'aventuras',
        name: 'Aventuras',
        emoji: '🌍',
        systemPrompt: `Eres un entrevistador entusiasta que ayuda a las personas a narrar sus aventuras y viajes.
Guía la conversación para capturar la emoción del descubrimiento, los lugares, las personas que conocieron.
Pregunta sobre desafíos superados, aprendizajes y momentos memorables.
Sé curioso sobre los detalles sensoriales: qué vieron, olieron, sintieron.
Mantén respuestas BREVES (2-3 oraciones).`,
        openingQuestion: '¡Hola! Me encantaría escuchar sobre una aventura emocionante. ¿Cuál ha sido el viaje o experiencia más memorable de tu vida?',
        followUps: [
            '¿A dónde fuiste o dónde ocurrió?',
            '¿Con quién viviste esta aventura?',
            '¿Hubo algún momento de incertidumbre o desafío?',
            '¿Qué descubriste sobre ti mismo en esa experiencia?'
        ]
    },
    {
        id: 'amor',
        name: 'Amor',
        emoji: '❤️',
        systemPrompt: `Eres un entrevistador sensible y respetuoso que ayuda a las personas a preservar historias de amor.
Pueden ser historias románticas, de amistad profunda, o amor familiar.
Guía la conversación con delicadeza, respetando la intimidad del narrador.
Pregunta sobre los sentimientos, los momentos clave, y lo que aprendieron.
Mantén respuestas BREVES (2-3 oraciones).`,
        openingQuestion: '¡Hola! El amor toma muchas formas. ¿Hay alguna historia de amor, ya sea romántica, de amistad, o familiar, que te gustaría preservar?',
        followUps: [
            '¿Cómo empezó esta relación o conexión?',
            '¿Cuál fue el momento que más recuerdas?',
            '¿Qué aprendiste de este amor?',
            '¿Cómo ha influido en tu vida?'
        ]
    },
    {
        id: 'lecciones',
        name: 'Lecciones',
        emoji: '💡',
        systemPrompt: `Eres un entrevistador reflexivo que ayuda a las personas a articular las lecciones más importantes de su vida.
Guía la conversación para extraer la sabiduría detrás de las experiencias.
Pregunta sobre el contexto, lo que sucedió, y cómo cambió su perspectiva.
Ayúdales a formular la lección de manera que pueda transmitirse a otros.
Mantén respuestas BREVES (2-3 oraciones).`,
        openingQuestion: '¡Hola! Todos tenemos momentos que nos enseñaron algo valioso. ¿Cuál es la lección más importante que la vida te ha dado?',
        followUps: [
            '¿Qué estaba pasando en tu vida cuando aprendiste esto?',
            '¿Hubo alguien que te ayudó a entender esta lección?',
            '¿Cómo cambió tu forma de ver las cosas?',
            '¿Qué consejo darías a alguien que está pasando por algo similar?'
        ]
    },
    {
        id: 'otra',
        name: 'Otra Historia',
        emoji: '✨',
        systemPrompt: `Eres un entrevistador versátil y curioso que ayuda a las personas a contar cualquier historia importante para ellos.
Adapta tu estilo a lo que el narrador quiera compartir.
Haz preguntas de seguimiento relevantes al tema que elijan.
Tu objetivo es ayudarles a articular su historia de manera clara y emotiva.
Mantén respuestas BREVES (2-3 oraciones).`,
        openingQuestion: '¡Hola! Me encantaría escuchar tu historia. ¿Qué es eso especial que te gustaría preservar para tu familia?',
        followUps: [
            '¿Cuándo sucedió esto?',
            '¿Quiénes estaban involucrados?',
            '¿Por qué es importante para ti?',
            '¿Hay algún detalle más que quieras agregar?'
        ]
    }
];

// Build system instruction for story category
function buildStorySystemInstruction(category: StoryCategory): string {
    return `${category.systemPrompt}

=== INSTRUCCIONES IMPORTANTES ===
1. Responde SIEMPRE en español
2. Mantén respuestas CORTAS (2-3 oraciones máximo por turno)
3. Haz UNA pregunta a la vez
4. Sé cálido, empático y genuinamente interesado
5. Usa emojis ocasionalmente para ser más expresivo
6. Cuando la historia esté completa, di algo como "¡Qué hermosa historia! ¿Hay algo más que quieras agregar antes de terminar?"

=== PREGUNTAS DE SEGUIMIENTO SUGERIDAS ===
${category.followUps.map((q, i) => `${i + 1}. ${q}`).join('\n')}

=== CIERRE ===
Cuando el usuario diga que terminó o no tiene más que agregar, despídete calurosamente y di que su historia ha sido guardada.`;
}

// Main Gemini Live Session Manager
export class GeminiLiveStorySession {
    private session: GeminiLiveSession | null = null;
    private audioContextInput: AudioContext | null = null;
    private audioContextOutput: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private transcription = { input: '', output: '' };
    private callbacks: GeminiLiveCallbacks;
    private category: StoryCategory;
    private isActive = false;

    // Audio playback
    private sources = new Set<AudioBufferSourceNode>();
    private nextStartTime = 0;
    private outputNode: GainNode | null = null;

    // Recording user audio
    private userAudioChunks: Blob[] = [];
    private mediaRecorder: MediaRecorder | null = null;

    constructor(category: StoryCategory, callbacks: GeminiLiveCallbacks) {
        this.category = category;
        this.callbacks = callbacks;
    }

    async start(): Promise<void> {
        console.log('🚀 GeminiLive: Starting session...');
        console.log('📂 Category:', this.category.name);

        // Fetch API key from server endpoint (not bundled in code)
        let apiKey: string | null = null;
        try {
            const keyResponse = await fetch('/api/gemini-key');
            const keyData = await keyResponse.json();
            apiKey = keyData.key;
        } catch (e) {
            console.error('Failed to fetch API key:', e);
        }

        console.log('🔑 API Key exists:', !!apiKey);

        if (!apiKey) {
            console.error('❌ No API key!');
            this.callbacks.onError?.('API key de Gemini no configurada');
            return;
        }

        try {
            console.log('🔌 Creating GoogleGenAI instance...');
            const ai = new GoogleGenAI({ apiKey });

            // Get microphone access
            console.log('🎤 Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaStream = stream;
            console.log('✅ Microphone access granted');

            // Setup audio contexts
            this.audioContextInput = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            this.audioContextOutput = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            this.outputNode = this.audioContextOutput.createGain();
            this.outputNode.connect(this.audioContextOutput.destination);

            // Setup MediaRecorder to save user audio
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.userAudioChunks.push(e.data);
                }
            };
            this.mediaRecorder.start(1000); // Capture in 1-second chunks

            // Connect to Gemini Live
            console.log('🌐 Connecting to Gemini Live API...');
            console.log('📡 Model: gemini-2.5-flash-native-audio-preview-09-2025');

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('✅ Gemini Live CONNECTED!');
                        this.isActive = true;
                        this.callbacks.onConnect?.();
                        // Audio capture is set up after session is assigned (see below)
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        console.log('📨 Message received:', JSON.stringify(message).slice(0, 200));
                        await this.handleMessage(message);
                    },
                    onerror: (error) => {
                        console.error('❌ Gemini Live ERROR:', error);
                        this.callbacks.onError?.('Error de conexión con Gemini');
                        this.stop();
                    },
                    onclose: () => {
                        console.log('🔌 Gemini Live DISCONNECTED');
                        this.isActive = false;
                        this.callbacks.onDisconnect?.();
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Aoede' // Warm, friendly voice
                            }
                        }
                    },
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    systemInstruction: buildStorySystemInstruction(this.category)
                }
            });

            console.log('⏳ Waiting for session promise...');
            this.session = await sessionPromise;
            console.log('✅ Session created successfully!');

            // Setup audio capture AFTER session is assigned
            console.log('🎙️ Setting up audio capture now that session exists...');
            this.setupAudioCapture();
        } catch (error: any) {
            console.error('❌ Failed to start Gemini Live:', error);
            console.error('Error details:', error.message, error.stack);
            this.callbacks.onError?.(error.message || 'Error al iniciar la sesión');
        }
    }

    private setupAudioCapture(): void {
        console.log('🎙️ Setting up audio capture...');
        if (!this.audioContextInput || !this.mediaStream || !this.session) {
            console.error('❌ Missing components:', {
                input: !!this.audioContextInput,
                stream: !!this.mediaStream,
                session: !!this.session
            });
            return;
        }
        console.log('✅ Audio capture setup complete');

        const source = this.audioContextInput.createMediaStreamSource(this.mediaStream);
        const processor = this.audioContextInput.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (!this.session || !this.isActive) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
            }

            try {
                this.session.sendRealtimeInput({
                    media: {
                        data: encode(new Uint8Array(int16.buffer)),
                        mimeType: 'audio/pcm;rate=16000'
                    }
                });
            } catch (err) {
                console.error('Error sending audio:', err);
            }
        };

        source.connect(processor);
        processor.connect(this.audioContextInput.destination);
    }

    private async handleMessage(message: LiveServerMessage): Promise<void> {
        // Handle output transcription (assistant speaking)
        if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            console.log('🤖 Assistant transcript:', text);
            this.transcription.output += text;
            this.callbacks.onAssistantTranscript?.(this.transcription.output);
        }

        // Handle input transcription (user speaking)
        if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            console.log('👤 User transcript:', text);
            this.transcription.input += text;
            this.callbacks.onUserTranscript?.(this.transcription.input);
        }

        // Handle turn complete
        if (message.serverContent?.turnComplete) {
            console.log('✅ Turn complete! User said:', this.transcription.input);
            console.log('✅ Turn complete! Assistant said:', this.transcription.output);
            if (this.transcription.input || this.transcription.output) {
                this.callbacks.onTurnComplete?.(
                    this.transcription.input,
                    this.transcription.output
                );
            }
            this.transcription = { input: '', output: '' };
        }

        // Handle audio response
        const audioPart = message.serverContent?.modelTurn?.parts?.find(
            (p: any) => p.inlineData?.mimeType?.startsWith('audio/')
        );

        if (audioPart?.inlineData?.data && this.audioContextOutput && this.outputNode) {
            const audioData = decode(audioPart.inlineData.data);
            this.callbacks.onAudioResponse?.(audioData);

            this.nextStartTime = Math.max(this.nextStartTime, this.audioContextOutput.currentTime);
            const audioBuffer = await decodeAudioData(audioData, this.audioContextOutput, 24000, 1);

            const src = this.audioContextOutput.createBufferSource();
            src.buffer = audioBuffer;
            src.connect(this.outputNode);
            src.addEventListener('ended', () => this.sources.delete(src));
            src.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(src);
        }

        // Handle interruption
        if (message.serverContent?.interrupted) {
            for (const s of this.sources.values()) {
                s.stop();
                this.sources.delete(s);
            }
            this.nextStartTime = 0;
        }
    }

    // Send a text message to guide the conversation
    sendText(text: string): void {
        if (!this.session) return;

        try {
            this.session.send({
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [{ text }]
                    }],
                    turnComplete: true
                }
            });
        } catch (error) {
            console.error('Error sending text:', error);
        }
    }

    // Get recorded user audio as blob
    getUserAudioBlob(): Blob | null {
        if (this.userAudioChunks.length === 0) return null;
        return new Blob(this.userAudioChunks, { type: 'audio/webm' });
    }

    stop(): void {
        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        // Close session
        if (this.session) {
            this.session.close();
            this.session = null;
        }

        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }

        // Close audio contexts
        this.audioContextInput?.close();
        this.audioContextOutput?.close();
        this.audioContextInput = null;
        this.audioContextOutput = null;

        // Stop all audio sources
        this.sources.forEach(s => {
            try { s.stop(); } catch { }
        });
        this.sources.clear();
        this.nextStartTime = 0;

        this.isActive = false;
    }

    get active(): boolean {
        return this.isActive;
    }
}

export default GeminiLiveStorySession;
