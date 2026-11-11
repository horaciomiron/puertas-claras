import { useState, useRef, useEffect } from 'react';
import Citizen from './components/Citizen.jsx';
import Staff from './components/Staff.jsx';
import { Logo } from './components/ui.jsx';

export default function App() {
  const [view, setView] = useState('landing'); // landing | citizen | staff
  const [size, setSize] = useState(100);
  const main = useRef(null);
  useEffect(() => { document.documentElement.style.fontSize = `${size}%`; }, [size]);
  useEffect(() => { main.current?.focus(); window.scrollTo(0, 0); }, [view]);

  return (
    <>
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <div className="app"><div className="shell">
        <header className="top">
          <div className="brand"><div className="logo"><Logo /></div>
            <div><h1>Puertas Claras <span className="ver">v.1</span></h1><p>Orientación y acceso a la Justicia</p></div></div>
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
          <button className={'tab' + (view === 'staff' ? ' active' : '')} onClick={() => setView('staff')} aria-current={view === 'staff' ? 'page' : undefined}>Acceso operador/a</button>
        </nav>
        <main id="contenido" className="main" tabIndex={-1} ref={main}>
          {view === 'landing' && (
            <section className="hero"><div className="hero-inner">
              <div className="hero-kicker">Prototipo académico · PIL 2026</div>
              <h2>Una puerta más clara para entrar a la Justicia</h2>
              <p>Orientación guiada para la ciudadanía e información ordenada para quienes trabajan en la OGU. La herramienta organiza y destaca; la evaluación y la decisión siguen siendo humanas.</p>
              <div className="entry-grid">
                <button className="entry-card" onClick={() => setView('citizen')}><div className="entry-icon" aria-hidden="true">↗</div><h3>Quiero hacer una consulta</h3><p>Respondé preguntas simples, paso a paso. También podés ver cómo va una consulta anterior.</p></button>
                <button className="entry-card" onClick={() => setView('staff')}><div className="entry-icon" aria-hidden="true">▦</div><h3>Soy operador/a judicial</h3><p>Ingresá a la bandeja para revisar, filtrar, gestionar y derivar legajos.</p></button>
              </div>
            </div></section>
          )}
          {view === 'citizen' && <Citizen />}
          {view === 'staff' && <Staff />}
        </main>
        <footer className="footer">Puertas Claras v.1 · Prototipo académico. La priorización es operativa y explicable; toda derivación requiere validación humana. Datos 100 % ficticios.</footer>
      </div></div>
    </>
  );
}
