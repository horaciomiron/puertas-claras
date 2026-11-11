import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { Pill, prioTone, fmt } from './ui.jsx';

function Bars({ title, items }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (<div className="card"><h3>{title}</h3>{items.length ? <ul className="bars">{items.map((i) => (
    <li key={i.label}><span>{i.label}</span><div className="bar" aria-hidden="true"><div style={{ width: `${(i.n / max) * 100}%` }} /></div><strong>{i.n}</strong></li>))}</ul> : <p className="small">Sin datos.</p>}</div>);
}

function Detail({ id, token, cat, onChanged }) {
  const [l, setL] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [f, setF] = useState({ tipo: '', fundamento: '', organismoId: '', proximaActuacion: '', observaciones: '', mensajePersona: '' });
  const [resp, setResp] = useState(''); const [estado, setEstado] = useState('');
  useEffect(() => { setOk(''); setErr(''); api(`/legajos/${id}`, { token }).then((x) => {
    setL(x); setResp(x.responsable || ''); setEstado(x.estado);
    setF({ tipo: x.resultado?.tipo || '', fundamento: x.resultado?.fundamento || '', organismoId: x.resultado?.organismoId || x.derivacionSugerida.organismoId, proximaActuacion: x.resultado?.proximaActuacion || '', observaciones: x.resultado?.observaciones || '', mensajePersona: x.resultado?.mensajePersona || '' });
  }).catch((e) => setErr(e.message)); }, [id, token]);
  if (!l) return err ? <div className="err" role="alert">{err}</div> : null;
  const save = async (body, msg) => { setErr(''); setOk('');
    try { const r = await api(`/legajos/${id}`, { method: 'PATCH', token, body }); setL(r); setEstado(r.estado); setOk(msg); onChanged(); }
    catch (e) { setErr(e.message + (e.detalles ? ' ' + e.detalles.map((d) => d.mensaje).join(' ') : '')); } };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const org = (oid) => cat.organismos.find((o) => o.id === oid);

  return (
    <div className="card detail" aria-live="polite">
      <div className="detail-head"><div><span className="eyebrow">{l.id} · {l.origen === 'demo' ? 'Caso ficticio de demostración' : 'Generado en pruebas'}</span><h3>{l.materia.label}</h3></div>
        <span className="status-chip">{cat.estados[l.estado].label}</span></div>
      <p>{l.resumen}</p>
      <div><Pill tone={prioTone(l.prioridad.key)}>Prioridad de revisión: {l.prioridad.label}</Pill>{l.indicadores.map((i) => <Pill key={i.id} tone="orange">{i.label}</Pill>)}</div>
      <div className="warning">La prioridad solo ordena la revisión; no es una evaluación de riesgo ni una decisión jurídica. {cat.aviso}</div>
      <div className="derivation-box"><div><strong>Derivación sugerida (requiere validación humana)</strong><div className="derivation-court">{l.derivacionSugerida.nombre}</div><div className="small">{l.derivacionSugerida.motivo}</div></div>
        <div><strong>Antecedentes</strong><div>{l.answers.antecedentes === 'causa' ? `Causa informada ${l.answers.expediente || ''}` : l.answers.antecedentes}</div></div>
        <div><strong>Barreras de acceso</strong><div>{l.barreras.join(', ') || '—'}</div></div></div>
      <div className="section-title">Respuestas de la persona</div>
      <dl className="kv">{l.secciones.map((s) => <div className="row" key={s.stepId}><dt>{s.pregunta}</dt><dd>{s.respuesta}</dd></div>)}</dl>

      <div className="section-title">Gestión del operador/a</div>
      <div className="form2">
        <div className="field"><label htmlFor="resp">Responsable</label><select id="resp" value={resp} onChange={(e) => setResp(e.target.value)}>
          <option value="">Sin asignar</option>{cat.responsables.map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="field"><label htmlFor="est">Estado</label><select id="est" value={estado} onChange={(e) => setEstado(e.target.value)}>
          {Object.entries(cat.estados).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div className="field"><button className="btn secondary" onClick={() => save({ responsable: resp, estado }, 'Estado y responsable guardados.')}>Guardar estado y responsable</button></div>
      </div>
      <h4>Registrar resultado de la evaluación humana</h4>
      <div className="form2">
        <div className="field"><label htmlFor="tipo">Resultado</label><select id="tipo" value={f.tipo} onChange={set('tipo')}><option value="">Elegí un resultado…</option>
          {Object.entries(cat.resultados).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        {f.tipo === 'derivacion' && <div className="field"><label htmlFor="org">Organismo receptor</label><select id="org" value={f.organismoId} onChange={set('organismoId')}>
          {cat.organismos.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select>{org(f.organismoId) && <div className="small">{org(f.organismoId).tipo} · {org(f.organismoId).horario}</div>}</div>}
      </div>
      <div className="field"><label htmlFor="fun">Fundamento (obligatorio)</label><textarea id="fun" className="txt" rows={3} value={f.fundamento} onChange={set('fundamento')} /></div>
      <div className="field"><label htmlFor="pa">Próxima actuación</label><input id="pa" className="txt" value={f.proximaActuacion} onChange={set('proximaActuacion')} /></div>
      <div className="field"><label htmlFor="mp">Mensaje para la persona (lo verá en el seguimiento; lenguaje claro)</label><input id="mp" className="txt" value={f.mensajePersona} onChange={set('mensajePersona')} /></div>
      <div className="field"><label htmlFor="ob">Observaciones internas</label><textarea id="ob" className="txt" rows={2} value={f.observaciones} onChange={set('observaciones')} /></div>
      <button className="btn primary" disabled={!f.tipo} onClick={() => save({ resultado: f, responsable: resp || undefined }, 'Resultado registrado.')}>Confirmar resultado</button>
      {err && <div className="err" role="alert">{err}</div>}{ok && <div className="success" role="status">{ok}</div>}
      <div className="section-title">Historial</div>
      <ul className="hist">{l.historial.map((h, i) => <li key={i}><span className="small">{fmt(h.en)}</span> · {h.quien} — {h.accion}</li>)}</ul>
    </div>);
}

export default function Staff() {
  const [auth, setAuth] = useState(null); const [cred, setCred] = useState({ usuario: '', clave: '' }); const [err, setErr] = useState('');
  const [cat, setCat] = useState(null); const [rows, setRows] = useState([]); const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ q: '', desde: '', hasta: '', materia: '', prioridad: '', estado: '', responsable: '', organismo: '', origen: '' });
  const [sel, setSel] = useState(null); const [tab, setTab] = useState('bandeja');

  const load = useCallback(async () => {
    if (!auth) return;
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    try { const [r, s] = await Promise.all([api(`/legajos?${qs}`, { token: auth.token }), api('/estadisticas', { token: auth.token })]); setRows(r); setStats(s); }
    catch (e) { setErr(e.message); if (e.status === 401) setAuth(null); }
  }, [auth, filters]);
  useEffect(() => { load(); }, [load]);

  const login = async (e) => { e.preventDefault(); setErr('');
    try { const a = await api('/auth/operador', { method: 'POST', body: cred }); setAuth(a); setCat(await api('/catalogos', { token: a.token })); }
    catch (x) { setErr(x.message); } };

  if (!auth) return (
    <div className="login-wrap"><form className="login-card" onSubmit={login}>
      <h2 style={{ marginTop: 0 }}>Ingreso de operador/a</h2>
      <div className="warning"><strong>Autenticación provisoria de demostración.</strong> No es seguridad real: no usar credenciales ni datos reales. Usuario de prueba: <code>operador.demo</code> · clave: <code>demo-2026</code></div>
      <div className="field"><label htmlFor="u">Usuario</label><input id="u" autoComplete="username" value={cred.usuario} onChange={(e) => setCred({ ...cred, usuario: e.target.value })} /></div>
      <div className="field"><label htmlFor="p">Clave</label><input id="p" type="password" autoComplete="current-password" value={cred.clave} onChange={(e) => setCred({ ...cred, clave: e.target.value })} /></div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn primary" type="submit" style={{ width: '100%' }}>Ingresar a la bandeja</button></form></div>);

  const F = (k) => ({ id: 'f-' + k, value: filters[k], onChange: (e) => setFilters({ ...filters, [k]: e.target.value }) });
  return (
    <div>
      <div className="operator-toolbar"><div><h2 style={{ margin: 0 }}>Bandeja del operador/a</h2><div className="small">Legajos ficticios · revisión, priorización y derivación con validación humana.</div></div>
        <button className="btn secondary" onClick={() => { setAuth(null); setSel(null); }}>Cerrar sesión</button></div>
      <div className="subtabs" role="tablist">{['bandeja', 'estadisticas'].map((t) => <button key={t} role="tab" aria-selected={tab === t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{t === 'bandeja' ? 'Bandeja' : 'Estadísticas'}</button>)}</div>
      {stats && <div className="metrics"><div className="metric"><span className="small">Total</span><strong>{stats.total}</strong></div><div className="metric"><span className="small">Con prioridad</span><strong>{stats.urgentes}</strong></div><div className="metric"><span className="small">Pendientes</span><strong>{stats.pendientes}</strong></div><div className="metric"><span className="small">Resp. promedio (h)</span><strong>{stats.tiempoRespuestaHoras ?? '—'}</strong></div></div>}
      {err && <div className="err" role="alert">{err}</div>}
      {tab === 'estadisticas' && stats && <div className="grid"><Bars title="Materias más frecuentes" items={stats.porMateria} /><Bars title="Estados" items={stats.porEstado} /><Bars title="Necesidades detectadas" items={stats.necesidades} /><Bars title="Barreras de acceso informadas" items={stats.barreras} /><Bars title="Derivaciones por organismo" items={stats.derivaciones} /><Bars title="Prioridad de revisión" items={stats.porPrioridad} />
        <div className="card"><h3>Georreferenciación (concepto futuro)</h3><p className="small">Etapa futura: mapa agregado de necesidades jurídicas por zona, sin datos personales ni información identificable. No implementado en esta versión.</p></div></div>}
      {tab === 'bandeja' && cat && <>
        <div className="filters">
          <div><label htmlFor="f-q">Buscar (ID o seguimiento)</label><input {...F('q')} /></div>
          <div><label htmlFor="f-desde">Desde</label><input type="date" {...F('desde')} /></div>
          <div><label htmlFor="f-hasta">Hasta</label><input type="date" {...F('hasta')} /></div>
          <div><label htmlFor="f-materia">Materia</label><select {...F('materia')}><option value="">Todas</option>{cat.materias.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          <div><label htmlFor="f-prioridad">Prioridad</label><select {...F('prioridad')}><option value="">Todas</option><option value="inmediata">Inmediata</option><option value="prioritaria">Prioritaria</option><option value="ordinaria">Ordinaria</option></select></div>
          <div><label htmlFor="f-estado">Estado</label><select {...F('estado')}><option value="">Todos</option>{Object.entries(cat.estados).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label htmlFor="f-responsable">Responsable</label><select {...F('responsable')}><option value="">Todos</option><option value="__none">Sin asignar</option>{cat.responsables.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label htmlFor="f-organismo">Organismo</label><select {...F('organismo')}><option value="">Todos</option>{cat.organismos.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></div>
          <div><label htmlFor="f-origen">Origen</label><select {...F('origen')}><option value="">Todos</option><option value="demo">Casos de demostración</option><option value="prueba">Generados en pruebas</option></select></div>
          <button className="btn secondary" onClick={() => setFilters({ q: '', desde: '', hasta: '', materia: '', prioridad: '', estado: '', responsable: '', organismo: '', origen: '' })}>Limpiar</button>
        </div>
        <div className="tablewrap"><table><caption className="sr">Legajos recibidos</caption><thead><tr><th>Fecha</th><th>ID</th><th>Materia</th><th>Prioridad</th><th>Indicadores</th><th>Estado</th><th>Derivación propuesta</th><th>Responsable</th><th><span className="sr">Acción</span></th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan="9" className="small">No hay legajos con esos filtros.</td></tr>}
            {rows.map((r) => <tr key={r.id} className={sel === r.id ? 'sel' : ''}><td>{fmt(r.creadoEn)}</td><td>{r.id}{r.origen === 'demo' && <div className="small">demo</div>}</td><td>{r.materia.label}</td>
              <td><Pill tone={prioTone(r.prioridad.key)}>{r.prioridad.label}</Pill></td><td>{r.indicadores.length}</td><td>{r.estadoLabel}</td><td className="small">{r.derivacion}</td><td>{r.responsable || <span className="small">Sin asignar</span>}</td>
              <td><button className="btn compact" onClick={() => setSel(r.id)} aria-label={`Abrir legajo ${r.id}`}>Abrir</button></td></tr>)}</tbody></table></div>
        {sel && <Detail id={sel} token={auth.token} cat={cat} onChanged={load} />}</>}
    </div>);
}
