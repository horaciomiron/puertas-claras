import { useEffect, useMemo, useRef, useState } from 'react';
import { api, isVisible } from '../api.js';
import { Emergency } from './Citizen.jsx';

// Asistente conversacional (EXPERIMENTAL). Recorre TODA la entrevista (interview.json):
// - preguntas de opciones: la persona escribe con sus palabras, el sistema propone y ella confirma (o elige a mano);
// - datos y relato (texto libre): se guardan tal cual, nunca se interpretan ni se envían a la IA;
// - al final entrega las respuestas a la pantalla de revisión y envío del formulario.
const empty = (v) => v === undefined || v === '' || (Array.isArray(v) && !v.length);

function itemsVisibles(def, answers) {
  const out = [];
  for (const s of def.steps.filter((x) => isVisible(x, answers))) {
    if (s.fields) s.fields.forEach((f, k) => out.push({ id: f.id, step: s, field: f, first: k === 0, label: f.label, required: !!f.required, options: f.type === 'select' ? f.options : null, multi: false, maxLength: f.maxLength, long: false }));
    else out.push({ id: s.id, step: s, first: false, label: s.label, ayuda: s.ayuda, required: !!s.required, options: s.options || null, multi: s.type === 'multi', maxLength: s.maxLength, long: s.type === 'textarea' });
  }
  return out;
}

