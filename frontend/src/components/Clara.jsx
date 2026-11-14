import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

// Personaje original de Puertas Claras: una puertita amable que saluda.
function ClaraDibujo({ size = 64 }) {
  return (
    <svg className="clara-svg" width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <ellipse cx="40" cy="74" rx="20" ry="3.5" fill="rgba(0,0,0,.15)" />
      <g className="clara-body">
        <path d="M18 70V22c0-9 8-16 22-16s22 7 22 16v48z" fill="#f7f2e8" stroke="#1f4d3a" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M25 70V26c0-6 6-11 15-11s15 5 15 11v44z" fill="#dceadf" stroke="#3f7658" strokeWidth="2" />
        <g className="clara-eyes"><ellipse cx="34" cy="38" rx="2.8" ry="3.6" fill="#1f4d3a" /><ellipse cx="46" cy="38" rx="2.8" ry="3.6" fill="#1f4d3a" /></g>
        <path d="M34 47c2 3.5 10 3.5 12 0" stroke="#1f4d3a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="30" cy="45" r="2.6" fill="#f2b8a8" opacity=".7" /><circle cx="50" cy="45" r="2.6" fill="#f2b8a8" opacity=".7" />
        <circle cx="52" cy="58" r="2.4" fill="#a76d18" />
      </g>
      <g className="clara-arm"><path d="M60 40c6-2 9-8 8-14" stroke="#1f4d3a" strokeWidth="3.4" strokeLinecap="round" fill="none" /><circle cx="68" cy="24" r="3.6" fill="#f7f2e8" stroke="#1f4d3a" strokeWidth="2.4" /></g>
    </svg>
  );
}

const SUGERENCIAS = ['Explicame esta pregunta', '¿Para qué sirve esta pregunta?', '¿Qué pasa después de enviar?', '¿Mis datos están seguros?'];

export default function Clara({ ctx }) {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState('reglas');
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null); const fin = useRef(null); const fab = useRef(null);
  const paso = ctx?.id || 'inicio';

  useEffect(() => { api('/ayuda').then((i) => setModo(i.modo)).catch(() => {}); }, []);
  useEffect(() => { if (open) { input.current?.focus(); fin.current?.scrollIntoView({ block: 'nearest' }); } }, [open, msgs]);
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); fab.current?.focus(); } };
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc);
  }, [open]);

  const abrir = () => {
    setOpen(true);
    if (!msgs.length) setMsgs([{ de: 'bot', t: 'Hola, soy Clara. Te puedo explicar cualquier pregunta con palabras simples. Tocá una sugerencia o escribime tu duda.' }]);
  };
  const preguntar = async (mensaje) => {
    const m = mensaje.trim(); if (busy) return;
    if (m) setMsgs((x) => [...x, { de: 'yo', t: m }]); setTexto(''); setBusy(true);
    try {
      const r = await api('/ayuda', { method: 'POST', body: { paso, mensaje: m } });
      setMsgs((x) => [...x, { de: 'bot', t: r.respuesta, em: r.emergencia }]);
    } catch (e) { setMsgs((x) => [...x, { de: 'bot', t: e.message || 'No pude responder ahora. Probá de nuevo en un momento.' }]); }
    finally { setBusy(false); }
  };

  return (
    <div className="clara">
      {open && (
        <section className="clara-panel" role="dialog" aria-label="Clara, asistente de ayuda">
          <header className="clara-head">
            <ClaraDibujo size={38} />
            <div><strong>Clara</strong><div className="small">Asistente de ayuda · {modo === 'ia' ? 'con IA' : 'respuestas guía'}</div></div>
            <button className="clara-x" onClick={() => { setOpen(false); fab.current?.focus(); }} aria-label="Cerrar la ayuda de Clara">✕</button>
          </header>
          <p className="clara-aviso small">Clara explica; no decide nada ni da asesoramiento legal. No escribas datos reales.{modo === 'ia' ? ' Lo que le escribas se envía a un servicio de IA externo y puede equivocarse.' : ''}</p>
          <div className="clara-log" role="log" aria-live="polite">
            {msgs.map((m, k) => (
              <div key={k} className={'bubble ' + m.de + (m.em ? ' clara-em' : '')}>
                {m.t.split('\n').map((l, i) => <p key={i} style={{ margin: i ? '8px 0 0' : 0 }}>{l}</p>)}
                {m.em && <p style={{ margin: '8px 0 0' }}><a className="btn primary" href="tel:911">Llamar al 911</a> <a className="btn secondary" href="tel:144">Llamar al 144</a></p>}
              </div>
            ))}
            {busy && <div className="bubble bot" aria-label="Clara está escribiendo">…</div>}
            <div ref={fin} />
          </div>
          <div className="clara-chips">{SUGERENCIAS.map((s) => <button key={s} className="chip" onClick={() => preguntar(s)} disabled={busy}>{s}</button>)}</div>
          <form className="clara-form" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) preguntar(texto); }}>
            <label htmlFor="clara-txt" className="sr">Escribile a Clara</label>
            <input id="clara-txt" ref={input} value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} placeholder="Escribí tu duda…" autoComplete="off" />
            <button className="btn primary" type="submit" disabled={busy || !texto.trim()}>Enviar</button>
          </form>
        </section>
      )}
      <button ref={fab} className="clara-fab" onClick={() => (open ? setOpen(false) : abrir())} aria-expanded={open} aria-label={open ? 'Cerrar la ayuda de Clara' : 'Abrir la ayuda de Clara: te explica las preguntas'}>
        {!open && <span className="clara-globo" aria-hidden="true">¿Te ayudo?</span>}
        <ClaraDibujo size={68} />
      </button>
    </div>
  );
}
