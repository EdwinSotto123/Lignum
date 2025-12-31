import React, { useState, useEffect } from 'react';

// Landing Page Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Problem from './components/Problem';
import Solution from './components/Solution';
import Demo from './components/Demo';
import Footer from './components/Footer';

// App Components
import AppShell from './app/AppShell';

// Auth Components
import Login from './app/pages/Login';
import Signup from './app/pages/Signup';

// Auth Service
import { onAuthChange, AuthUser } from './services/authService';

type View = 'landing' | 'login' | 'signup' | 'app';

function AppRouter() {
  const [view, setView] = useState<View>('landing');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    console.log('🔐 Setting up auth listener...');
    const unsubscribe = onAuthChange((authUser) => {
      console.log('🔐 Auth state changed:', authUser ? `User: ${authUser.email}` : 'No user');
      setUser(authUser);
      setIsAuthLoading(false);

      // If user is logged in and on login/signup, redirect to app
      if (authUser && (view === 'login' || view === 'signup')) {
        console.log('🔐 User logged in, redirecting to app...');
        setView('app');
        window.location.hash = '#/app';
      }
    });

    return () => unsubscribe();
  }, [view]);

  useEffect(() => {
    // Check hash on load
    const checkHash = () => {
      const hash = window.location.hash;

      if (hash === '#/login') {
        setView('login');
      } else if (hash === '#/signup') {
        setView('signup');
      } else if (hash === '#/app' || hash.startsWith('#/app/')) {
        // If trying to access app without auth, redirect to login
        if (!user && !isAuthLoading) {
          setView('login');
          window.location.hash = '#/login';
        } else if (user) {
          setView('app');
        }
      } else {
        setView('landing');
      }
    };

    if (!isAuthLoading) {
      checkHash();
    }

    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [user, isAuthLoading]);

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-roots-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center text-3xl shadow-2xl shadow-canopy-500/30 mb-4 animate-pulse">
            🌳
          </div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Login Page
  if (view === 'login') {
    return (
      <Login
        onNavigateToSignup={() => {
          setView('signup');
          window.location.hash = '#/signup';
        }}
        onLoginSuccess={() => {
          setView('app');
          window.location.hash = '#/app';
        }}
      />
    );
  }

  // Signup Page
  if (view === 'signup') {
    return (
      <Signup
        onNavigateToLogin={() => {
          setView('login');
          window.location.hash = '#/login';
        }}
        onSignupSuccess={() => {
          setView('app');
          window.location.hash = '#/app';
        }}
      />
    );
  }

  // App (protected)
  if (view === 'app' && user) {
    return <AppShell />;
  }

  // Landing Page
  return (
    <div className="min-h-screen bg-roots-950 text-white selection:bg-canopy-500 selection:text-roots-900">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Demo />

        {/* Waitlist CTA */}
        <section id="waitlist" className="py-20 bg-gradient-to-b from-roots-900 to-roots-950 text-center px-4">
          <h2 className="text-3xl font-serif text-white mb-6">Comienza a Preservar tu Legado</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Únete a la red. Empieza a preservar tu conocimiento y presencia para tu familia hoy.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setView('signup');
                window.location.hash = '#/signup';
              }}
              className="bg-canopy-600 hover:bg-canopy-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-canopy-500/25"
            >
              Crear Cuenta Gratis
            </button>
            <button
              onClick={() => {
                setView('login');
                window.location.hash = '#/login';
              }}
              className="bg-white/5 hover:bg-white/10 text-white font-medium px-8 py-4 rounded-xl border border-white/10 transition-all hover:scale-105"
            >
              Iniciar Sesión
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default AppRouter;