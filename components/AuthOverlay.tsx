import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface AuthOverlayProps {
    onClose: () => void;
    onLoginSuccess: (user: any) => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onClose, onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user) {
                    onLoginSuccess(data.user);
                    onClose();
                }
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user) {
                    alert('¡Registro exitoso! Revisa tu email para confirmar.');
                    setIsLogin(true); // Switch to login
                }
            }
        } catch (err: any) {
            setError(err.message || "Error de autenticación");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-cyan-500/30 w-full max-w-md p-8 rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.1)] relative overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
                        {isLogin ? 'BIENVENIDO' : 'ÚNETE A LA ACCIÓN'}
                    </h2>
                    <p className="text-white/60 text-sm">
                        {isLogin
                            ? 'Accede a tu biblioteca de aventuras y estadísticas.'
                            : 'Crea, guarda y analiza tus propias aventuras.'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-cyan-400/80 mb-1 ml-1 uppercase">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            placeholder="tu@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-purple-400/80 mb-1 ml-1 uppercase">Contraseña</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? (
                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                        ) : (
                            isLogin ? 'ENTRAR' : 'REGISTRARME'
                        )}
                    </button>
                </form>

                <div className="space-y-4 mt-6">
                    <div className="relative flex items-center justify-center my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                        <span className="relative bg-[#0f172a] px-3 text-xs text-white/40 uppercase">O también</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={true}
                        className="w-full bg-white/5 text-white/20 font-bold py-3 rounded-xl border border-white/5 cursor-not-allowed flex items-center justify-center gap-3 transition-colors grayscale opacity-50"
                        title="Deshabilitado temporalmente"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 opacity-50" alt="Google" />
                        Continuar con Google (Próximamente)
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-white/40 hover:text-white text-xs underline transition-colors"
                    >
                        {isLogin ? '¿No tienes cuenta? Registrate gratis' : '¿Ya tienes cuenta? Inicia Sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
};
