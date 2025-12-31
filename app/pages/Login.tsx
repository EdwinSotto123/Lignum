import React, { useState } from 'react';
import { signInWithEmail, signInWithGoogle, resetPassword } from '../../services/authService';

interface LoginProps {
    onNavigateToSignup: () => void;
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onNavigateToSignup, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetMessage, setResetMessage] = useState('');

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await signInWithEmail(email, password);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);

        try {
            await signInWithGoogle();
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResetMessage('');
        setIsLoading(true);

        try {
            await resetPassword(email);
            setResetMessage('Te hemos enviado un correo para restablecer tu contraseña.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-roots-950 via-roots-900 to-roots-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-canopy-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-legacy-500/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-canopy-500 to-canopy-600 flex items-center justify-center text-4xl shadow-2xl shadow-canopy-500/30 mb-4">
                        🌳
                    </div>
                    <h1 className="text-4xl font-serif text-white mb-2">LIGNUM</h1>
                    <p className="text-gray-500">Preserva el legado de tu familia</p>
                </div>

                {/* Login Card */}
                <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                    {!showResetPassword ? (
                        <>
                            <h2 className="text-2xl font-medium text-white mb-6 text-center">Iniciar Sesión</h2>

                            {error && (
                                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-canopy-500/50 transition-colors"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Contraseña</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-canopy-500/50 transition-colors"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowResetPassword(true)}
                                    className="text-canopy-400 text-sm hover:text-canopy-300 transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-canopy-600 to-canopy-500 hover:from-canopy-500 hover:to-canopy-400 text-white font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-canopy-500/25"
                                >
                                    {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                <span className="text-gray-500 text-sm">o continúa con</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            </div>

                            {/* Google Login */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continuar con Google
                            </button>

                            {/* Sign Up Link */}
                            <p className="mt-6 text-center text-gray-400">
                                ¿No tienes cuenta?{' '}
                                <button
                                    onClick={onNavigateToSignup}
                                    className="text-canopy-400 hover:text-canopy-300 font-medium transition-colors"
                                >
                                    Regístrate
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => { setShowResetPassword(false); setResetMessage(''); }}
                                className="mb-4 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Volver
                            </button>

                            <h2 className="text-2xl font-medium text-white mb-2">Restablecer Contraseña</h2>
                            <p className="text-gray-400 text-sm mb-6">Te enviaremos un correo para restablecer tu contraseña.</p>

                            {error && (
                                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {resetMessage && (
                                <div className="mb-4 p-4 rounded-xl bg-canopy-500/10 border border-canopy-500/30 text-canopy-400 text-sm">
                                    {resetMessage}
                                </div>
                            )}

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-canopy-500/50 transition-colors"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-canopy-600 to-canopy-500 hover:from-canopy-500 hover:to-canopy-400 text-white font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-canopy-500/25"
                                >
                                    {isLoading ? 'Enviando...' : 'Enviar Correo'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
