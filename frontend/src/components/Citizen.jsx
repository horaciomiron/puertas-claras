import { useEffect, useRef, useState, useCallback } from 'react';
import { api, isVisible } from '../api.js';
import { Pill, prioTone, fmt } from './ui.jsx';

export function Emergency({ data, onContinue }) {
  return (
    <div className="emergency" role="alert">
      <h3>{data.titulo}</h3>
      <p>{data.texto}</p>
      <a className="btn primary" href="tel:911">Solicitar ayuda de emergencia (911)</a>
      <ul className="lines">{data.lineas.map((l) => <li key={l.numero}><span>{l.nombre}</span> <a href={`tel:${l.numero}`}>{l.numero}</a></li>)}</ul>
      <p className="small">Esta es una simulación: la app no está conectada con ningún servicio de emergencia.</p>
      {onContinue && <button className="btn secondary" onClick={onContinue}>Ya estoy a salvo y quiero continuar</button>}
    </div>
  );
}

function Tracking() {
  const [code, setCode] = useState(''); const [res, setRes] = useState(null); const [err, setErr] = useState('');
  const go = async (e) => { e.preventDefault(); setErr(''); setRes(null);
    try { setRes(await api(`/seguimiento/${encodeURIComponent(code.trim())}`)); } catch (x) { setErr(x.message); } };
  return (
    <div className="card"><h3>Ver cómo va mi consulta</h3>
      <form onSubmit={go}>
        <div className="field"><label htmlFor="seg">Número de seguimiento</label>
          <input id="seg" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SEG-XXXXXX" autoComplete="off" /></div>
        <button className="btn primary" type="submit">Consultar</button>
      </form>
      {err && <div className="err" role="alert">{err}</div>}
      {res && <dl className="kv" aria-live="polite">
        <dt>Estado</dt><dd><strong>{res.estado}</strong></dd><dt>Ingreso</dt><dd>{fmt(res.ingresoEn)}</dd>
        <dt>¿Fue revisada?</dt><dd>{res.revisada ? 'Sí' : 'Todavía no'}</dd>
        <dt>¿Piden más información?</dt><dd>{res.infoAdicionalSolicitada ? 'Sí' : 'No'}</dd>
        <dt>¿Fue derivada?</dt><dd>{res.derivada ? `Sí, a: ${res.organismoReceptor}` : 'No'}</dd>
        <dt>Próximos pasos</dt><dd>{res.proximosPasos}</dd></dl>}
    </div>
  );
}

