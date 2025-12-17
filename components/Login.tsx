import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { Employee } from '../types';
import { User, Lock, ArrowRight, AlertCircle, Loader2, Mail, ArrowLeft, Key, CheckCircle } from 'lucide-react';

interface LoginProps {
    onLogin: (user: Employee) => void;
}

type LoginStep = 'LOGIN' | 'FORGOT_EMAIL' | 'FORGOT_NEW_PASS';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [step, setStep] = useState<LoginStep>('LOGIN');
    
    // Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Recovery State
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const resetState = () => {
        setError('');
        setSuccessMsg('');
        setIsLoading(false);
    };

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        resetState();
        setIsLoading(true);

        setTimeout(() => {
            const user = StorageService.validateLogin(username, password);
            setIsLoading(false);
            if (user) {
                onLogin(user);
            } else {
                setError('Credenciales incorrectas');
            }
        }, 800);
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        resetState();
        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
            const exists = StorageService.checkEmailExists(recoveryEmail);
            if (exists) {
                setSuccessMsg('Código de verificación validado correctamente.'); // Simulating verification
                setTimeout(() => {
                   setSuccessMsg('');
                   setStep('FORGOT_NEW_PASS');
                }, 1000);
            } else {
                setError('No encontramos un usuario con este correo electrónico.');
            }
        }, 1000);
    };

    const handleResetPasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        resetState();

        if (newPassword.length < 4) {
            setError('La contraseña debe tener al menos 4 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);

        setTimeout(() => {
            const success = StorageService.resetPassword(recoveryEmail, newPassword);
            setIsLoading(false);
            if (success) {
                setSuccessMsg('Contraseña actualizada correctamente.');
                setTimeout(() => {
                    setStep('LOGIN');
                    setSuccessMsg('');
                    setRecoveryEmail('');
                    setNewPassword('');
                    setConfirmPassword('');
                }, 1500);
            } else {
                setError('Error al actualizar la contraseña. Intente nuevamente.');
            }
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 transition-colors p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg">
                            <span className="text-3xl font-bold text-blue-600">M</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">MotoPaint Pro</h1>
                        <p className="text-blue-100 text-sm mt-2">Sistema de Gestión de Taller</p>
                    </div>
                    {/* Decorative Circles */}
                    <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                    <div className="absolute bottom-[-10px] right-[-10px] w-32 h-32 bg-blue-400 opacity-20 rounded-full blur-xl"></div>
                </div>

                <div className="p-8">
                    {/* LOGIN VIEW */}
                    {step === 'LOGIN' && (
                        <form onSubmit={handleLoginSubmit} className="space-y-6 animate-in slide-in-from-right duration-300">
                            {successMsg && (
                                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <CheckCircle size={16} /> {successMsg}
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                                        placeholder="Ingrese su usuario"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex justify-end mt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => { resetState(); setStep('FORGOT_EMAIL'); }}
                                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !username || !password}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        Iniciar Sesión <ArrowRight size={18} className="ml-2" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* RECOVERY STEP 1: EMAIL */}
                    {step === 'FORGOT_EMAIL' && (
                        <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in slide-in-from-right duration-300">
                             <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Recuperar Contraseña</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ingresa tu correo asociado a la cuenta.</p>
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        value={recoveryEmail}
                                        onChange={(e) => setRecoveryEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                                        placeholder="ejemplo@motopaint.com"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !recoveryEmail}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    'Validar Correo'
                                )}
                            </button>

                            <button 
                                type="button"
                                onClick={() => { resetState(); setStep('LOGIN'); }}
                                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white flex justify-center items-center gap-2"
                            >
                                <ArrowLeft size={16} /> Volver al Inicio
                            </button>
                        </form>
                    )}

                    {/* RECOVERY STEP 2: NEW PASSWORD */}
                    {step === 'FORGOT_NEW_PASS' && (
                        <form onSubmit={handleResetPasswordSubmit} className="space-y-6 animate-in slide-in-from-right duration-300">
                             <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Establecer Nueva Contraseña</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crea una contraseña segura.</p>
                            </div>

                            {successMsg && (
                                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <CheckCircle size={16} /> {successMsg}
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva Contraseña</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                                        placeholder="Min. 4 caracteres"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Contraseña</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Key size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                                        placeholder="Repetir contraseña"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !newPassword || !confirmPassword}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    'Cambiar Contraseña'
                                )}
                            </button>
                            
                            <button 
                                type="button"
                                onClick={() => { resetState(); setStep('LOGIN'); }}
                                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white flex justify-center items-center gap-2"
                            >
                                Cancelar
                            </button>
                        </form>
                    )}
                    
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            v3.0.0 • Acceso seguro
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};