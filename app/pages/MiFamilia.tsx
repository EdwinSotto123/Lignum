import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../AppShell';
import { auth, db } from '../../services/firebase';
import { collection, query, orderBy, where, getDocs } from 'firebase/firestore';

interface MiFamiliaProps {
    familyMembers: FamilyMember[];
    onSelectMember: (member: FamilyMember) => void;
    onNavigate?: (page: string, data?: any) => void;
}

interface LegacyItem {
    id: string;
    type: 'cuento' | 'receta' | 'sabiduria' | 'historia';
    title: string;
    preview: string;
    author: FamilyMember;
    date: string;
    likes: number;
    image?: string;
    fullData?: any;
}

const MiFamilia: React.FC<MiFamiliaProps> = ({ familyMembers, onSelectMember, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'familia' | 'repositorio'>('familia');
    const [filterType, setFilterType] = useState<'all' | 'cuento' | 'receta' | 'sabiduria' | 'historia'>('all');
    const [filterMember, setFilterMember] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [loadingRepository, setLoadingRepository] = useState(false);
    const [legacyItems, setLegacyItems] = useState<LegacyItem[]>([]);

    // Restore Mock Data for Demonstration
    const mockLegacyItems: LegacyItem[] = [
        {
            id: 'mock-1',
            type: 'cuento',
            title: 'El Secreto del Árbol Mágico',
            preview: 'Había una vez, en un pueblo muy lejano, un árbol tan grande que sus ramas tocaban las nubes...',
            author: familyMembers.find(m => m.relation === 'Abuelo') || familyMembers[0],
            date: 'Hace 2 días',
            likes: 12,
            image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=300&fit=crop',
            fullData: {
                id: 'mock-1',
                title: 'El Secreto del Árbol Mágico',
                category: 'cuento',
                rawTranscript: 'Había una vez un árbol mágico...',
                scenes: [
                    {
                        sceneNumber: 1,
                        narrationText: 'Había una vez, en un pueblo muy lejano, un árbol tan grande que sus ramas tocaban las nubes...',
                        visualPrompt: 'Big magical tree reaching clouds',
                        imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=300&fit=crop'
                    }
                ]
            }
        },
        {
            id: 'mock-2',
            type: 'receta',
            title: 'Ceviche de la Abuela Rosa',
            preview: 'El secreto está en el limón fresco y el ají limo. Nunca uses limón de botella...',
            author: familyMembers.find(m => m.relation === 'Abuela') || familyMembers[0],
            date: 'Hace 1 semana',
            likes: 28,
            image: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=400&h=300&fit=crop',
            fullData: {
                id: 'mock-2',
                title: 'Ceviche de la Abuela Rosa',
                type: 'cocina',
                category: 'Entrada',
                categoryEmoji: '🥗',
                items: ['Pescado fresco', 'Limón', 'Cebolla', 'Ají Limo'],
                steps: ['Cortar pescado', 'Exprimir limones', 'Mezclar con cebolla y ají'],
                description: 'El secreto está en el limón fresco y el ají limo. Nunca uses limón de botella...',
                difficulty: 'medium',
                time: '30 min'
            }
        },
        {
            id: 'mock-3',
            type: 'sabiduria',
            title: 'Sobre tomar decisiones difíciles',
            preview: 'Cuando tengas que elegir entre dos caminos, pregúntate: ¿Cuál me dará paz?...',
            author: familyMembers.find(m => m.relation === 'Abuela') || familyMembers[0],
            date: 'Hace 3 días',
            likes: 45,
            fullData: {
                id: 'mock-3',
                quote: 'Cuando tengas que elegir entre dos caminos, pregúntate: ¿Cuál me dará paz?',
                lesson: 'La paz es el mejor indicador de una decisión correcta.',
                tags: ['decisiones', 'vida', 'paz'],
                category: 'vida',
                categoryEmoji: '🌱'
            }
        },
        {
            id: 'mock-4',
            type: 'historia',
            title: 'El día que conocí a tu abuela',
            preview: 'Fue en la fiesta de San Juan, yo tenía 19 años. Ella llevaba un vestido azul con flores blancas...',
            author: familyMembers.find(m => m.relation === 'Abuelo') || familyMembers[0],
            date: 'Hace 5 días',
            likes: 34,
            image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&h=300&fit=crop',
            fullData: {
                id: 'mock-4',
                moodEmoji: '🥰',
                summary: 'El día que conocí a tu abuela en la fiesta de San Juan.',
                highlight: 'El día que conocí a tu abuela',
                tags: ['amor', 'recuerdo', 'familia'],
                date: 'Hace 5 días'
            }
        },
        {
            id: 'mock-5',
            type: 'receta',
            title: 'Arroz con Pollo Dominical',
            preview: 'El arroz verde que hacía los domingos. El secreto es licuar el cilantro con espinaca...',
            author: familyMembers.find(m => m.relation === 'Madre') || familyMembers[0],
            date: 'Hace 1 mes',
            likes: 56,
            image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop',
            fullData: { id: 'mock-5', type: 'cocina', title: 'Arroz con Pollo', categoryEmoji: '🍲', difficulty: 'hard' }
        },
        {
            id: 'mock-6',
            type: 'cuento',
            title: 'La Princesa del Río',
            preview: 'En las aguas cristalinas del río Amazonas, vivía una princesa que podía hablar con los peces...',
            author: familyMembers.find(m => m.relation === 'Madre') || familyMembers[0],
            date: 'Hace 2 semanas',
            likes: 18,
            image: 'https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=400&h=300&fit=crop',
            fullData: { id: 'mock-6', title: 'La Princesa del Río', category: 'cuento' }
        }
    ];

    const handleItemClick = (item: LegacyItem) => {
        if (!onNavigate) return;

        console.log("Navigating to item:", item.title, item.type);

        switch (item.type) {
            case 'cuento':
                onNavigate('cuentacuentos', item.fullData || {
                    id: item.id,
                    title: item.title,
                    rawTranscript: item.preview,
                    scenes: item.image ? [{ imageUrl: item.image, narrationText: item.preview }] : []
                });
                break;
            case 'receta':
                onNavigate('crear-receta', item.fullData || {
                    id: item.id,
                    title: item.title,
                    description: item.preview,
                    type: 'cocina',
                    categoryEmoji: '🍳',
                    category: 'Receta',
                    items: [],
                    steps: [item.preview],
                    difficulty: 'medium',
                    time: '??'
                });
                break;
            case 'sabiduria':
                onNavigate('crear-sabiduria', item.fullData || {
                    id: item.id,
                    quote: item.title,
                    lesson: item.preview,
                    tags: [],
                    categoryEmoji: '💡'
                });
                break;
            case 'historia':
                onNavigate('grabacion-diaria', item.fullData || {
                    id: item.id,
                    summary: item.preview,
                    highlight: item.title,
                    moodEmoji: '📅',
                    tags: [],
                    date: item.date
                });
                break;
        }
    };

    useEffect(() => {
        let unsubscribe: () => void;

        const initFetch = async (user: any) => {
            if (!user) {
                console.log("🔒 [MiFamilia] No user logged in. Showing mock data only.");
                setLegacyItems(mockLegacyItems);
                return;
            }

            console.log("🔄 [MiFamilia] Fetching repository data for user:", user.uid);
            setLoadingRepository(true);

            try {
                const userId = user.uid;
                const items: LegacyItem[] = [];
                const currentUserAuthor: FamilyMember = {
                    id: user.uid, // Use actual UID for filtering
                    name: user.displayName || 'Tú',
                    relation: 'Creador',
                    avatar: user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
                    isVoiceCloned: true,
                    storiesCount: 0,
                    recipesCount: 0,
                    wisdomCount: 0
                };

                // 1. Fetch Stories
                try {
                    // Use ROOT collection query
                    const storiesRef = collection(db, 'stories');
                    console.log(`📂 [MiFamilia] Querying stories at: stories (where userId == ${userId})`);
                    // Note: If this fails with "requires an index", remove orderBy or create index
                    // Removing orderBy for now to ensure data fetching first
                    const q = query(storiesRef, where('userId', '==', userId));
                    const storiesSnapshot = await getDocs(q);
                    console.log(`✅ [MiFamilia] Found ${storiesSnapshot.size} stories`);

                    storiesSnapshot.forEach(doc => {
                        const data = doc.data();
                        console.log("  - Story:", data.title);
                        items.push({
                            id: doc.id,
                            type: 'cuento',
                            title: data.title || 'Cuento sin título',
                            preview: data.organizedStory?.substring(0, 150) + '...' || 'Sin vista previa',
                            author: currentUserAuthor,
                            date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Reciente',
                            likes: Math.floor(Math.random() * 20) + 1,
                            image: data.scenes?.[0]?.imageUrl || data.characterImageUrl || undefined,
                            fullData: { id: doc.id, ...data }
                        });
                    });
                } catch (e) {
                    console.error("❌ [MiFamilia] Error fetching stories:", e);
                }

                // 2. Fetch Recipes
                try {
                    const recipesRef = collection(db, 'recipes');
                    console.log(`📂 [MiFamilia] Querying recipes at: recipes (where userId == ${userId})`);
                    const q = query(recipesRef, where('userId', '==', userId));
                    const recipesSnapshot = await getDocs(q);
                    console.log(`✅ [MiFamilia] Found ${recipesSnapshot.size} recipes`);

                    recipesSnapshot.forEach(doc => {
                        const data = doc.data();
                        items.push({
                            id: doc.id,
                            type: 'receta',
                            title: data.title || 'Receta sin título',
                            preview: data.description?.substring(0, 150) + '...' || 'Sin descripción',
                            author: currentUserAuthor,
                            date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Reciente',
                            likes: Math.floor(Math.random() * 20) + 1,
                            fullData: { id: doc.id, ...data }
                        });
                    });
                } catch (e) {
                    console.error("❌ [MiFamilia] Error fetching recipes:", e);
                }

                // 3. Fetch Wisdom
                try {
                    const wisdomRef = collection(db, 'wisdom');
                    console.log(`📂 [MiFamilia] Querying wisdom at: wisdom (where userId == ${userId})`);
                    const q = query(wisdomRef, where('userId', '==', userId));
                    const wisdomSnapshot = await getDocs(q);
                    console.log(`✅ [MiFamilia] Found ${wisdomSnapshot.size} wisdom entries`);

                    wisdomSnapshot.forEach(doc => {
                        const data = doc.data();
                        items.push({
                            id: doc.id,
                            type: 'sabiduria',
                            title: data.topic || 'Sabiduría compartida',
                            preview: data.scenarios?.join(' ')?.substring(0, 150) + '...' || 'Sin contenido',
                            author: currentUserAuthor,
                            date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Reciente',
                            likes: Math.floor(Math.random() * 20) + 1,
                            fullData: { id: doc.id, ...data }
                        });
                    });
                } catch (e) {
                    console.error("❌ [MiFamilia] Error fetching wisdom:", e);
                }

                // 4. Fetch Daily Reflections
                try {
                    const dailyRef = collection(db, 'daily_reflections');
                    console.log(`📂 [MiFamilia] Querying daily reflections at: daily_reflections (where userId == ${userId})`);
                    const q = query(dailyRef, where('userId', '==', userId));
                    const dailySnapshot = await getDocs(q);
                    console.log(`✅ [MiFamilia] Found ${dailySnapshot.size} daily reflections`);

                    dailySnapshot.forEach(doc => {
                        const data = doc.data();
                        items.push({
                            id: doc.id,
                            type: 'historia',
                            title: data.highlight || 'Historia del día',
                            preview: data.summary || 'Sin resumen',
                            author: currentUserAuthor,
                            date: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'Reciente',
                            likes: Math.floor(Math.random() * 20) + 1,
                            fullData: { id: doc.id, ...data }
                        });
                    });
                } catch (e) {
                    console.error("❌ [MiFamilia] Error fetching daily reflections:", e);
                }

                console.log("🏁 [MiFamilia] Total real items loaded:", items.length);

                // Combine Mock + Real items
                setLegacyItems([...items, ...mockLegacyItems]);

            } catch (error) {
                console.error("❌ [MiFamilia] Critical error in fetchRepositoryData:", error);
                setLegacyItems(mockLegacyItems);
            } finally {
                setLoadingRepository(false);
            }
        };

        // Listen for auth state changes to ensure we have the user
        unsubscribe = auth.onAuthStateChanged((user) => {
            if (activeTab === 'repositorio') {
                initFetch(user);
            }
        });

        // Trigger immediately if already logged in (for tab switches)
        if (activeTab === 'repositorio' && auth.currentUser) {
            initFetch(auth.currentUser);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        }
    }, [activeTab]);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'cuento': return '📖';
            case 'receta': return '🍳';
            case 'sabiduria': return '💡';
            case 'historia': return '📜';
            default: return '📄';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'cuento': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'receta': return 'bg-sap-500/20 text-sap-400 border-sap-500/30';
            case 'sabiduria': return 'bg-legacy-500/20 text-legacy-400 border-legacy-500/30';
            case 'historia': return 'bg-canopy-500/20 text-canopy-400 border-canopy-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    // Extract unique authors from the items actually displayed for the filter
    const availableAuthorsMap = new Map<string, FamilyMember>();

    // Always add current user if logged in, even if they have no items yet
    if (auth.currentUser) {
        availableAuthorsMap.set(auth.currentUser.uid, {
            id: auth.currentUser.uid,
            name: 'Tú',
            relation: 'Creador',
            avatar: auth.currentUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
            isVoiceCloned: true,
            storiesCount: 0,
            recipesCount: 0,
            wisdomCount: 0
        });
    }

    legacyItems.forEach(item => {
        if (!availableAuthorsMap.has(item.author.id)) {
            availableAuthorsMap.set(item.author.id, item.author);
        }
    });

    const availableAuthors = Array.from(availableAuthorsMap.values());

    // Apply all filters
    const filteredItems = legacyItems.filter(item => {
        // Type filter
        if (filterType !== 'all' && item.type !== filterType) return false;
        // Member filter
        if (filterMember !== 'all' && item.author.id !== filterMember) return false;
        // Search filter
        if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !item.preview.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950">
            {/* Decorative Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-canopy-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-legacy-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 p-8 max-w-6xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center text-2xl shadow-lg shadow-canopy-500/25">
                                👨‍👩‍👧‍👦
                            </div>
                            <div>
                                <h1 className="text-4xl font-serif text-white">Mi Familia</h1>
                                <p className="text-gray-500">Conecta con la sabiduría de tus seres queridos</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 mb-8 w-fit">
                    <button
                        onClick={() => setActiveTab('familia')}
                        className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'familia'
                            ? 'bg-canopy-500 text-white shadow-lg shadow-canopy-500/30'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        👨‍👩‍👧 Árbol Familiar
                    </button>
                    <button
                        onClick={() => setActiveTab('repositorio')}
                        className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'repositorio'
                            ? 'bg-legacy-500 text-roots-950 shadow-lg shadow-legacy-500/30'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        📚 Repositorio Familiar
                    </button>
                </div>

                {/* Tab: Familia */}
                {activeTab === 'familia' && (
                    <div className="animate-fade-in">
                        {/* Family Tree Visual */}
                        <div className="mb-10 p-8 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 overflow-hidden relative">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-canopy-500/5 via-transparent to-legacy-500/5" />

                            <div className="relative">
                                <div className="text-center mb-8">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-gray-400 text-xs uppercase tracking-widest border border-white/10">
                                        <span className="w-1.5 h-1.5 bg-canopy-400 rounded-full animate-pulse" />
                                        Tu Árbol Familiar
                                    </span>
                                </div>

                                {/* Tree Visualization */}
                                <div className="flex flex-col items-center">
                                    {/* Grandparents Row */}
                                    <div className="flex justify-center gap-20 mb-6">
                                        {familyMembers.filter(m => m.relation === 'Abuela' || m.relation === 'Abuelo').map((member) => (
                                            <FamilyTreeNode key={member.id} member={member} onSelect={onSelectMember} size="large" />
                                        ))}
                                    </div>

                                    {/* Connector Lines */}
                                    <div className="relative w-32 h-8">
                                        <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-white/20 to-white/5" />
                                        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                    </div>

                                    {/* Parents Row */}
                                    <div className="flex justify-center gap-12 mb-6">
                                        {familyMembers.filter(m => m.relation === 'Madre' || m.relation === 'Padre').map((member) => (
                                            <FamilyTreeNode key={member.id} member={member} onSelect={onSelectMember} size="medium" />
                                        ))}
                                    </div>

                                    {/* Connector to You */}
                                    <div className="w-px h-8 bg-gradient-to-b from-white/20 to-white/5" />

                                    {/* You */}
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-canopy-500 to-canopy-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center text-white font-bold text-lg border-4 border-roots-800 shadow-xl shadow-canopy-500/30">
                                            TÚ
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Family Members Grid */}
                        <div className="mb-8">
                            <h2 className="text-lg font-medium text-white mb-5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-canopy-400" />
                                Habla con Tu Familia
                            </h2>
                            <div className="grid md:grid-cols-2 gap-5">
                                {familyMembers.map((member) => (
                                    <FamilyMemberCard key={member.id} member={member} onSelect={onSelectMember} />
                                ))}
                            </div>
                        </div>

                        {/* Add Family Member */}
                        <button className="w-full p-8 rounded-2xl border-2 border-dashed border-white/10 hover:border-canopy-500/50 text-gray-500 hover:text-canopy-400 transition-all flex items-center justify-center gap-3 group hover:bg-white/[0.02]">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-canopy-500/20 transition-colors flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <span className="font-medium block">Agregar Familiar</span>
                                <span className="text-xs opacity-60">Invita a alguien a preservar su legado</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* Tab: Repositorio */}
                {activeTab === 'repositorio' && (
                    <div className="animate-fade-in">
                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            {[
                                { icon: '📖', label: 'Cuentos', count: legacyItems.filter(i => i.type === 'cuento').length, color: 'purple' },
                                { icon: '🍳', label: 'Recetas', count: legacyItems.filter(i => i.type === 'receta').length, color: 'sap' },
                                { icon: '💡', label: 'Sabiduría', count: legacyItems.filter(i => i.type === 'sabiduria').length, color: 'legacy' },
                                { icon: '📜', label: 'Historias', count: legacyItems.filter(i => i.type === 'historia').length, color: 'canopy' }
                            ].map((stat, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                                    <span className="text-2xl block mb-2">{stat.icon}</span>
                                    <p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.count}</p>
                                    <p className="text-gray-500 text-sm">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Search and Filters */}
                        <div className="mb-6 space-y-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar en el repositorio..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-canopy-500/50"
                                />
                            </div>

                            {/* Filter Row */}
                            <div className="flex flex-wrap gap-3">
                                {/* Type Filters */}
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {[
                                        { id: 'all', label: 'Todo', icon: '📚' },
                                        { id: 'cuento', label: 'Cuentos', icon: '📖' },
                                        { id: 'receta', label: 'Recetas', icon: '🍳' },
                                        { id: 'sabiduria', label: 'Sabiduría', icon: '💡' },
                                        { id: 'historia', label: 'Historias', icon: '📜' }
                                    ].map((filter) => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setFilterType(filter.id as any)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterType === filter.id
                                                ? 'bg-canopy-500 text-white'
                                                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                                }`}
                                        >
                                            {filter.icon} {filter.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Spacer */}
                                <div className="flex-1" />

                                {/* Family Member Filter (Dynamic based on available authors) */}
                                <select
                                    value={filterMember}
                                    onChange={(e) => setFilterMember(e.target.value)}
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-canopy-500/50 cursor-pointer"
                                >
                                    <option value="all">👤 Todos</option>
                                    {availableAuthors.map((author) => (
                                        <option key={author.id} value={author.id}>
                                            {author.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Date Filter */}
                                <select
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value as any)}
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-canopy-500/50 cursor-pointer"
                                >
                                    <option value="all">📅 Cualquier fecha</option>
                                    <option value="today">Hoy</option>
                                    <option value="week">Esta semana</option>
                                    <option value="month">Este mes</option>
                                    <option value="year">Este año</option>
                                </select>
                            </div>

                            {/* Active Filters Summary */}
                            {(filterType !== 'all' || filterMember !== 'all' || searchQuery) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-gray-500 text-xs">Filtros activos:</span>
                                    {filterType !== 'all' && (
                                        <span className="px-2 py-1 rounded-lg bg-canopy-500/20 text-canopy-400 text-xs flex items-center gap-1">
                                            {filterType}
                                            <button onClick={() => setFilterType('all')} className="hover:text-white">×</button>
                                        </span>
                                    )}
                                    {filterMember !== 'all' && (
                                        <span className="px-2 py-1 rounded-lg bg-legacy-500/20 text-legacy-400 text-xs flex items-center gap-1">
                                            {availableAuthors.find(m => m.id === filterMember)?.name || 'Miembro'}
                                            <button onClick={() => setFilterMember('all')} className="hover:text-white">×</button>
                                        </span>
                                    )}
                                    {searchQuery && (
                                        <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1">
                                            "{searchQuery}"
                                            <button onClick={() => setSearchQuery('')} className="hover:text-white">×</button>
                                        </span>
                                    )}
                                    <button
                                        onClick={() => { setFilterType('all'); setFilterMember('all'); setSearchQuery(''); }}
                                        className="text-gray-500 hover:text-white text-xs underline"
                                    >
                                        Limpiar todo
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Legacy Items Grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className="group rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 overflow-hidden hover:border-canopy-500/30 transition-all hover:scale-[1.02] cursor-pointer"
                                >
                                    {/* Image */}
                                    {item.image && (
                                        <div className="aspect-video overflow-hidden">
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="p-5">
                                        {/* Type Badge */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider font-medium border ${getTypeColor(item.type)}`}>
                                                {getTypeIcon(item.type)} {item.type}
                                            </span>
                                            <span className="text-gray-600 text-xs">{item.date}</span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg text-white font-medium mb-2 line-clamp-1">{item.title}</h3>

                                        {/* Preview */}
                                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">{item.preview}</p>

                                        {/* Author & Likes */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={item.author.avatar}
                                                    alt={item.author.name}
                                                    className="w-6 h-6 rounded-full object-cover"
                                                />
                                                <span className="text-gray-500 text-xs">{item.author.name.split(' ')[0]}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                                                <span>❤️</span>
                                                <span>{item.likes}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="px-5 pb-5 pt-0 flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                            className="flex-1 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                                        >
                                            📖 Leer
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                            className="flex-1 py-2 rounded-lg bg-canopy-500/20 text-canopy-400 text-sm hover:bg-canopy-500/30 transition-colors"
                                        >
                                            🎙️ Escuchar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div >
    );
};

// Family Tree Node Component
const FamilyTreeNode: React.FC<{
    member: FamilyMember;
    onSelect: (member: FamilyMember) => void;
    size: 'large' | 'medium';
}> = ({ member, onSelect, size }) => {
    const sizeClasses = size === 'large' ? 'w-24 h-24' : 'w-20 h-20';
    const ringSize = size === 'large' ? 'p-1' : 'p-0.5';

    return (
        <button
            onClick={() => onSelect(member)}
            className="flex flex-col items-center group"
        >
            <div className="relative">
                {/* Glow */}
                <div className={`absolute inset-0 ${member.isVoiceCloned ? 'bg-canopy-500' : 'bg-gray-500'} rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity`} />

                {/* Ring */}
                <div className={`relative ${sizeClasses} rounded-full ${ringSize} ${member.isVoiceCloned
                    ? 'bg-gradient-to-br from-canopy-400 to-canopy-600'
                    : 'bg-gradient-to-br from-gray-500 to-gray-600'
                    } group-hover:scale-110 transition-transform shadow-xl`}>
                    <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full rounded-full object-cover border-2 border-roots-900"
                    />
                </div>

                {/* Voice Cloned Badge */}
                {member.isVoiceCloned && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-canopy-500 rounded-full flex items-center justify-center border-3 border-roots-900 shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                )}
            </div>
            <p className="text-white text-sm mt-3 font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                {member.name.split(' ')[0]}
            </p>
            <p className="text-gray-500 text-xs">{member.relation}</p>
        </button>
    );
};

// Family Member Card Component
const FamilyMemberCard: React.FC<{
    member: FamilyMember;
    onSelect: (member: FamilyMember) => void;
}> = ({ member, onSelect }) => {
    return (
        <button
            onClick={() => onSelect(member)}
            className="group p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-canopy-500/30 transition-all text-left hover:scale-[1.02] hover:shadow-xl hover:shadow-canopy-500/5 overflow-hidden relative"
        >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-canopy-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative flex items-start gap-4">
                <div className="relative flex-shrink-0">
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 ${member.isVoiceCloned ? 'border-canopy-500/50' : 'border-gray-600'
                        } group-hover:scale-105 transition-transform shadow-lg`}>
                        <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {member.isVoiceCloned && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-canopy-500 rounded-lg flex items-center justify-center border-2 border-roots-800 shadow">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg text-white font-medium truncate">{member.name}</h3>
                        {member.isVoiceCloned && (
                            <span className="px-2 py-0.5 rounded-full bg-canopy-500/20 text-canopy-400 text-xs uppercase tracking-wider">
                                Voz activa
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500 text-sm mb-3">{member.relation}</p>

                    {/* Stats */}
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">📖</span>
                            <span className="text-canopy-400 text-sm font-medium">{member.storiesCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">💡</span>
                            <span className="text-legacy-400 text-sm font-medium">{member.wisdomCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">🍳</span>
                            <span className="text-sap-400 text-sm font-medium">{member.recipesCount}</span>
                        </div>
                    </div>
                </div>

                {/* Chat Button */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 group-hover:bg-canopy-500/20 flex items-center justify-center text-gray-500 group-hover:text-canopy-400 transition-all group-hover:scale-110">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
            </div>
        </button>
    );
};

export default MiFamilia;