function Interview({ session, def, initial, onDone, onExit }) {
  const [answers, setAnswers] = useState(initial.answers || {});
  const [pos, setPos] = useState(0);
  const [errors, setErrors] = useState('');
  const [showEm, setShowEm] = useState(false);
  const [emAck, setEmAck] = useState(false);
  const [review, setReview] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const head = useRef(null);

  useEffect(() => { // viene del asistente conversacional: ir directo a la revisión
    if (!initial.reviewNow) return;
    setBusy(true);
    api('/legajo/vista-previa', { method: 'POST', token: session.token, body: { answers } }).then(setReview).catch((e) => setErrors(e.message)).finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = def.steps.filter((s) => isVisible(s, answers));
  const step = steps[Math.min(pos, steps.length - 1)];
  const at = step.fields || [step];
  useEffect(() => { head.current?.focus(); }, [pos, review]);

  const save = useCallback(async (a, p) => { try { await api('/borrador', { method: 'PUT', token: session.token, body: { answers: a, paso: p } }); setSaved(true); } catch { /* borrador es opcional */ } }, [session.token]);

  const set = (id, v) => { setErrors(''); setSaved(false); setAnswers((a) => ({ ...a, [id]: v })); };
  const toggle = (s, v) => {
    const cur = answers[s.id] || [];
    const opt = s.options.find((o) => o.value === v);
    let next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (!cur.includes(v)) next = opt.exclusive ? [v] : next.filter((x) => !s.options.find((o) => o.value === x)?.exclusive);
    set(s.id, next);
  };
  const empty = (v) => v === undefined || v === '' || (Array.isArray(v) && !v.length);

  const next = async () => {
    const falta = at.find((a) => a.required && empty(answers[a.id]));
    if (falta) { setErrors(step.fields ? `Falta completar: ${falta.label}` : 'Falta responder esta pregunta para poder seguir.'); return; }
    if (step.emergencyOn?.includes(answers[step.id]) && !emAck) { setShowEm(true); setEmAck(true); return; }
    await save(answers, pos + 1);
    if (pos + 1 >= steps.length) { setBusy(true); try { setReview(await api('/legajo/vista-previa', { method: 'POST', token: session.token, body: { answers } })); } catch (e) { setErrors(e.message); } setBusy(false); }
    else { setShowEm(false); setEmAck(false); setPos(pos + 1); }
  };
  const back = () => { setErrors(''); setShowEm(false); if (review) { setReview(null); } else setPos(Math.max(0, pos - 1)); };
  const editFrom = (stepId) => { const i = steps.findIndex((s) => s.id === stepId); setReview(null); setPos(Math.max(0, i)); };
  const exitSave = async () => { await save(answers, pos); onExit(); };
  const submit = async () => {
    setBusy(true); setErrors('');
    try { onDone(await api('/presentaciones', { method: 'POST', token: session.token, body: { answers, consentimiento: true } })); }
    catch (e) { setErrors(e.message); } finally { setBusy(false); }
  };

  const toolbar = (
    <div className="utility">
      <button className="btn alert" onClick={() => setShowEm(true)}>Necesito ayuda ahora</button>
      <button className="btn secondary" onClick={exitSave}>Guardar y salir</button>
      <button className="btn secondary" onClick={async () => { await api('/borrador', { method: 'DELETE', token: session.token }).catch(() => {}); onExit(true); }}>Abandonar y borrar</button>
    </div>
  );

  if (review) {
    return (<div>
      <h2 ref={head} tabIndex={-1}>Revisá tu legajo</h2>
      <p className="small">Así quedó ordenada tu consulta. Podés corregir cualquier respuesta antes de enviarla.</p>
      <div className="summary"><p><strong>{review.resumen}</strong></p>
        <div><Pill tone={prioTone(review.prioridad.key)}>Prioridad de revisión: {review.prioridad.label}</Pill>{review.indicadores.map((i) => <Pill key={i.id} tone="orange">{i.label}</Pill>)}</div>
        <dl className="kv">{review.secciones.map((s) => (<div className="row" key={s.stepId}><dt>{s.pregunta}</dt><dd>{s.respuesta} <button className="link" onClick={() => editFrom(s.stepId)} aria-label={`Corregir: ${s.pregunta}`}>Corregir</button></dd></div>))}</dl>
        <p className="small">Derivación sugerida (la confirma una persona del equipo): <strong>{review.derivacion.sugerido}</strong></p>
      </div>
      <div className="notice"><strong>Aviso de privacidad.</strong> Enviamos solo lo que respondiste, sin DNI ni domicilio. En este prototipo los datos son ficticios y se borran del servidor demo cuando se reinicia. Podés pedir corregir o borrar tu consulta.</div>
      <label className="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> <span>Entiendo que es una simulación y acepto el aviso de privacidad.</span></label>
      {errors && <div className="err" role="alert">{errors}</div>}
      <div className="nav"><button className="btn secondary" onClick={back}>Volver</button>
        <button className="btn primary" disabled={!consent || busy} onClick={submit}>{busy ? 'Enviando…' : 'Enviar consulta (simulada)'}</button></div>
      {toolbar}</div>);
  }

  const v = answers[step.id];
  const mustAnswer = at.some((a) => a.required);
  const anyAnswer = at.some((a) => !empty(answers[a.id]));
  return (
    <div>
      <div className="progress" aria-hidden="true"><div style={{ width: `${(pos / steps.length) * 100}%` }} /></div>
      <p className="small" aria-live="polite">{step.etapa} · Pregunta {pos + 1} de {steps.length} {saved && ' · Borrador guardado'}</p>
      {(showEm) && <Emergency data={def.emergencia} onContinue={() => setShowEm(false)} />}
      <fieldset className="q">
        <legend><h2 ref={head} tabIndex={-1}>{step.label}</h2></legend>
        {step.ayuda && <p className="small" id="ayuda">{step.ayuda}</p>}
        {step.fields && step.fields.map((f) => (
          <div className="field" key={f.id}><label htmlFor={f.id}>{f.label}{f.required ? ' *' : ''}</label>
            {f.type === 'select'
              ? <select id={f.id} value={answers[f.id] || ''} onChange={(e) => set(f.id, e.target.value)}><option value="">Elegí una opción…</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              : <input id={f.id} className="txt" maxLength={f.maxLength} value={answers[f.id] || ''} onChange={(e) => set(f.id, e.target.value)} />}</div>))}
        {step.type === 'single' && step.options.map((o) => (
          <label key={o.value} className={'choice' + (v === o.value ? ' on' : '') + (o.disabled ? ' off' : '')}><input type="radio" name={step.id} disabled={o.disabled} checked={v === o.value} onChange={() => { set(step.id, o.value); setShowEm(false); setEmAck(false); }} /> <span>{o.label}</span></label>))}
        {step.type === 'multi' && step.options.map((o) => (
          <label key={o.value} className={'choice' + (v?.includes(o.value) ? ' on' : '')}><input type="checkbox" checked={!!v?.includes(o.value)} onChange={() => toggle(step, o.value)} /> <span>{o.label}</span></label>))}
        {step.type === 'text' && <input className="txt" aria-describedby="ayuda" maxLength={step.maxLength} value={v || ''} onChange={(e) => set(step.id, e.target.value)} />}
        {step.type === 'textarea' && <><textarea className="txt" aria-describedby="ayuda" rows={6} maxLength={step.maxLength} value={v || ''} onChange={(e) => set(step.id, e.target.value)} /><div className="small">{(v || '').length}/{step.maxLength}</div></>}
      </fieldset>
      {errors && <div className="err" role="alert">{errors}</div>}
      <div className="nav"><button className="btn secondary" onClick={back} disabled={pos === 0}>Atrás</button>
        <button className="btn primary" onClick={next} disabled={busy}>{pos + 1 >= steps.length ? 'Revisar mi legajo' : mustAnswer || anyAnswer ? 'Continuar' : 'Saltar esta pregunta'}</button></div>
      {toolbar}
    </div>
  );
}

export default function Citizen({ prefill, onConsumed }) {
  const [def, setDef] = useState(null);
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('home'); // home | interview | done | exited
  const [done, setDone] = useState(null);
  const [resume, setResume] = useState('');
  const [err, setErr] = useState('');
  const [exitCode, setExitCode] = useState('');

  useEffect(() => { api('/entrevista').then(setDef).catch((e) => setErr(e.message)); }, []);
  const enter = async (codigo, answers) => {
    setErr('');
    try {
      const s = await api('/auth/ciudadania', { method: 'POST', body: codigo ? { codigo } : {} });
      setSession(answers ? { ...s, borrador: { ...(s.borrador || {}), answers, reviewNow: true } } : s); setMode('interview');
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { // respuestas que llegan desde el asistente conversacional
    if (def && prefill) { enter(null, prefill); onConsumed?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def]);

  if (!def) return <div role="status">{err ? <div className="err">{err}</div> : 'Cargando…'}</div>;

  if (mode === 'interview')
    return <Interview session={session} def={def} initial={session.borrador} onDone={(r) => { setDone(r); setMode('done'); }}
      onExit={(deleted) => { setExitCode(deleted ? '' : session.codigo); setMode('exited'); }} />;

  if (mode === 'exited') return (
    <div className="card"><h2 tabIndex={-1} ref={(e) => e?.focus()}>{exitCode ? 'Guardamos tu borrador' : 'Borramos tu borrador'}</h2>
      {exitCode ? <><p>Para seguir más tarde, anotá este código:</p><p className="bigcode">{exitCode}</p><p className="small">No guardamos tu nombre ni tu DNI. Sin este código no se puede recuperar el borrador.</p></> : <p>No quedó nada guardado.</p>}
      <button className="btn primary" onClick={() => setMode('home')}>Volver al inicio</button></div>);

  if (mode === 'done') return (
    <div><div className="success" role="status"><h2 tabIndex={-1} ref={(e) => e?.focus()} style={{ marginTop: 0 }}>Tu consulta (simulada) fue recibida</h2>
      <p>Tu número de seguimiento es:</p><p className="bigcode">{done.codigoSeguimiento}</p><p>Anotalo o sacale una captura: lo vas a necesitar para ver cómo sigue.</p></div>
      <div className="card"><h3>Qué pasa ahora</h3><ol><li>Una persona del equipo revisa tu consulta.</li><li>Puede pedirte más información, orientarte o derivarla al lugar que corresponde.</li><li>Con tu número podés ver el estado cuando quieras.</li></ol>
        <p className="small">{done.legajo.resumen}</p></div>
      <Tracking /><button className="btn secondary" onClick={() => setMode('home')}>Volver al inicio</button></div>);

  return (
    <div>
      <h2>Denuncia por violencia familiar o de género</h2>
      <div className="notice"><strong>Antes de empezar:</strong> no hace falta que sepas de leyes. El DNI es opcional. Podés frenar cuando quieras y retomar con un código. Esta es una simulación: no uses datos reales.</div>
      <div className="grid">
        <div className="card"><h3>Empezar una consulta</h3><p>Son preguntas simples, una por vez.</p><button className="btn primary" onClick={() => enter()}>Empezar</button></div>
        <div className="card"><h3>Retomar un borrador</h3>
          <div className="field"><label htmlFor="cod">Tu código</label><input id="cod" value={resume} onChange={(e) => setResume(e.target.value)} placeholder="PC-XXXXXX" autoComplete="off" /></div>
          <button className="btn secondary" onClick={() => enter(resume)} disabled={!resume.trim()}>Retomar</button></div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <Emergency data={def.emergencia} />
      <Tracking />
    </div>
  );
}