export default function Chat({ onFinish }) {
  const [def, setDef] = useState(null);
  const [modo, setModo] = useState('reglas');
  const [err, setErr] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState([]);
  const [hist, setHist] = useState([]);
  const [texto, setTexto] = useState('');
  const [prop, setProp] = useState(null);
  const [manual, setManual] = useState(false);
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showEm, setShowEm] = useState(false);
  const fin = useRef(null);

  const item = useMemo(() => (def ? itemsVisibles(def, answers).find((i) => !done.includes(i.id)) || null : null), [def, answers, done]);
  const say = (de, t) => setMsgs((m) => [...m, { de, t }]);
  const preguntar = (it) => setMsgs((m) => [...m, ...(it.first ? [{ de: 'bot', t: it.step.label }, ...(it.step.ayuda ? [{ de: 'bot', t: it.step.ayuda, small: true }] : [])] : []),
    { de: 'bot', t: it.first ? it.label : it.label }, ...(it.ayuda ? [{ de: 'bot', t: it.ayuda, small: true }] : [])]);

  useEffect(() => {
    Promise.all([api('/chat/pasos'), api('/entrevista')]).then(([c, d]) => {
      setModo(c.modo); setDef(d);
      const first = itemsVisibles(d, {})[0];
      setMsgs([{ de: 'bot', t: 'Hola. Soy el asistente de Puertas Claras (modo de prueba). Te voy a hacer las mismas preguntas del formulario, pero podés contestarme con tus palabras. Todo lo que entienda te lo voy a confirmar.' },
        { de: 'bot', t: first.label }]);
    }).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { fin.current?.scrollIntoView({ block: 'nearest' }); }, [msgs, prop, manual, item]);

  if (err) return <div className="notice" role="alert">{err}</div>;
  if (!def) return <p role="status">Cargando…</p>;

  const avanzar = (nuevoAns, nuevoDone, ultimo) => {
    setHist((h) => [...h, { answers, done, msgs: msgs.length }]);
    setAnswers(nuevoAns); setDone(nuevoDone); setProp(null); setManual(false); setSel([]); setTexto('');
    const sig = itemsVisibles(def, nuevoAns).find((i) => !nuevoDone.includes(i.id));
    if (sig) preguntar(sig); else say('bot', 'Listo, ya tengo todo lo necesario. Ahora vas a ver un resumen para revisarlo, corregirlo y enviarlo.');
    if (ultimo?.emergencia) setShowEm(true);
  };
  const confirmar = (valores, etiquetas) => {
    say('yo', etiquetas.join(', '));
    const emergencia = item.step.emergencyOn && valores.some((v) => item.step.emergencyOn.includes(v));
    avanzar({ ...answers, [item.id]: item.multi ? valores : valores[0] }, [...done, item.id], { emergencia });
  };
  const libre = (e) => {
    e.preventDefault();
    const t = texto.trim(); if (!t) return;
    say('yo', t); avanzar({ ...answers, [item.id]: t }, [...done, item.id]);
  };
  const saltar = () => { say('yo', 'Prefiero saltar esta pregunta'); const a = { ...answers }; delete a[item.id]; avanzar(a, [...done, item.id]); };
  const interpretar = async (e) => {
    e.preventDefault();
    const t = texto.trim(); if (!t || busy) return;
    say('yo', t); setTexto(''); setBusy(true); setErr('');
    try {
      const r = await api('/chat/turno', { method: 'POST', body: { paso: item.id, texto: t } });
      if (r.emergencia) { setShowEm(true); say('bot', 'Lo que contás puede ser urgente. Si estás en peligro, pedí ayuda ahora. Cuando estés a salvo, seguimos.'); }
      else if (r.entendido) { setProp(r); say('bot', `Entendí: ${r.etiquetas.map((x) => `«${x}»`).join(', ')}. ¿Es correcto?`); }
      else { say('bot', 'No estoy seguro de haber entendido. Elegí una de estas opciones:'); setManual(true); }
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const toggle = (v) => {
    const o = item.options.find((x) => x.value === v);
    setSel((s) => { if (s.includes(v)) return s.filter((x) => x !== v);
      return o.exclusive ? [v] : [...s.filter((x) => !item.options.find((y) => y.value === x)?.exclusive), v]; });
  };
  const volver = () => {
    const h = hist[hist.length - 1]; if (!h) return;
    setHist((x) => x.slice(0, -1)); setAnswers(h.answers); setDone(h.done); setProp(null); setManual(false); setSel([]); setTexto('');
    setMsgs((m) => [...m.slice(0, h.msgs), { de: 'bot', t: 'Volvemos a la pregunta anterior.' }]);
    const sig = itemsVisibles(def, h.answers).find((i) => !h.done.includes(i.id));
    if (sig) setMsgs((m) => [...m, { de: 'bot', t: sig.label }]);
  };

  const opciones = item?.options?.filter((o) => !o.disabled) || [];
  return (
    <section aria-labelledby="chat-t">
      <h2 id="chat-t">Asistente conversacional <span className="pill orange">Experimental</span></h2>
      <div className="notice" role="note">
        <strong>Prueba con datos ficticios.</strong> Este asistente hace las mismas preguntas del formulario y al final te muestra el resumen para que lo revises antes de enviar. Para elegir opciones se interpreta lo que escribís {modo === 'ia' ? 'con inteligencia artificial (ese texto se envía a un servicio externo y la sugerencia puede ser incorrecta: siempre la confirmás vos)' : 'con reglas simples, sin IA'}. Nombre, domicilio, teléfono y relato se guardan tal cual y no se interpretan. Siempre podés elegir una opción a mano.
      </div>
      <div className="chatlog" role="log" aria-live="polite">
        {msgs.map((m, k) => <div key={k} className={'bubble ' + m.de + (m.small ? ' smallb' : '')}>{m.t}</div>)}
        {showEm && <Emergency data={def.emergencia} onContinue={() => setShowEm(false)} />}
        {!item && (
          <div className="bubble bot"><div className="row">
            <button className="btn primary" onClick={() => onFinish(answers)}>Revisar y enviar</button>
            <button className="btn secondary" onClick={volver} disabled={!hist.length}>Corregir la última respuesta</button></div></div>
        )}
        <div ref={fin} />
      </div>

      {item && prop && (
        <div className="row" role="group" aria-label="Confirmar lo entendido">
          <button className="btn primary" onClick={() => confirmar(prop.valores, prop.etiquetas)}>Sí, es correcto</button>
          <button className="btn secondary" onClick={() => { say('yo', 'No, quiero elegir'); setProp(null); setManual(true); }}>No, quiero elegir yo</button>
        </div>
      )}
      {item && !prop && (
        <>
          <form className="chatform" onSubmit={item.options ? interpretar : libre}>
            <label htmlFor="chat-texto" className="sr">Tu respuesta</label>
            {item.long
              ? <textarea id="chat-texto" rows={4} value={texto} maxLength={item.maxLength || 2000} onChange={(e) => setTexto(e.target.value)} placeholder="Contalo con tus palabras…" />
              : <input id="chat-texto" value={texto} maxLength={item.options ? 500 : item.maxLength || 200} onChange={(e) => setTexto(e.target.value)} placeholder="Escribí con tus palabras…" autoComplete="off" />}
            <button className="btn primary" type="submit" disabled={busy || !texto.trim()}>{busy ? 'Enviando…' : 'Enviar'}</button>
          </form>
          <div className="row">
            {item.options && <button className="linkbtn" onClick={() => setManual((v) => !v)} aria-expanded={manual}>{manual ? 'Ocultar opciones' : 'Prefiero elegir una opción'}</button>}
            {!item.required && <button className="linkbtn" onClick={saltar}>Saltar esta pregunta</button>}
            {hist.length > 0 && <button className="linkbtn" onClick={volver}>Volver a la anterior</button>}
          </div>
          {item.options && manual && (
            <div className="options-chat" role="group" aria-label="Opciones">
              {opciones.map((o) => item.multi
                ? <label key={o.value} className="check"><input type="checkbox" checked={sel.includes(o.value)} onChange={() => toggle(o.value)} /> {o.label}</label>
                : <button key={o.value} className="btn secondary" onClick={() => confirmar([o.value], [o.label])}>{o.label}</button>)}
              {item.multi && <button className="btn primary" disabled={empty(sel)} onClick={() => confirmar(sel, sel.map((v) => opciones.find((o) => o.value === v).label))}>Listo</button>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
