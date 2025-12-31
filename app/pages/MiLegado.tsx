import React from 'react';
import { AppPage } from '../AppShell';

interface MiLegadoProps {
    onNavigate: (page: AppPage) => void;
}

const MiLegado: React.FC<MiLegadoProps> = ({ onNavigate }) => {
    const tools = [
        {
            id: 'cuentacuentos',
            title: 'Cuentacuentos',
            description: 'Narra un cuento y la IA lo transforma en un libro ilustrado interactivo',
            icon: '✨',
            gradient: 'from-pink-600 to-purple-500',
            bgGlow: 'bg-pink-500/20',
            borderColor: 'border-pink-500/30 hover:border-pink-400',
            count: 3,
            lastActivity: 'Hace 1 día',
            featured: true
        },
        {
            id: 'crear-historia',
            title: 'Historias',
            description: 'Crea y narra historias de tu vida para las futuras generaciones',
            icon: '📖',
            gradient: 'from-canopy-600 to-canopy-500',
            bgGlow: 'bg-canopy-500/20',
            borderColor: 'border-canopy-500/30 hover:border-canopy-400',
            count: 12,
            lastActivity: 'Hace 2 horas'
        },
        {
            id: 'crear-sabiduria',
            title: 'Sabiduría',
            description: 'Comparte consejos, lecciones de vida y reflexiones importantes',
            icon: '💡',
            gradient: 'from-legacy-500 to-legacy-400',
            bgGlow: 'bg-legacy-500/20',
            borderColor: 'border-legacy-500/30 hover:border-legacy-400',
            count: 28,
            lastActivity: 'Ayer'
        },
        {
            id: 'crear-receta',
            title: 'Recetas y Habilidades',
            description: 'Preserva recetas de familia, trucos y conocimientos prácticos',
            icon: '🍳',
            gradient: 'from-sap-500 to-sap-400',
            bgGlow: 'bg-sap-500/20',
            borderColor: 'border-sap-500/30 hover:border-sap-400',
            count: 15,
            lastActivity: 'Hace 3 días'
        },
        {
            id: 'grabacion-diaria',
            title: 'Grabación Diaria',
            description: 'Captura reflexiones diarias y momentos de sabiduría espontánea',
            icon: '🎙️',
            gradient: 'from-purple-600 to-purple-500',
            bgGlow: 'bg-purple-500/20',
            borderColor: 'border-purple-500/30 hover:border-purple-400',
            count: 45,
            lastActivity: 'Hoy'
        }
    ];

    const recentActivity = [
        { type: 'historia', title: 'El día que conocí a tu abuela', time: 'Hace 2 horas', icon: '📖' },
        { type: 'sabiduria', title: 'Sobre tomar decisiones difíciles', time: 'Ayer', icon: '💡' },
        { type: 'receta', title: 'Arroz con pollo de la familia', time: 'Hace 3 días', icon: '🍳' },
        { type: 'grabacion', title: 'Reflexión del martes', time: 'Hace 1 semana', icon: '🎙️' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950">
            {/* Decorative Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-canopy-500/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-legacy-500/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 p-8 max-w-6xl mx-auto">

                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-legacy-500 to-legacy-600 flex items-center justify-center text-2xl shadow-lg shadow-legacy-500/25">
                            🌿
                        </div>
                        <div>
                            <h1 className="text-4xl font-serif text-white">Mi Legado</h1>
                            <p className="text-gray-500">Tu conocimiento preservado para siempre</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Historias', value: 12, trend: '+2 este mes', color: 'canopy', icon: '📖' },
                        { label: 'Consejos', value: 28, trend: '+5 este mes', color: 'legacy', icon: '💡' },
                        { label: 'Recetas', value: 15, trend: '+1 este mes', color: 'sap', icon: '🍳' },
                        { label: 'Grabaciones', value: 45, trend: '🔥 7 días seguidos', color: 'purple', icon: '🎙️' }
                    ].map((stat, idx) => (
                        <div
                            key={idx}
                            className="group relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] cursor-pointer overflow-hidden"
                        >
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${stat.color === 'canopy' ? 'from-canopy-500/10 to-transparent' :
                                stat.color === 'legacy' ? 'from-legacy-500/10 to-transparent' :
                                    stat.color === 'sap' ? 'from-sap-500/10 to-transparent' :
                                        'from-purple-500/10 to-transparent'
                                }`} />
                            <div className="relative">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-2xl">{stat.icon}</span>
                                    <span className={`text-3xl font-bold ${stat.color === 'canopy' ? 'text-canopy-400' :
                                        stat.color === 'legacy' ? 'text-legacy-400' :
                                            stat.color === 'sap' ? 'text-sap-400' :
                                                'text-purple-400'
                                        }`}>
                                        {stat.value}
                                    </span>
                                </div>
                                <p className="text-white font-medium text-sm">{stat.label}</p>
                                <p className="text-gray-500 text-xs mt-1">{stat.trend}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Action Banner */}
                <div className="mb-10 p-6 rounded-3xl bg-gradient-to-r from-canopy-600/20 via-canopy-500/10 to-transparent border border-canopy-500/20 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-canopy-500/10 rounded-full blur-3xl" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <h3 className="text-xl text-white font-medium mb-1">¿Listo para grabar tu reflexión de hoy?</h3>
                            <p className="text-gray-400 text-sm">Llevas 7 días seguidos. ¡No rompas la racha!</p>
                        </div>
                        <button
                            onClick={() => onNavigate('grabacion-diaria')}
                            className="px-6 py-3 rounded-xl bg-canopy-600 hover:bg-canopy-500 text-white font-medium transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-canopy-600/30"
                        >
                            <span>🎙️</span>
                            Grabar Ahora
                        </button>
                    </div>
                </div>

                {/* Tools Grid */}
                <div className="mb-10">
                    <h2 className="text-lg font-medium text-white mb-5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-canopy-400" />
                        Herramientas de Creación
                    </h2>
                    <div className="grid md:grid-cols-2 gap-5">
                        {tools.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => onNavigate(tool.id as AppPage)}
                                className={`group relative p-6 rounded-2xl border ${tool.borderColor} bg-gradient-to-br from-white/[0.05] to-transparent transition-all duration-300 text-left hover:scale-[1.02] hover:shadow-xl overflow-hidden`}
                            >
                                {/* Glow Effect */}
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${tool.bgGlow} blur-3xl`} />

                                <div className="relative">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                                            {tool.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-lg font-medium text-white">{tool.title}</h3>
                                                <span className="text-sm text-gray-500">{tool.count} creados</span>
                                            </div>
                                            <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                                            <p className="text-gray-600 text-xs mt-2">Última actividad: {tool.lastActivity}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-end gap-2 text-gray-500 group-hover:text-white transition-colors">
                                        <span className="text-sm font-medium">Crear nuevo</span>
                                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div>
                    <h2 className="text-lg font-medium text-white mb-5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-legacy-400" />
                        Actividad Reciente
                    </h2>
                    <div className="bg-gradient-to-br from-white/[0.05] to-transparent rounded-2xl border border-white/10 overflow-hidden">
                        {recentActivity.map((item, idx) => (
                            <div
                                key={idx}
                                className={`flex items-center gap-4 p-5 hover:bg-white/5 transition-colors cursor-pointer ${idx !== recentActivity.length - 1 ? 'border-b border-white/5' : ''
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{item.title}</p>
                                    <p className="text-gray-500 text-xs">{item.time}</p>
                                </div>
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MiLegado;
