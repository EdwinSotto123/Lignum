import React, { useState, useRef, useEffect } from 'react';
import { FamilyMember } from '../AppShell';

interface FloatingChatbotProps {
    familyMembers: FamilyMember[];
}

interface SearchResult {
    id: string;
    type: 'receta' | 'sabiduria' | 'historia';
    title: string;
    preview: string;
    author: FamilyMember;
    content: string;
}

interface ChatMessage {
    id: string;
    type: 'user' | 'bot' | 'result';
    text?: string;
    result?: SearchResult;
}

const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ familyMembers }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            type: 'bot',
            text: '¡Hola! 👋 Soy tu asistente familiar. Pregúntame sobre recetas, consejos o historias de tu familia.\n\nPor ejemplo: "¿Cómo prepara el abuelo Taita el ceviche?"'
        }
    ]);
    const [input, setInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
    const [showVoicePlayer, setShowVoicePlayer] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Mock family repository data
    const familyRepository: SearchResult[] = [
        {
            id: '1',
            type: 'receta',
            title: 'Ceviche Tradicional',
            preview: 'El secreto está en el limón fresco y el ají...',
            author: familyMembers.find(m => m.relation === 'Abuelo') || familyMembers[0],
            content: `**Ingredientes:**
- 1 kg de pescado fresco (corvina o lenguado)
- 15 limones frescos
- 1 cebolla morada grande
- Ají limo al gusto
- Cilantro picado
- Sal y pimienta

**Preparación:**
1. Corta el pescado en cubos de 2cm
2. Exprime los limones frescos (nunca de botella)
3. Mezcla el pescado con el limón y sal
4. Deja reposar 10 minutos
5. Agrega la cebolla en juliana
6. Añade el ají y cilantro
7. Sirve con camote y choclo

**Secreto del abuelo:** El pescado debe estar muy frío, casi congelado. Así queda firme y delicioso.`
        },
        {
            id: '2',
            type: 'sabiduria',
            title: 'Sobre tomar decisiones difíciles',
            preview: 'Cuando tengas que elegir, escucha primero a tu corazón...',
            author: familyMembers.find(m => m.relation === 'Abuela') || familyMembers[0],
            content: `Mi amor, en la vida vas a enfrentar muchas decisiones difíciles. Yo siempre te digo: primero respira, no te apures.

Cuando tengas que elegir entre dos caminos, pregúntate: ¿Cuál me dará paz? No cuál me dará más dinero o fama, sino paz.

Tu abuelo siempre decía: "Las mejores decisiones se toman con el estómago lleno y el corazón tranquilo." Nunca decidas cuando estés enojado o con hambre.

Y recuerda, tesoro, equivocarse también está bien. Los errores son maestros disfrazados.`
        },
        {
            id: '3',
            type: 'receta',
            title: 'Arroz con Pollo de la Abuela',
            preview: 'El arroz verde que hacía los domingos...',
            author: familyMembers.find(m => m.relation === 'Abuela') || familyMembers[0],
            content: `**Ingredientes:**
- 2 tazas de arroz
- 1 pollo en presas
- Cilantro (un manojo grande)
- Espinaca
- Arvejas, zanahoria, pimiento

**El secreto:** Licúa el cilantro con la espinaca y un poco de caldo. Eso le da el color verde intenso.

**Preparación:**
1. Dora el pollo con ajo y comino
2. Agrega la verduras
3. Vierte el licuado verde
4. Añade el arroz y el caldo
5. Cocina tapado hasta que esté listo

Siempre lo servíamos con su salsa criolla al costado.`
        },
        {
            id: '4',
            type: 'historia',
            title: 'El día que conocí a tu abuela',
            preview: 'Fue en la fiesta del pueblo, ella llevaba un vestido azul...',
            author: familyMembers.find(m => m.relation === 'Abuelo') || familyMembers[0],
            content: `Fue en la fiesta de San Juan, yo tenía 19 años. Tu abuela llegó con sus amigas, llevaba un vestido azul con flores blancas. 

Yo estaba con mis amigos cuando la vi cruzar la plaza. Le dije a mi compadre: "Esa mujer va a ser mi esposa." Él se rio, pero yo lo decía en serio.

No me atreví a hablarle esa noche. Pero al día siguiente, fui a su casa con un ramo de flores silvestres. Su papá me recibió con cara seria, pero la Rosa se asomó por la ventana y sonrió.

Esa sonrisa, hijo, esa sonrisa me acompañó 52 años.`
        }
    ];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSearch = (query: string) => {
        if (!query.trim()) return;

        // Add user message
        setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', text: query }]);
        setInput('');
        setIsSearching(true);

        // Simulate search delay
        setTimeout(() => {
            // Simple keyword matching (mock search)
            const lowerQuery = query.toLowerCase();
            const results = familyRepository.filter(item =>
                item.title.toLowerCase().includes(lowerQuery) ||
                item.content.toLowerCase().includes(lowerQuery) ||
                item.author.name.toLowerCase().includes(lowerQuery) ||
                (lowerQuery.includes('receta') && item.type === 'receta') ||
                (lowerQuery.includes('consejo') && item.type === 'sabiduria') ||
                (lowerQuery.includes('historia') && item.type === 'historia') ||
                (lowerQuery.includes('ceviche') && item.title.toLowerCase().includes('ceviche')) ||
                (lowerQuery.includes('arroz') && item.title.toLowerCase().includes('arroz')) ||
                (lowerQuery.includes('abuelo') && item.author.relation === 'Abuelo') ||
                (lowerQuery.includes('abuela') && item.author.relation === 'Abuela')
            );

            setIsSearching(false);

            if (results.length > 0) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'result',
                    result: results[0]
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'bot',
                    text: 'No encontré nada con esa búsqueda. Intenta preguntar por:\n\n• "Ceviche del abuelo"\n• "Consejo de la abuela"\n• "Arroz con pollo"\n• "Historia del abuelo"'
                }]);
            }
        }, 1500);
    };

    const quickQuestions = [
        "🍳 Recetas del abuelo",
        "💡 Consejos de la abuela",
        "📖 Historias familiares"
    ];

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'receta': return '🍳';
            case 'sabiduria': return '💡';
            case 'historia': return '📖';
            default: return '📄';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'receta': return 'Receta';
            case 'sabiduria': return 'Sabiduría';
            case 'historia': return 'Historia';
            default: return 'Contenido';
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center group ${isOpen
                        ? 'bg-roots-800 border border-white/10'
                        : 'bg-gradient-to-br from-canopy-500 to-canopy-600 hover:scale-110 shadow-canopy-500/40 hover:shadow-canopy-500/60'
                    }`}
            >
                {isOpen ? (
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <div className="relative">
                        <span className="text-3xl group-hover:scale-110 transition-transform inline-block">🌳</span>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
                            ?
                        </div>
                    </div>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[400px] h-[580px] bg-gradient-to-b from-roots-900 to-roots-950 rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-scale-in">

                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-canopy-900/30 to-roots-900 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center shadow-lg shadow-canopy-500/30">
                                <span className="text-2xl">🌳</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-medium">Asistente Familiar</h3>
                                <p className="text-canopy-400 text-xs flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-canopy-400 rounded-full animate-pulse" />
                                    Buscando en tu repositorio familiar
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id}>
                                {msg.type === 'user' && (
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-sm bg-canopy-600 text-white text-sm">
                                            {msg.text}
                                        </div>
                                    </div>
                                )}

                                {msg.type === 'bot' && (
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-canopy-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm">🌳</span>
                                        </div>
                                        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white/5 border border-white/5 text-gray-300 text-sm whitespace-pre-line">
                                            {msg.text}
                                        </div>
                                    </div>
                                )}

                                {msg.type === 'result' && msg.result && (
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-canopy-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm">🌳</span>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <p className="text-gray-300 text-sm">¡Encontré algo de <strong className="text-canopy-400">{msg.result.author.name}</strong>!</p>

                                            {/* Result Card */}
                                            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
                                                {/* Card Header */}
                                                <div className="p-4 border-b border-white/5">
                                                    <div className="flex items-start gap-3">
                                                        <img
                                                            src={msg.result.author.avatar}
                                                            alt={msg.result.author.name}
                                                            className="w-10 h-10 rounded-xl object-cover border-2 border-canopy-500/30"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-lg">{getTypeIcon(msg.result.type)}</span>
                                                                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                                                                    {getTypeLabel(msg.result.type)}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-white font-medium">{msg.result.title}</h4>
                                                            <p className="text-gray-500 text-xs">por {msg.result.author.name}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Preview */}
                                                <div className="p-4">
                                                    <p className="text-gray-400 text-sm italic">"{msg.result.preview}"</p>
                                                </div>

                                                {/* Actions */}
                                                <div className="p-4 pt-0 flex gap-2">
                                                    <button
                                                        onClick={() => setSelectedResult(msg.result!)}
                                                        className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <span>📖</span>
                                                        Leer
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedResult(msg.result!);
                                                            setShowVoicePlayer(true);
                                                        }}
                                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-canopy-600 to-canopy-500 hover:from-canopy-500 hover:to-canopy-400 text-white text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-canopy-500/20"
                                                    >
                                                        <span>🎙️</span>
                                                        Escuchar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Searching Animation */}
                        {isSearching && (
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-lg bg-canopy-500/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm animate-bounce">🔍</span>
                                </div>
                                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-sm">Buscando en el repositorio familiar</span>
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-canopy-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 rounded-full bg-canopy-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 rounded-full bg-canopy-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    {messages.length <= 1 && (
                        <div className="px-4 pb-2">
                            <div className="flex flex-wrap gap-2">
                                {quickQuestions.map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSearch(q)}
                                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-canopy-500/10 hover:border-canopy-500/30 hover:text-canopy-400 transition-all"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t border-white/5 bg-roots-950/50">
                        <form onSubmit={(e) => { e.preventDefault(); handleSearch(input); }} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Pregunta sobre tu familia..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-canopy-500/50 focus:bg-canopy-500/5"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isSearching}
                                className="w-12 h-12 rounded-xl bg-gradient-to-r from-canopy-600 to-canopy-500 hover:from-canopy-500 hover:to-canopy-400 disabled:from-gray-700 disabled:to-gray-700 text-white flex items-center justify-center transition-all disabled:text-gray-500 shadow-lg shadow-canopy-500/20 disabled:shadow-none"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Content Reader Modal */}
            {selectedResult && !showVoicePlayer && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedResult(null)}>
                    <div className="w-full max-w-lg bg-roots-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-legacy-900/30 to-roots-900">
                            <div className="flex items-start gap-4">
                                <img
                                    src={selectedResult.author.avatar}
                                    alt={selectedResult.author.name}
                                    className="w-14 h-14 rounded-2xl object-cover border-2 border-legacy-500/50"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{getTypeIcon(selectedResult.type)}</span>
                                        <span className="text-xs uppercase tracking-wider text-legacy-400 font-medium">
                                            {getTypeLabel(selectedResult.type)}
                                        </span>
                                    </div>
                                    <h3 className="text-xl text-white font-serif">{selectedResult.title}</h3>
                                    <p className="text-gray-500 text-sm">por {selectedResult.author.name}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedResult(null)}
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed whitespace-pre-line">
                                {selectedResult.content}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 flex gap-3">
                            <button
                                onClick={() => setSelectedResult(null)}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => setShowVoicePlayer(true)}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-canopy-600 to-canopy-500 text-white font-medium flex items-center justify-center gap-2"
                            >
                                <span>🎙️</span>
                                Escuchar con su voz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Player Modal */}
            {selectedResult && showVoicePlayer && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => { setShowVoicePlayer(false); setSelectedResult(null); }}>
                    <div className="w-full max-w-md bg-gradient-to-b from-roots-900 to-roots-950 rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>

                        {/* Voice Player */}
                        <div className="p-8 text-center">
                            {/* Animated Avatar */}
                            <div className="relative w-32 h-32 mx-auto mb-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-canopy-500 to-canopy-600 rounded-full blur-2xl opacity-40 animate-pulse" />
                                <div className="absolute inset-0 rounded-full border-4 border-canopy-500/50 animate-ping opacity-30" />
                                <img
                                    src={selectedResult.author.avatar}
                                    alt={selectedResult.author.name}
                                    className="relative w-full h-full rounded-full object-cover border-4 border-canopy-500 shadow-2xl shadow-canopy-500/30"
                                />
                                <div className="absolute bottom-0 right-0 w-10 h-10 bg-canopy-500 rounded-full flex items-center justify-center border-4 border-roots-900">
                                    <span className="text-lg">🎙️</span>
                                </div>
                            </div>

                            <h3 className="text-2xl text-white font-serif mb-1">{selectedResult.author.name}</h3>
                            <p className="text-gray-500 text-sm mb-6">te cuenta: "{selectedResult.title}"</p>

                            {/* Audio Visualizer Placeholder */}
                            <div className="flex items-center justify-center gap-1 h-16 mb-6">
                                {[...Array(30)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1.5 rounded-full bg-gradient-to-t from-canopy-600 to-canopy-400"
                                        style={{
                                            height: `${15 + Math.sin(i * 0.5 + Date.now() * 0.002) * 25}px`,
                                            animation: `pulse 1s ease-in-out ${i * 50}ms infinite`
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Play Controls */}
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <button className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 20L9 12l10-8v16z" />
                                    </svg>
                                </button>
                                <button className="w-16 h-16 rounded-full bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center text-white shadow-xl shadow-canopy-500/40 hover:scale-105 transition-transform">
                                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </button>
                                <button className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M5 4l10 8-10 8V4z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="px-4 mb-6">
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full w-1/3 bg-gradient-to-r from-canopy-500 to-canopy-400 rounded-full" />
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-gray-500">
                                    <span>1:24</span>
                                    <span>4:32</span>
                                </div>
                            </div>

                            {/* Info Banner */}
                            <div className="p-3 rounded-xl bg-canopy-500/10 border border-canopy-500/20">
                                <p className="text-canopy-400 text-xs">
                                    🔊 Reproduciendo con la voz clonada de {selectedResult.author.name}
                                </p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={() => { setShowVoicePlayer(false); setSelectedResult(null); }}
                                className="w-full py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingChatbot;
