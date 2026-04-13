import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Fingerprint, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

const PIN_LENGTH = 6;

function FloatingParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 15,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.3 + 0.05,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Large gradient orbs */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(51,141,255,0.25) 0%, transparent 70%)',
          top: '-20%',
          right: '-15%',
        }}
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(217,70,239,0.2) 0%, transparent 70%)',
          bottom: '-25%',
          left: '-20%',
        }}
        animate={{
          x: [0, -40, 60, 0],
          y: [0, 50, -40, 0],
          scale: [1, 0.85, 1.1, 1],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          x: [0, 60, -45, 0],
          y: [0, -35, 55, 0],
          scale: [1, 1.08, 0.88, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' as const }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -60, 20, -40, 0],
            x: [0, 20, -15, 30, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity * 0.5, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut' as const,
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginScreen() {
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [detectedRole, setDetectedRole] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const attemptLogin = useCallback(
    (fullPin: string) => {
      setAuthenticating(true);
      setError(false);

      // Brief delay to show the loading state
      setTimeout(() => {
        const result = login(fullPin);

        if (result) {
          setSuccess(true);
          const { authRole } = useStore.getState();
          setDetectedRole(authRole);

          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1200);
        } else {
          setError(true);
          setAuthenticating(false);
          setPin(Array(PIN_LENGTH).fill(''));

          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 400);

          setTimeout(() => setError(false), 800);
        }
      }, 500);
    },
    [login, navigate],
  );

  function handleChange(index: number, value: string) {
    if (authenticating || success) return;

    // Accept only numeric input
    const digit = value.replace(/\D/g, '').slice(-1);

    const updated = [...pin];
    updated[index] = digit;
    setPin(updated);

    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all digits are filled
    if (digit && index === PIN_LENGTH - 1) {
      const fullPin = updated.join('');
      if (fullPin.length === PIN_LENGTH) {
        attemptLogin(fullPin);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (authenticating || success) return;

    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        const updated = [...pin];
        updated[index - 1] = '';
        setPin(updated);
        inputRefs.current[index - 1]?.focus();
      } else {
        const updated = [...pin];
        updated[index] = '';
        setPin(updated);
      }
      e.preventDefault();
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (authenticating || success) return;
    e.preventDefault();

    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!pasted) return;

    const updated = [...pin];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setPin(updated);

    const nextIndex = Math.min(pasted.length, PIN_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === PIN_LENGTH) {
      attemptLogin(pasted);
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden">
      <FloatingParticles />

      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="glass-card p-10">
          {/* Logo / branding */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {/* Icon */}
            <motion.div
              className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(51,141,255,0.2) 0%, rgba(217,70,239,0.2) 100%)',
                border: '1px solid rgba(148,163,184,0.12)',
              }}
              animate={success ? { scale: [1, 1.1, 1], borderColor: 'rgba(34,197,94,0.4)' } : {}}
              transition={{ duration: 0.5 }}
            >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <ShieldCheck size={28} className="text-success-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="fingerprint"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Fingerprint size={28} className="text-primary-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <h1 className="gradient-text text-2xl font-bold tracking-tight">
              SAJA Talent Engine
            </h1>
            <p className="text-surface-400 text-sm mt-1.5 font-medium tracking-widest uppercase">
              JabonesSelectos
            </p>
            <p className="text-surface-500 text-xs mt-3">
              Sistema Integral de Recursos Humanos
            </p>
          </motion.div>

          {/* PIN input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="text-surface-400 text-sm text-center mb-5">
              Ingrese su PIN de acceso
            </p>

            <motion.div
              className="flex justify-center gap-3"
              animate={error ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                const filled = !!pin[i];
                return (
                  <div key={i} className="relative">
                    <input
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={pin[i]}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      disabled={authenticating || success}
                      autoComplete="off"
                      className={`
                        w-12 h-14 text-center text-lg font-semibold rounded-xl
                        outline-none transition-all duration-300
                        ${error
                          ? 'bg-danger-500/10 border-2 border-danger-500/50 text-danger-500'
                          : success
                            ? 'bg-success-500/10 border-2 border-success-500/50 text-success-500'
                            : filled
                              ? 'bg-primary-500/10 border-2 border-primary-500/40 text-white'
                              : 'bg-surface-900/60 border-2 border-white/10 text-white'
                        }
                        focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(51,141,255,0.15)]
                        disabled:opacity-60 disabled:cursor-not-allowed
                      `}
                    />

                    {/* Dot indicator below each box */}
                    <motion.div
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      animate={{
                        backgroundColor: filled
                          ? error
                            ? 'rgba(239,68,68,0.8)'
                            : success
                              ? 'rgba(34,197,94,0.8)'
                              : 'rgba(51,141,255,0.8)'
                          : 'rgba(148,163,184,0.2)',
                        scale: filled ? 1 : 0.6,
                      }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                );
              })}
            </motion.div>

            {/* Status messages */}
            <div className="h-12 mt-6 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {authenticating && !success && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-2 text-primary-400 text-sm"
                  >
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verificando acceso...</span>
                  </motion.div>
                )}

                {error && (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-danger-500 text-sm font-medium"
                  >
                    PIN incorrecto. Intente de nuevo.
                  </motion.p>
                )}

                {success && detectedRole && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <p className="text-success-500 text-sm font-medium">
                      Acceso concedido
                    </p>
                    <span className="badge badge-blue capitalize">
                      {detectedRole}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Footer text */}
          <motion.p
            className="text-surface-600 text-xs text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Contacte al administrador si olvido su PIN
          </motion.p>
        </div>

        {/* Subtle glow underneath the card */}
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-full blur-2xl opacity-30 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(51,141,255,0.4) 0%, rgba(217,70,239,0.4) 100%)',
          }}
        />
      </motion.div>
    </div>
  );
}
