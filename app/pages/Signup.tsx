import React, { useState } from 'react';
import { signUpWithEmail, signInWithGoogle } from '../../services/authService';

interface SignupProps {
    onNavigateToLogin: () => void;
    onSignupSuccess: () => void;
}

const Signup: React.FC<SignupProps> = ({ onNavigateToLogin, onSignupSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsLoading(true);

        try {
            await signUpWithEmail(email, password, name);
            onSignupSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setError('');
        setIsLoading(true);

        try {
            await signInWithGoogle();
            onSignupSuccess();
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
                <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-legacy-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-canopy-500/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-legacy-500 to-legacy-600 flex items-center justify-center text-4xl shadow-2xl shadow-legacy-500/30 mb-4">
                        🌱
                    </div>
                    <h1 className="text-4xl font-serif text-white mb-2">Únete a LIGNUM</h1>
                    <p className="text-gray-500">Comienza a preservar tu legado familiar</p>
                </div>

                {/* Signup Card */}
                <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                    <h2 className="text-2xl font-medium text-white mb-6 text-center">Crear Cuenta</h2>

                    {error && (
                        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailSignup} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Tu Nombre</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-legacy-500/50 transition-colors"
                                placeholder="¿Cómo te llamas?"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Correo Electrónico</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-legacy-500/50 transition-colors"
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
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-legacy-500/50 transition-colors"
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-legacy-500/50 transition-colors"
                                placeholder="Repite tu contraseña"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-legacy-600 to-legacy-500 hover:from-legacy-500 hover:to-legacy-400 text-roots-950 font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-legacy-500/25"
                        >
                            {isLoading ? 'Creando cuenta...' : 'Crear Mi Cuenta'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <span className="text-gray-500 text-sm">o continúa con</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>

                    {/* Google Signup */}
                    <button
                        onClick={handleGoogleSignup}
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

                    {/* Login Link */}
                    <p className="mt-6 text-center text-gray-400">
                        ¿Ya tienes cuenta?{' '}
                        <button
                            onClick={onNavigateToLogin}
                            className="text-legacy-400 hover:text-legacy-300 font-medium transition-colors"
                        >
                            Inicia Sesión
                        </button>
                    </p>
                </div>

                {/* Terms */}
                <p className="mt-6 text-center text-gray-600 text-xs">
                    Al registrarte, aceptas nuestros{' '}
                    <a href="#" className="text-gray-500 hover:text-white">Términos de Servicio</a>
                    {' '}y{' '}
                    <a href="#" className="text-gray-500 hover:text-white">Política de Privacidad</a>
                </p>
            </div>
        </div>
    );
};

export default Signup;
