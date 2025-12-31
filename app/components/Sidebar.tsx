import React, { useState } from 'react';
import { AppPage } from '../AppShell';

interface SidebarProps {
    currentPage: AppPage;
    onNavigate: (page: AppPage) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
    currentUser: {
        name: string;
        avatar: string;
    };
}

// Icons
const IconTree = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

const IconMic = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const IconBook = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const IconLightbulb = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const IconRecipe = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const IconCalendar = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const IconFamily = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const IconChevron = ({ direction, className = '' }: { direction: 'left' | 'right' | 'down' | 'up', className?: string }) => (
    <svg className={`w-4 h-4 transition-transform duration-200 ${direction === 'left' ? 'rotate-180' :
        direction === 'down' ? 'rotate-90' :
            direction === 'up' ? '-rotate-90' : ''
        } ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const IconHome = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const IconPlus = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const Sidebar: React.FC<SidebarProps> = ({
    currentPage,
    onNavigate,
    collapsed,
    onToggleCollapse,
    currentUser
}) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'mi-legado': true,
        'mi-familia': true
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const isActive = (page: AppPage) => currentPage === page;
    const isInSection = (section: string) => {
        if (section === 'mi-legado') {
            return ['mi-legado', 'crear-historia', 'crear-sabiduria', 'crear-receta', 'grabacion-diaria', 'cuentacuentos', 'mensajes-futuro'].includes(currentPage);
        }
        if (section === 'mi-familia') {
            return ['mi-familia', 'chat-familiar'].includes(currentPage);
        }
        return false;
    };

    return (
        <aside className={`fixed left-0 top-0 h-full bg-gradient-to-b from-roots-900 via-roots-900 to-roots-950 border-r border-white/5 transition-all duration-300 z-40 flex flex-col shadow-2xl ${collapsed ? 'w-20' : 'w-72'}`}>

            {/* Logo Header */}
            <div className="p-5 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="flex items-center gap-3 group">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center text-white shadow-lg shadow-canopy-500/25 group-hover:shadow-canopy-500/40 transition-all group-hover:scale-105">
                            <IconTree />
                        </div>
                        {!collapsed && (
                            <div>
                                <span className="font-serif text-xl text-white tracking-wide block">LIGNUM</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Family Intelligence</span>
                            </div>
                        )}
                    </a>
                    <button
                        onClick={onToggleCollapse}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all hover:scale-105"
                    >
                        <IconChevron direction={collapsed ? 'right' : 'left'} />
                    </button>
                </div>
            </div>

            {/* User Profile Card */}
            <div className={`p-4 mx-3 mt-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 ${collapsed ? 'mx-2 p-2' : ''}`}>
                <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
                    <div className="relative">
                        <img
                            src={currentUser.avatar}
                            alt={currentUser.name}
                            className="w-12 h-12 rounded-xl object-cover border-2 border-canopy-500/30 shadow-lg"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-canopy-500 rounded-full border-2 border-roots-900 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{currentUser.name}</p>
                            <p className="text-xs text-canopy-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-canopy-400 rounded-full" />
                                Creador activo
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 overflow-y-auto space-y-2 mt-2">

                {/* Voice Cloning - Standalone */}
                {!collapsed && (
                    <div className="px-2 py-1.5 mb-3">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Configuración</span>
                    </div>
                )}
                <button
                    onClick={() => onNavigate('voice-cloning')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive('voice-cloning')
                        ? 'bg-gradient-to-r from-canopy-600/20 to-canopy-500/10 text-canopy-400 border border-canopy-500/30 shadow-lg shadow-canopy-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        } ${collapsed ? 'justify-center px-2' : ''}`}
                    title={collapsed ? 'Clonar mi voz' : undefined}
                >
                    <div className={`p-2 rounded-lg ${isActive('voice-cloning') ? 'bg-canopy-500/20' : 'bg-white/5 group-hover:bg-white/10'} transition-colors`}>
                        <IconMic />
                    </div>
                    {!collapsed && (
                        <div className="text-left flex-1">
                            <p className="font-medium text-sm">Clonar Mi Voz</p>
                            <p className="text-[10px] opacity-60">Preserva tu voz única</p>
                        </div>
                    )}
                </button>

                {/* Divider */}
                {!collapsed && <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />}

                {/* Mi Legado Section */}
                {!collapsed && (
                    <div className="px-2 py-1.5">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Crear Contenido</span>
                    </div>
                )}

                <div className="space-y-1">
                    {/* Section Header */}
                    <button
                        onClick={() => collapsed ? onNavigate('mi-legado') : toggleSection('mi-legado')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isInSection('mi-legado')
                            ? 'bg-gradient-to-r from-legacy-600/20 to-legacy-500/10 text-legacy-400 border border-legacy-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            } ${collapsed ? 'justify-center px-2' : ''}`}
                        title={collapsed ? 'Mi Legado' : undefined}
                    >
                        <div className={`p-2 rounded-lg ${isInSection('mi-legado') ? 'bg-legacy-500/20' : 'bg-white/5 group-hover:bg-white/10'} transition-colors`}>
                            <IconBook />
                        </div>
                        {!collapsed && (
                            <>
                                <div className="text-left flex-1">
                                    <p className="font-medium text-sm">Mi Legado</p>
                                    <p className="text-[10px] opacity-60">Historias, sabiduría y más</p>
                                </div>
                                <IconChevron direction={expandedSections['mi-legado'] ? 'down' : 'right'} className="opacity-50" />
                            </>
                        )}
                    </button>

                    {/* Subcategories */}
                    {!collapsed && expandedSections['mi-legado'] && (
                        <div className="ml-4 pl-4 border-l border-white/10 space-y-1 py-1">
                            {[
                                { id: 'mi-legado', label: 'Dashboard', icon: '📊' },
                                { id: 'cuentacuentos', label: 'Cuentacuentos', icon: '✨', featured: true },
                                { id: 'crear-historia', label: 'Historias', icon: '📖' },
                                { id: 'crear-sabiduria', label: 'Sabiduría', icon: '💡' },
                                { id: 'crear-receta', label: 'Recetas & Habilidades', icon: '🍳' },
                                { id: 'grabacion-diaria', label: 'Grabación Diaria', icon: '🎙️' },
                                { id: 'mensajes-futuro', label: 'Mensajes a Futuro', icon: '📬' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id as AppPage)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive(item.id as AppPage)
                                        ? 'bg-legacy-500/15 text-legacy-300 font-medium'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Divider */}
                {!collapsed && <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />}

                {/* Mi Familia Section */}
                {!collapsed && (
                    <div className="px-2 py-1.5">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Conectar</span>
                    </div>
                )}

                <div className="space-y-1">
                    <button
                        onClick={() => collapsed ? onNavigate('mi-familia') : toggleSection('mi-familia')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isInSection('mi-familia')
                            ? 'bg-gradient-to-r from-canopy-600/20 to-canopy-500/10 text-canopy-400 border border-canopy-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            } ${collapsed ? 'justify-center px-2' : ''}`}
                        title={collapsed ? 'Mi Familia' : undefined}
                    >
                        <div className={`p-2 rounded-lg ${isInSection('mi-familia') ? 'bg-canopy-500/20' : 'bg-white/5 group-hover:bg-white/10'} transition-colors`}>
                            <IconFamily />
                        </div>
                        {!collapsed && (
                            <>
                                <div className="text-left flex-1">
                                    <p className="font-medium text-sm">Mi Familia</p>
                                    <p className="text-[10px] opacity-60">Red familiar conectada</p>
                                </div>
                                <IconChevron direction={expandedSections['mi-familia'] ? 'down' : 'right'} className="opacity-50" />
                            </>
                        )}
                    </button>

                    {/* Family Members Preview */}
                    {!collapsed && expandedSections['mi-familia'] && (
                        <div className="ml-4 pl-4 border-l border-white/10 space-y-1 py-1">
                            <button
                                onClick={() => onNavigate('mi-familia')}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive('mi-familia')
                                    ? 'bg-canopy-500/15 text-canopy-300 font-medium'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="text-base">🌳</span>
                                <span>Árbol Familiar</span>
                            </button>

                            {/* Quick Family Members */}
                            <div className="px-3 py-2">
                                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Familiares:</p>
                                <div className="flex -space-x-2">
                                    {[
                                        'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=40&h=40&fit=crop',
                                        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
                                        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop',
                                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
                                    ].map((avatar, idx) => (
                                        <img
                                            key={idx}
                                            src={avatar}
                                            alt="Family member"
                                            className="w-8 h-8 rounded-full border-2 border-roots-900 hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                                        />
                                    ))}
                                    <button className="w-8 h-8 rounded-full bg-white/10 border-2 border-roots-900 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-all">
                                        <IconPlus />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-white/5 space-y-2">
                {/* Stats */}
                {!collapsed && (
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 mb-2">
                        <div className="text-center">
                            <p className="text-lg font-bold text-canopy-400">12</p>
                            <p className="text-[9px] text-gray-600 uppercase">Historias</p>
                        </div>
                        <div className="text-center border-x border-white/5">
                            <p className="text-lg font-bold text-legacy-400">28</p>
                            <p className="text-[9px] text-gray-600 uppercase">Consejos</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-sap-400">15</p>
                            <p className="text-[9px] text-gray-600 uppercase">Recetas</p>
                        </div>
                    </div>
                )}

                {/* Settings */}
                <button
                    onClick={() => onNavigate('settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('settings')
                        ? 'bg-gradient-to-r from-white/10 to-white/5 text-white border border-white/10'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                        } ${collapsed ? 'justify-center px-2' : ''}`}
                    title={collapsed ? 'Configuración' : undefined}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {!collapsed && <span className="text-sm">Configuración</span>}
                </button>

                {/* Back to Landing */}
                <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all group ${collapsed ? 'justify-center px-2' : ''}`}
                >
                    <IconHome />
                    {!collapsed && <span className="text-sm">Volver al inicio</span>}
                </a>
            </div>
        </aside>
    );
};

export default Sidebar;
