import { useState, useRef, useEffect } from 'react';
import Citizen from './components/Citizen.jsx';
import Staff from './components/Staff.jsx';
import Chat from './components/Chat.jsx';
import { Logo } from './components/ui.jsx';

export default function App() {
  const [view, setView] = useState('landing'); // landing | citizen | chat | staff
  const [size, setSize] = useState(100);
  const [prefill, setPrefill] = useState(null); // respuestas del asistente conversacional
  const main = useRef(null);
  useEffect(() => { document.documentElement.style.fontSize = `${size}%`; }, [size]);
  useEffect(() => { main.current?.focus(); window.scrollTo(0, 0); }, [view]);

  return (
    <>
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <div className="app"><div className="shell">
        <header className="top">
          <div className="brand"><div className="logo"><Logo /></div>
            <div><h1>Puertas Claras <span className="ver">v.2</span></h1><p className="alcance">Acceso a la Justicia · Violencia familiar y de género</p></div></div>
          <div className="top-tools">
            <div className="tagline">La Justicia empieza por poder entrar.</div>
            <div className="fontbtns" role="group" aria-label="Tamaño del texto">
              <button type="button" onClick={() => setSize((s) => Math.max(90, s - 10))} aria-label="Achicar texto">A−</button>
              <button type="button" onClick={() => setSize((s) => Math.min(150, s + 10))} aria-label="Agrandar texto">A+</button>
            </div>
          </div>
        </header>
        <div className="demo-banner" role="note"><strong>Prototipo demostrativo.</strong> No constituye una presentación judicial ni genera un expediente. No ingreses datos reales.</div>
        <nav className="tabs" aria-label="Secciones">
          <button className={'tab' + (view === 'landing' ? ' active' : '')} onClick={() => setView('landing')} aria-current={view === 'landing' ? 'page' : undefined}>Inicio</button>
          <button className={'tab' + (view === 'citizen' ? ' active' : '')} onClick={() => setView('citizen')} aria-current={view === 'citizen' ? 'page' : undefined}>Acceso ciudadano</button>
          <button className={'tab' + (view === 'chat' ? ' active' : '')} onClick={() => setView('chat')} aria-current={view === 'chat' ? 'page' : undefined}>Asistente (prueba)</button>
          <button className={'tab' + (view === 'staff' ? ' active' : '')} onClick={() => setView('staff')} aria-current={view === 'staff' ? 'page' : undefined}>Acceso operador/a</button>
        </nav>
        <main id="contenido" className="main" tabIndex={-1} ref={main}>
          {view === 'landing' && (
            <section className="hero"><div className="hero-inner">
              <div className="hero-kicker">Prototipo académico · PIL 2026</div>
              <h2>Una puerta más clara para entrar a la Justicia</h2>
              <p>Una entrevista guiada para denunciar violencia familiar o de género, o informar algo nuevo en una causa existente, y un panel que ordena la información para la OGU. La herramienta organiza y destaca; la evaluación y la decisión siguen siendo humanas.</p>
              <div className="entry-grid">
                <button className="entry-card" onClick={() => setView('citizen')}><div className="entry-icon" aria-hidden="true">↗</div><h3>Necesito denunciar o informar algo</h3><p>Respondé preguntas simples, paso a paso. También podés ver cómo va tu presentación.</p></button>
                <button className="entry-card" onClick={() => setView('staff')}><div className="entry-icon" aria-hidden="true">▦</div><h3>Soy operador/a judicial</h3><p>Ingresá a la bandeja para revisar, asignar y validar la derivación de los legajos.</p></button>
              </div>
            </div></section>
          )}
          {view === 'citizen' && <Citizen prefill={prefill} onConsumed={() => setPrefill(null)} />}
          {view === 'chat' && <Chat onFinish={(a) => { setPrefill(a); setView('citizen'); }} />}
          {view === 'staff' && <Staff />}
        </main>
        <footer className="footer">Puertas Claras v.2 · Prototipo académico. La priorización es operativa y explicable; toda derivación requiere validación humana. Datos 100 % ficticios.</footer>
      </div></div>
    </>
  );
}
