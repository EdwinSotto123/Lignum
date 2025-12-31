import React, { useState } from 'react';

interface SettingsProps {
    onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
    const [activeSection, setActiveSection] = useState('profile');
    const [profile, setProfile] = useState({
        name: 'Juan García',
        email: 'juan.garcia@email.com',
        role: 'Creador'
    });
    const [notifications, setNotifications] = useState({
        dailyReminder: true,
        familyActivity: true,
        newMessages: true,
        weeklyDigest: false
    });
    const [privacy, setPrivacy] = useState({
        shareWithFamily: true,
        allowVoiceClone: true,
        publicProfile: false
    });

    const sections = [
        { id: 'profile', label: 'Mi Perfil', icon: '👤' },
        { id: 'voice', label: 'Mi Voz', icon: '🎙️' },
        { id: 'family', label: 'Familia', icon: '👨‍👩‍👧‍👦' },
        { id: 'notifications', label: 'Notificaciones', icon: '🔔' },
        { id: 'privacy', label: 'Privacidad', icon: '🔒' },
        { id: 'api', label: 'API & Conexiones', icon: '🔗' },
        { id: 'help', label: 'Ayuda', icon: '❓' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-canopy-500/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 p-8 max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-10">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-4xl font-serif text-white">Configuración</h1>
                        <p className="text-gray-500">Personaliza tu experiencia en LIGNUM</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[280px_1fr] gap-8">

                    {/* Sidebar Navigation */}
                    <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] rounded-2xl border border-white/10 p-4 h-fit">
                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeSection === section.id
                                            ? 'bg-canopy-500/20 text-canopy-400 border border-canopy-500/30'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-lg">{section.icon}</span>
                                    <span className="font-medium text-sm">{section.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] rounded-2xl border border-white/10 p-8">

                        {/* Profile Section */}
                        {activeSection === 'profile' && (
                            <div className="animate-fade-in">
                                <h2 className="text-2xl font-medium text-white mb-6">Mi Perfil</h2>

                                {/* Avatar */}
                                <div className="flex items-center gap-6 mb-8 p-6 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="relative">
                                        <img
                                            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"
                                            alt="Avatar"
                                            className="w-24 h-24 rounded-2xl object-cover border-2 border-canopy-500/50"
                                        />
                                        <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-canopy-500 text-white flex items-center justify-center hover:bg-canopy-400 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className="text-white text-lg font-medium">{profile.name}</h3>
                                        <p className="text-gray-500 text-sm">{profile.email}</p>
                                        <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-canopy-500/20 text-canopy-400 text-xs">
                                            <span className="w-1.5 h-1.5 bg-canopy-400 rounded-full" />
                                            {profile.role}
                                        </span>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-2">Nombre completo</label>
                                        <input
                                            type="text"
                                            value={profile.name}
                                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-canopy-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-2">Correo electrónico</label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-canopy-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-2">Rol en la familia</label>
                                        <select
                                            value={profile.role}
                                            onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-canopy-500/50"
                                        >
                                            <option value="Creador">Creador</option>
                                            <option value="Padre/Madre">Padre/Madre</option>
                                            <option value="Abuelo/a">Abuelo/a</option>
                                            <option value="Hijo/a">Hijo/a</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                </div>

                                <button className="mt-8 px-6 py-3 rounded-xl bg-canopy-600 hover:bg-canopy-500 text-white font-medium transition-colors">
                                    Guardar Cambios
                                </button>
                            </div>
                        )}

                        {/* Voice Section */}
                        {activeSection === 'voice' && (
                            <div className="animate-fade-in">
                                <h2 className="text-2xl font-medium text-white mb-6">Mi Voz</h2>

                                {/* Voice Status */}
                                <div className="p-6 rounded-xl bg-gradient-to-br from-canopy-500/10 to-canopy-600/5 border border-canopy-500/20 mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-canopy-500/20 flex items-center justify-center text-2xl">
                                                🎙️
                                            </div>
                                            <div>
                                                <h3 className="text-white font-medium">Voz Clonada</h3>
                                                <p className="text-canopy-400 text-sm">Activa y funcionando</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-canopy-500/20 text-canopy-400 text-xs font-medium">
                                            ✓ Verificada
                                        </span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-sm">
                                            🔊 Escuchar muestra
                                        </button>
                                        <button className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-sm">
                                            🔄 Re-grabar voz
                                        </button>
                                    </div>
                                </div>

                                {/* Voice Settings */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-medium">Configuración de voz</h3>
                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white">Velocidad de habla</p>
                                                <p className="text-gray-500 text-sm">Ajusta qué tan rápido habla tu voz clonada</p>
                                            </div>
                                            <input type="range" min="0.5" max="1.5" step="0.1" defaultValue="1" className="w-32" />
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white">Tono emocional</p>
                                                <p className="text-gray-500 text-sm">Cálido, neutral, o expresivo</p>
                                            </div>
                                            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                                                <option>Cálido</option>
                                                <option>Neutral</option>
                                                <option>Expresivo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Family Section */}
                        {activeSection === 'family' && (
                            <div className="animate-fade-in">
                                <h2 className="text-2xl font-medium text-white mb-6">Familia</h2>

                                {/* Family Members */}
                                <div className="space-y-3 mb-8">
                                    {[
                                        { name: 'Abuela Rosa', role: 'Abuela', status: 'active' },
                                        { name: 'Abuelo Carlos', role: 'Abuelo', status: 'active' },
                                        { name: 'Mamá Elena', role: 'Madre', status: 'pending' },
                                        { name: 'Papá Miguel', role: 'Padre', status: 'active' },
                                    ].map((member, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-canopy-500/20 flex items-center justify-center text-lg">
                                                    👤
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{member.name}</p>
                                                    <p className="text-gray-500 text-sm">{member.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${member.status === 'active'
                                                        ? 'bg-canopy-500/20 text-canopy-400'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {member.status === 'active' ? 'Activo' : 'Pendiente'}
                                                </span>
                                                <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button className="w-full p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-canopy-500/50 text-gray-400 hover:text-canopy-400 transition-all flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Invitar familiar
                                </button>
                            </div>
                        )}

                        {/* Notifications Section */}
                        {activeSection === 'notifications' && (
                            <div className="animate-fade-in">
                                <h2 className="text-2xl font-medium text-white mb-6">Notificaciones</h2>

                                <div className="space-y-4">
                                    {[
                                        { key: 'dailyReminder', label: 'Recordatorio diario', desc: 'Recibe un recordatorio para tu grabación diaria' },
                                        { key: 'familyActivity', label: 'Actividad familiar', desc: 'Cuando alguien de tu familia crea nuevo contenido' },
                                        { key: 'newMessages', label: 'Nuevos mensajes', desc: 'Cuando alguien te envía un mensaje' },
                                        { key: 'weeklyDigest', label: 'Resumen semanal', desc: 'Un resumen de la actividad de tu familia' },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div>
                                                <p className="text-white font-medium">{item.label}</p>
                                                <p className="text-gray-500 text-sm">{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${notifications[item.key as keyof typeof notifications] ? 'bg-canopy-500' : 'bg-gray-700'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${notifications[item.key as keyof typeof notifications] ? 'left-6' : 'left-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Privacy Section */}
                        {activeSection === 'privacy' && (
                            <div className="animate-fade-in">
                                <h2 className="text-2xl font-medium text-white mb-6">Privacidad</h2>

                                <div className="space-y-4">
                                    {[
                                        { key: 'shareWithFamily', label: 'Compartir con familia', desc: 'Permitir que tu familia acceda a tu contenido' },
                                        { key: 'allowVoiceClone', label: 'Permitir uso de voz', desc: 'Tu voz clonada puede ser usada para respuestas' },
                                        { key: 'publicProfile', label: 'Perfil público', desc: 'Otros pueden ver tu perfil básico' },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div>
                                                <p className="text-white font-medium">{item.label}</p>
                                                <p className="text-gray-500 text-sm">{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => setPrivacy({ ...privacy, [item.key]: !privacy[item.key as keyof typeof privacy] })}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${privacy[item.key as keyof typeof privacy] ? 'bg-canopy-500' : 'bg-gray-700'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${privacy[item.key as keyof typeof privacy] ? 'left-6' : 'left-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <h3 className="text-red-400 font-medium mb-2">Zona de peligro</h3>
                                    <p className="text-gray-400 text-sm mb-4">Estas acciones son permanentes y no se pueden deshacer.</p>
                                    <div className="flex gap-3">
                                        <button className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-sm">
                                            Exportar mis datos
                                        </button>
                                        <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm">
                                            Eliminar mi cuenta
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* API Section */}
                        {activeSection === 'api' && (
                            <div className="animate-fade-in">
                                <h2 className="text-2xl font-medium text-white mb-6">API & Conexiones</h2>

                                <div className="space-y-6">
                                    <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                <span className="text-blue-400 text-lg">🤖</span>
                                            </div>
                                            <div>
                                                <h3 className="text-white font-medium">Google Gemini API</h3>
                                                <p className="text-canopy-400 text-sm">Conectado</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">API Key</label>
                                            <input
                                                type="password"
                                                value="••••••••••••••••"
                                                readOnly
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                <span className="text-purple-400 text-lg">🔊</span>
                                            </div>
                                            <div>
                                                <h3 className="text-white font-medium">ElevenLabs</h3>
                                                <p className="text-canopy-400 text-sm">Conectado</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">API Key</label>
                                            <input
                                                type="password"
                                                value="••••••••••••••••"
                                                readOnly
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Help Section */}
                        {activeSection === 'help' && (
                            <div className="animate-fade-in">
                                <h2 className="text-2xl font-medium text-white mb-6">Ayuda</h2>

                                <div className="grid gap-4">
                                    {[
                                        { icon: '📖', title: 'Guía de inicio', desc: 'Aprende a usar LIGNUM desde cero' },
                                        { icon: '🎙️', title: 'Cómo clonar mi voz', desc: 'Tutorial paso a paso' },
                                        { icon: '💬', title: 'Centro de soporte', desc: 'Contacta con nuestro equipo' },
                                        { icon: '📋', title: 'FAQ', desc: 'Preguntas frecuentes' },
                                    ].map((item, idx) => (
                                        <button key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-canopy-500/30 transition-all text-left group">
                                            <div className="w-12 h-12 rounded-xl bg-canopy-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                {item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-medium">{item.title}</p>
                                                <p className="text-gray-500 text-sm">{item.desc}</p>
                                            </div>
                                            <svg className="w-5 h-5 text-gray-500 group-hover:text-canopy-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-canopy-500/10 to-canopy-600/5 border border-canopy-500/20 text-center">
                                    <p className="text-gray-400 mb-2">¿Necesitas ayuda personalizada?</p>
                                    <button className="px-6 py-3 rounded-xl bg-canopy-600 hover:bg-canopy-500 text-white font-medium transition-colors">
                                        Contactar Soporte
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
