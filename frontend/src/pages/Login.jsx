import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
  const { user } = useAuth();
  console.log('API URL:', import.meta.env.VITE_API_URL);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const error = params.get('error');

  const [phase, setPhase]       = useState('idle');
  const [showFull, setShowFull] = useState(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (user) navigate(user.course ? '/dashboard' : '/onboarding', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('pulse'),   350);
    const t2 = setTimeout(() => setPhase('expand'),  950);
    const t3 = setTimeout(() => setShowFull(true),   1300);
    const t4 = setTimeout(() => setPhase('done'),    2000);
    const t5 = setTimeout(() => setShowCard(true),   2950);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.bgGrain} />
      <div className={styles.bgGrid} />
      <div className={styles.bgVignette} />
      <div className={styles.bgGlow} />
      <div className={styles.particles}>
        {[...Array(14)].map((_, i) => (
          <span key={i} className={styles.particle} style={{ '--i': i }} />
        ))}
      </div>

      <div className={`${styles.hero} ${phase === 'done' ? styles.heroRisen : ''}`}>
        <div className={`${styles.acronym} ${styles['phase_' + phase]}`}>
          <span className={styles.chunk}>
            <span className={styles.letter}>T</span>
            <span className={`${styles.exp} ${showFull ? styles.expIn : ''}`} style={{ '--d': '0ms' }}>hird-person's</span>
          </span>
          <span className={`${styles.ws} ${showFull ? styles.wsIn : ''}`}>&nbsp;</span>
          <span className={styles.chunk}>
            <span className={styles.letter}>P</span>
            <span className={`${styles.exp} ${showFull ? styles.expIn : ''}`} style={{ '--d': '60ms' }}>erspective</span>
          </span>
          <span className={`${styles.ws} ${showFull ? styles.wsIn : ''}`}>&nbsp;</span>
          <span className={styles.chunk}>
            <span className={styles.letter}>P</span>
            <span className={`${styles.exp} ${showFull ? styles.expIn : ''}`} style={{ '--d': '120ms' }}>lay</span>
          </span>
        </div>

        <h1 className={`${styles.heading} ${phase === 'done' ? styles.headingIn : ''}`}>
          <span className={styles.h1}>Wow</span>
          <span className={styles.h2}>Notes</span>
        </h1>
        <p className={`${styles.tagline} ${phase === 'done' ? styles.taglineIn : ''}`}>
          Secure notes for KIIT students. One account, one device.
        </p>
      </div>

      <div className={`${styles.card} ${showCard ? styles.cardIn : ''}`}>
        <div className={styles.badge}><span className={styles.dot} />KIIT University · @kiit.ac.in only</div>
        {error === 'unauthorized' && (
          <div className={styles.errorBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Only <strong>@kiit.ac.in</strong> accounts permitted.
          </div>
        )} // v2
        <a href={`${import.meta.env.VITE_API_URL}/auth/google`} className={styles.btn}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>
        <p className={styles.fine}><em></em> · WowNotes · KIIT exclusive</p>
      </div>
    </div>
  );
}
