import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { Pill, prioTone, fmt } from './ui.jsx';

function Bars({ title, items }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (<div className="card"><h3>{title}</h3>{items.length ? <ul className="bars">{items.map((i) => (
    <li key={i.label}><span>{i.label}</span><div className="bar" aria-hidden="true"><div style={{ width: `${(i.n / max) * 100}%` }} /></div><strong>{i.n}</strong></li>))}</ul> : <p className="small">Sin datos.</p>}</div>);
}
const Block = ({ title, rows, children }) => (
  <div className="blk"><div className="section-title">{title}</div>
    {rows && (rows.length ? <dl className="kv">{rows.map((r) => <div className="row" key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}</dl> : <p className="small">Sin datos.</p>)}{children}</div>
);

function Detail({ id, token, cat, onChanged }) {
  const [l, setL] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [f, setF] = useState({ tipo: '', fundamento: '', organismoId: '', proximaActuacion: '', observaciones: '', mensajePersona: '' });
  const [estado, setEstado] = useState('');
  useEffect(() => { setOk(''); setErr(''); api(`/legajos/${id}`, { token }).then((x) => {
    setL(x); setEstado(x.estado);
    setF({ tipo: x.resultado?.tipo || '', fundamento: x.resultado?.fundamento || '', organismoId: x.resultado?.organismoId || x.derivacion.sugeridoId, proximaActuacion: x.resultado?.proximaActuacion || '', observaciones: x.resultado?.observaciones || '', mensajePersona: x.resultado?.mensajePersona || '' });
  }).catch((e) => setErr(e.message)); }, [id, token]);
  if (!l) return err ? <div className="err" role="alert">{err}</div> : null;
  const save = async (body, msg) => { setErr(''); setOk('');
    try { const r = await api(`/legajos/${id}`, { method: 'PATCH', token, body }); setL(r); setEstado(r.estado); setOk(msg); onChanged(); }
    catch (e) { setErr(e.message + (e.detalles ? ' ' + e.detalles.map((d) => d.mensaje).join(' ') : '')); } };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const d = l.derivacion;
  const org = cat.organismos.find((o) => o.id === f.organismoId);

  return (
    <div className="card detail" id="detalle-legajo" tabIndex={-1} aria-live="polite">
      <div className="detail-head"><div><span className="eyebrow">{l.id} · {l.origen === 'demo' ? 'Caso ficticio de demostración' : 'Generado en pruebas'} · Ingreso {fmt(l.creadoEn)}</span><h3>{l.entradaLabel}</h3></div>
        <span className="status-chip">{cat.estados[l.estado].label}</span></div>
      <p>{l.resumen}</p>

      <Block title="Prioridad de revisión">
        <Pill tone={prioTone(l.prioridad.key)}>{l.prioridad.label}</Pill>{l.indicadores.map((i) => <Pill key={i.id} tone="orange">{i.label}</Pill>)}
        {!l.indicadores.length && <span className="small"> Sin indicadores destacados.</span>}
        <div className="warning">La prioridad solo ordena la revisión según indicadores concretos; no es un puntaje ni una evaluación de riesgo.</div>
      </Block>

      <Block title="Datos básicos" rows={l.bloques.datosBasicos} />
      <Block title="Situación informada" rows={l.bloques.situacion}>
        <div className="small">Relato original (se conserva tal como fue escrito)</div>
        <div className="relato">{l.relato || 'Sin relato libre. La información se obtuvo con preguntas guiadas.'}</div>
      </Block>
      <Block title="Medidas solicitadas">
        {l.medidas.length ? <div>{l.medidas.map((m) => <Pill key={m}>{m}</Pill>)}</div> : <p className="small">No solicitó medidas por ahora.</p>}
        <div className="small">El sistema no concede medidas: las evalúa el juzgado.</div>
      </Block>
      <Block title="Datos para notificación" rows={l.bloques.notificacion} />

      <Block title="Derivación">
        <div className="derivation-box"><div><strong>Juzgado sugerido · validación pendiente del operador</strong><div className="derivation-court">{d.sugerido}</div><div className="small">{d.motivo}</div></div>
          <div><strong>Fecha de ingreso y juzgado de turno</strong><div>{fmt(d.fechaIngreso)}</div><div>{d.turno}</div></div>
          <div><strong>Antecedente judicial</strong><div>{d.antecedente.existe === 'si' ? `Sí${d.antecedente.juzgadoPrevio ? ` · ${d.antecedente.juzgadoPrevio}` : ''}` : d.antecedente.existe === 'no' ? 'No' : 'No se sabe'}</div>
            {d.antecedente.expediente && <div className="small">Expte.: {d.antecedente.expediente}</div>}
            <div className="small">Posible prevención/conexidad: {d.posiblePrevencion ? 'sí, verificar' : 'no informada'}</div></div></div>
        {d.requiereVerificar && <div className="notice"><strong>Atención:</strong> se informó una causa previa sin identificar el juzgado. Verificar prevención/conexidad antes de derivar.</div>}
      </Block>

      <Block title="Responsable">
        <div className="small">Al asignar, se registra en el historial y se prepara un correo institucional (simulado) con el resumen.</div>
        <div className="assignee-tabs">{cat.responsables.map((n) => <button key={n} className={'assignee-tab' + (l.responsable === n ? ' active' : '')} onClick={() => save({ responsable: n }, `Asignado a ${n}. Correo preparado.`)}>{n}</button>)}</div>
        {l.responsable ? <p>Responsable actual: <strong>{l.responsable}</strong></p> : <p className="small">Todavía no hay responsable asignado.</p>}
        {l.correo && <div className="mailcard"><div className="small">Correo institucional simulado · Preparado</div><strong>{l.correo.asunto}</strong>{'\n'}Para: {l.correo.para}{'\n\n'}{l.correo.cuerpo}</div>}
      </Block>

      <Block title="Estado y resultado de la evaluación humana">
        <div className="form2">
          <div className="field"><label htmlFor="est">Estado de la tarea</label><select id="est" value={estado} onChange={(e) => setEstado(e.target.value)}>
            {Object.entries(cat.estados).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div className="field"><button className="btn secondary" onClick={() => save({ estado }, 'Estado guardado.')}>Guardar estado</button></div></div>
        <div className="form2">
          <div className="field"><label htmlFor="tipo">Resultado</label><select id="tipo" value={f.tipo} onChange={set('tipo')}><option value="">Elegí un resultado…</option>
            {Object.entries(cat.resultados).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          {f.tipo === 'derivacion' && <div className="field"><label htmlFor="org">Organismo receptor</label><select id="org" value={f.organismoId} onChange={set('organismoId')}>
            {cat.organismos.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select>{org && <div className="small">{org.tipo} · {org.horario}</div>}</div>}
        </div>
        <div className="field"><label htmlFor="fun">Fundamento (obligatorio)</label><textarea id="fun" className="txt" rows={3} value={f.fundamento} onChange={set('fundamento')} /></div>
        <div className="field"><label htmlFor="pa">Próxima actuación</label><input id="pa" className="txt" value={f.proximaActuacion} onChange={set('proximaActuacion')} /></div>
        <div className="field"><label htmlFor="mp">Mensaje para la persona (lo verá en el seguimiento; lenguaje claro)</label><input id="mp" className="txt" value={f.mensajePersona} onChange={set('mensajePersona')} /></div>
        <div className="field"><label htmlFor="ob">Observaciones internas</label><textarea id="ob" className="txt" rows={2} value={f.observaciones} onChange={set('observaciones')} /></div>
        <button className="btn primary" disabled={!f.tipo} onClick={() => save({ resultado: f }, 'Resultado registrado.')}>Confirmar resultado y derivación</button>
      </Block>
      {err && <div className="err" role="alert">{err}</div>}{ok && <div className="success" role="status">{ok}</div>}
      <Block title="Historial de movimientos"><ul className="hist">{l.historial.map((h, i) => <li key={i}><span className="small">{fmt(h.en)}</span> · {h.quien} — {h.accion}</li>)}</ul></Block>
    </div>);
}

const EMPTY = { q: '', desde: '', hasta: '', entrada: '', prioridad: '', estado: '', responsable: '', organismo: '', origen: '' };
export default function Staff() {
  const [auth, setAuth] = useState(null); const [cred, setCred] = useState({ usuario: '', clave: '' }); const [err, setErr] = useState('');
  const [cat, setCat] = useState(null); const [rows, setRows] = useState([]); const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState(EMPTY); const [sel, setSel] = useState(null); const [tab, setTab] = useState('bandeja');

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
      <div className="operator-toolbar"><div><h2 style={{ margin: 0 }}>Bandeja del operador/a</h2><div className="small">Legajos ficticios · violencia familiar y de género · la derivación requiere validación humana.</div></div>
        <button className="btn secondary" onClick={() => { setAuth(null); setSel(null); }}>Cerrar sesión</button></div>
      <div className="subtabs" role="tablist">{['bandeja', 'estadisticas'].map((t) => <button key={t} role="tab" aria-selected={tab === t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{t === 'bandeja' ? 'Bandeja' : 'Estadísticas'}</button>)}</div>
      {stats && <div className="metrics"><div className="metric"><span className="small">Total</span><strong>{stats.total}</strong></div><div className="metric"><span className="small">Con prioridad</span><strong>{stats.urgentes}</strong></div><div className="metric"><span className="small">Con antecedente</span><strong>{stats.conAntecedente}</strong></div><div className="metric"><span className="small">Pendientes</span><strong>{stats.pendientes}</strong></div></div>}
      {err && <div className="err" role="alert">{err}</div>}
      {tab === 'estadisticas' && stats && <div className="grid"><Bars title="Tipo de ingreso" items={stats.porIngreso} /><Bars title="Tipos de violencia / pedido" items={stats.porTipo} /><Bars title="Medidas solicitadas" items={stats.medidas} /><Bars title="Prioridad de revisión" items={stats.porPrioridad} /><Bars title="Juzgado sugerido" items={stats.porJuzgado} /><Bars title="Estados" items={stats.porEstado} /><Bars title="Derivaciones por organismo" items={stats.derivaciones} /><Bars title="Barreras de acceso informadas" items={stats.barreras} />
        <div className="card"><h3>Georreferenciación (concepto futuro)</h3><p className="small">Etapa futura: mapa agregado por zona, sin datos personales ni información identificable. No implementado.</p></div></div>}
      {tab === 'bandeja' && cat && <>
        <div className="filters">
          <div><label htmlFor="f-q">Buscar (ID o seguimiento)</label><input {...F('q')} /></div>
          <div><label htmlFor="f-desde">Desde</label><input type="date" {...F('desde')} /></div>
          <div><label htmlFor="f-hasta">Hasta</label><input type="date" {...F('hasta')} /></div>
          <div><label htmlFor="f-entrada">Tipo de ingreso</label><select {...F('entrada')}><option value="">Todos</option><option value="nueva">Denuncia nueva</option><option value="existente">Causa existente</option></select></div>
          <div><label htmlFor="f-prioridad">Prioridad</label><select {...F('prioridad')}><option value="">Todas</option><option value="inmediata">Inmediata</option><option value="prioritaria">Prioritaria</option><option value="ordinaria">Ordinaria</option></select></div>
          <div><label htmlFor="f-estado">Estado</label><select {...F('estado')}><option value="">Todos</option>{Object.entries(cat.estados).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label htmlFor="f-responsable">Responsable</label><select {...F('responsable')}><option value="">Todos</option><option value="__none">Sin asignar</option>{cat.responsables.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label htmlFor="f-organismo">Juzgado / organismo</label><select {...F('organismo')}><option value="">Todos</option>{cat.organismos.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></div>
          <div><label htmlFor="f-origen">Origen</label><select {...F('origen')}><option value="">Todos</option><option value="demo">Casos de demostración</option><option value="prueba">Generados en pruebas</option></select></div>
          <button className="btn secondary" onClick={() => setFilters(EMPTY)}>Limpiar</button>
        </div>
        <div className="tablewrap"><table><caption className="sr">Legajos recibidos</caption><thead><tr><th>Fecha</th><th>ID</th><th>Ingreso</th><th>Prioridad</th><th>Tipos de violencia</th><th>Medidas</th><th>Antecedente</th><th>Juzgado sugerido</th><th>Responsable</th><th>Estado</th><th><span className="sr">Acción</span></th></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan="11" className="small">No hay legajos con esos filtros.</td></tr>}
            {rows.map((r) => <tr key={r.id} className={sel === r.id ? 'sel' : ''}><td>{fmt(r.creadoEn)}</td><td>{r.id}{r.origen === 'demo' && <div className="small">demo</div>}</td><td>{r.entradaLabel}</td>
              <td><Pill tone={prioTone(r.prioridad.key)}>{r.prioridad.label}</Pill></td><td className="small">{r.tipos.join(', ') || '—'}</td><td className="small">{r.medidas.length ? r.medidas.join(', ') : '—'}</td><td>{r.antecedente ? 'Sí' : 'No'}</td>
              <td className="small">{r.juzgado}</td><td>{r.responsable || <span className="small">Sin asignar</span>}</td><td>{r.estadoLabel}</td>
              <td><button className="btn compact" onClick={() => { setSel(r.id); setTimeout(() => { const el = document.getElementById('detalle-legajo'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.focus({ preventScroll: true }); } }, 350); }} aria-label={`Abrir legajo ${r.id}`}>Abrir</button></td></tr>)}</tbody></table></div>
        {sel && <Detail id={sel} token={auth.token} cat={cat} onChanged={load} />}</>}
    </div>);
}
