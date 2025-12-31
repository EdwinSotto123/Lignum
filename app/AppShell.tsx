import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import FloatingChatbot from './components/FloatingChatbot';
import VoiceCloning from './pages/VoiceCloning';
import MiLegado from './pages/MiLegado';
import MiFamilia from './pages/MiFamilia';
import CrearHistoria from './pages/CrearHistoria';
import CrearSabiduria from './pages/CrearSabiduria';
import CrearReceta from './pages/CrearReceta';
import GrabacionDiaria from './pages/GrabacionDiaria';
import ChatFamiliar from './pages/ChatFamiliar';
import Cuentacuentos from './pages/Cuentacuentos';
import MensajesFuturo from './pages/MensajesFuturo';
import Settings from './pages/Settings';

export type AppPage =
    | 'voice-cloning'
    | 'mi-legado'
    | 'mi-familia'
    | 'crear-historia'
    | 'crear-sabiduria'
    | 'crear-receta'
    | 'grabacion-diaria'
    | 'mensajes-futuro'
    | 'chat-familiar'
    | 'cuentacuentos'
    | 'settings';

export interface FamilyMember {
    id: string;
    name: string;
    relation: string;
    avatar: string;
    isVoiceCloned: boolean;
    storiesCount: number;
    wisdomCount: number;
    recipesCount: number;
}

const AppShell: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<AppPage>('mi-legado');
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Mock family data
    const [familyMembers] = useState<FamilyMember[]>([
        {
            id: '1',
            name: 'Abuela Rosa',
            relation: 'Abuela',
            avatar: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=150&h=150&fit=crop',
            isVoiceCloned: true,
            storiesCount: 12,
            wisdomCount: 34,
            recipesCount: 28
        },
        {
            id: '2',
            name: 'Abuelo Carlos',
            relation: 'Abuelo',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
            isVoiceCloned: true,
            storiesCount: 8,
            wisdomCount: 45,
            recipesCount: 5
        },
        {
            id: '3',
            name: 'Mamá Elena',
            relation: 'Madre',
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
            isVoiceCloned: false,
            storiesCount: 3,
            wisdomCount: 12,
            recipesCount: 42
        },
        {
            id: '4',
            name: 'Papá Miguel',
            relation: 'Padre',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
            isVoiceCloned: true,
            storiesCount: 6,
            wisdomCount: 28,
            recipesCount: 8
        }
    ]);

    const [currentUser] = useState({
        name: 'Tú',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'
    });

    const handleSelectMember = (member: FamilyMember) => {
        setSelectedMember(member);
        setCurrentPage('chat-familiar');
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'voice-cloning':
                return <VoiceCloning onComplete={() => setCurrentPage('mi-legado')} />;
            case 'mi-legado':
                return <MiLegado onNavigate={setCurrentPage} />;
            case 'mi-familia':
                return <MiFamilia familyMembers={familyMembers} onSelectMember={handleSelectMember} />;
            case 'crear-historia':
                return <CrearHistoria onBack={() => setCurrentPage('mi-legado')} />;
            case 'crear-sabiduria':
                return <CrearSabiduria onBack={() => setCurrentPage('mi-legado')} />;
            case 'crear-receta':
                return <CrearReceta onBack={() => setCurrentPage('mi-legado')} />;
            case 'grabacion-diaria':
                return <GrabacionDiaria onBack={() => setCurrentPage('mi-legado')} />;
            case 'chat-familiar':
                return selectedMember ? (
                    <ChatFamiliar member={selectedMember} onBack={() => setCurrentPage('mi-familia')} />
                ) : (
                    <MiFamilia familyMembers={familyMembers} onSelectMember={handleSelectMember} />
                );
            case 'cuentacuentos':
                return <Cuentacuentos onBack={() => setCurrentPage('mi-legado')} />;
            case 'mensajes-futuro':
                return <MensajesFuturo onBack={() => setCurrentPage('mi-legado')} />;
            case 'settings':
                return <Settings onBack={() => setCurrentPage('mi-legado')} />;
            default:
                return <MiLegado onNavigate={setCurrentPage} />;
        }
    };

    return (
        <div className="min-h-screen bg-roots-950 text-white flex">
            <Sidebar
                currentPage={currentPage}
                onNavigate={setCurrentPage}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                currentUser={currentUser}
            />

            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
                <div className="min-h-screen">
                    {renderPage()}
                </div>
            </main>

            {/* Floating Chatbot */}
            <FloatingChatbot familyMembers={familyMembers} />
        </div>
    );
};

export default AppShell;

