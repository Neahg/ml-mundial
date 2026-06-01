import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  AreaChart, Area
} from 'recharts';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS
════════════════════════════════════════════════════════════ */
const T = {
  bg:        '#060811',
  bg1:       '#0b1120',
  bg2:       '#0f1a2e',
  panel:     '#0d1526',
  border:    '#162038',
  borderHi:  '#1e3a6e',
  text:      '#e8edf5',
  muted:     '#4a6080',
  dim:       '#2a3f5f',
  gold:      '#f0b429',
  goldDim:   '#7a5a12',
  cyan:      '#00d4ff',
  cyanDim:   '#003a4a',
  green:     '#00e676',
  greenDim:  '#003318',
  red:       '#ff4d6d',
  redDim:    '#3d0012',
  white:     '#ffffff',
  fontDisplay: "'Bebas Neue', sans-serif",
  fontBody:    "'DM Sans', sans-serif",
  fontMono:    "'DM Mono', monospace",
};

/* ════════════════════════════════════════════════════════════
   GLOBAL CSS (injected once)
════════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@keyframes fadeUp   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes pulse    { 0%,100% { opacity:1 } 50% { opacity:.4 } }
@keyframes spin     { to { transform: rotate(360deg) } }
@keyframes shimmer  { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
@keyframes scanline { 0% { top: -10% } 100% { top: 110% } }
@keyframes glow     { 0%,100% { box-shadow: 0 0 6px #00d4ff44 } 50% { box-shadow: 0 0 18px #00d4ff88, 0 0 36px #00d4ff33 } }
@keyframes barGrow  { from { transform: scaleX(0) } to { transform: scaleX(1) } }

.fade-up   { animation: fadeUp  .45s cubic-bezier(.22,.68,0,1.2) both }
.fade-in   { animation: fadeIn  .35s ease both }
.anim-d1   { animation-delay: .05s }
.anim-d2   { animation-delay: .12s }
.anim-d3   { animation-delay: .19s }
.anim-d4   { animation-delay: .26s }
.anim-d5   { animation-delay: .33s }

.card-hover {
  transition: border-color .2s, transform .2s, box-shadow .2s;
  cursor: default;
}
.card-hover:hover {
  border-color: #1e3a6e !important;
  transform: translateY(-2px);
  box-shadow: 0 12px 40px #00d4ff11;
}

.btn-primary {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #00d4ff22, #004a6e44);
  border: 1px solid #00d4ff55;
  color: #00d4ff; padding: 12px 28px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px; letter-spacing: .12em;
  border-radius: 4px; cursor: pointer;
  transition: all .2s;
}
.btn-primary::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, #00d4ff33, #004a6e66);
  opacity: 0; transition: opacity .2s;
}
.btn-primary:hover::before { opacity: 1; }
.btn-primary:hover { box-shadow: 0 0 24px #00d4ff33; }
.btn-primary:active { transform: scale(.97); }
.btn-primary:disabled { opacity:.4; cursor:not-allowed; }

.btn-ghost {
  background: transparent;
  border: 1px solid #162038;
  color: #4a6080; padding: 10px 20px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; border-radius: 4px;
  cursor: pointer; transition: all .15s;
}
.btn-ghost:hover { border-color: #1e3a6e; color: #e8edf5; }

.tab-btn {
  background: none; border: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  padding: 8px 16px; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all .15s; white-space: nowrap;
  color: #4a6080;
}
.tab-btn.active { color: #00d4ff; border-bottom-color: #00d4ff; }
.tab-btn:hover:not(.active) { color: #e8edf5; }

.slider-track {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 3px;
  background: linear-gradient(to right, #00d4ff var(--pct, 50%), #162038 var(--pct, 50%));
  border-radius: 2px; outline: none; cursor: pointer;
}
.slider-track::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 16px; height: 16px;
  background: #00d4ff; border-radius: 50%;
  box-shadow: 0 0 10px #00d4ff66;
  transition: transform .15s;
}
.slider-track::-webkit-slider-thumb:hover { transform: scale(1.3); }

.custom-tooltip {
  background: #0d1526;
  border: 1px solid #1e3a6e;
  border-radius: 6px; padding: 8px 12px;
  font-family: 'DM Sans', sans-serif; font-size: 12px;
}

select.styled {
  background: #0b1120;
  border: 1px solid #162038;
  color: #e8edf5; padding: 9px 12px;
  border-radius: 4px; font-family: 'DM Sans', sans-serif;
  font-size: 13px; width: 100%; cursor: pointer;
  transition: border-color .15s; outline: none;
}
select.styled:focus { border-color: #00d4ff55; }

.grid-noise {
  background-image:
    repeating-linear-gradient(#1a2a4408 0 1px, transparent 1px 40px),
    repeating-linear-gradient(90deg, #1a2a4408 0 1px, transparent 1px 40px);
}
`;

function injectCSS() {
  if (document.getElementById('mundial-styles')) return;
  const s = document.createElement('style');
  s.id = 'mundial-styles';
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

/* ════════════════════════════════════════════════════════════
   SMALL COMPONENTS
════════════════════════════════════════════════════════════ */
const Dot = ({ ok, pulse }) => (
  <span style={{
    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
    background: ok ? T.green : T.red,
    boxShadow: ok ? `0 0 8px ${T.green}` : `0 0 8px ${T.red}`,
    animation: pulse ? 'pulse 2s ease infinite' : 'none',
  }} />
);

const Spinner = () => (
  <div style={{ textAlign: 'center', padding: '4rem', color: T.muted }}>
    <div style={{
      width: 32, height: 32, border: `2px solid ${T.border}`,
      borderTop: `2px solid ${T.cyan}`, borderRadius: '50%',
      animation: 'spin .8s linear infinite', margin: '0 auto 12px',
    }} />
    <div style={{ fontFamily: T.fontMono, fontSize: 11, letterSpacing: '.1em' }}>CARGANDO</div>
  </div>
);

const Tag = ({ children, color = 'cyan' }) => {
  const map = { cyan: [T.cyanDim, T.cyan], gold: [T.goldDim, T.gold], green: [T.greenDim, T.green], red: [T.redDim, T.red] };
  const [bg, fg] = map[color] || map.cyan;
  return (
    <span style={{
      background: bg, color: fg, padding: '2px 9px', borderRadius: 3,
      fontSize: 10, fontFamily: T.fontMono, fontWeight: 500,
      letterSpacing: '.08em', textTransform: 'uppercase',
    }}>{children}</span>
  );
};

const Panel = ({ children, style = {}, className = '', animate = false, delay = 0 }) => (
  <div
    className={`card-hover ${animate ? 'fade-up' : ''} ${className}`}
    style={{
      background: T.panel, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: '1.25rem 1.5rem',
      animationDelay: `${delay}s`, ...style,
    }}
  >{children}</div>
);

const SectionLabel = ({ children }) => (
  <div style={{
    fontFamily: T.fontMono, fontSize: 10, color: T.muted,
    letterSpacing: '.15em', textTransform: 'uppercase',
    marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
  }}>
    <div style={{ width: 20, height: 1, background: T.dim }} />
    {children}
    <div style={{ flex: 1, height: 1, background: T.border }} />
  </div>
);

const BigStat = ({ label, value, color = T.cyan, sub, animate, delay }) => (
  <Panel animate={animate} delay={delay} style={{ padding: '1.25rem 1.5rem' }}>
    <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.muted, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
    <div style={{ fontFamily: T.fontDisplay, fontSize: 42, color, lineHeight: 1, letterSpacing: '.02em' }}>{value}</div>
    {sub && <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.muted, marginTop: 6 }}>{sub}</div>}
  </Panel>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div style={{ color: T.muted, fontSize: 11, marginBottom: 6, fontFamily: T.fontMono }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: T.fontMono, fontSize: 12 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}%</strong>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════════════════ */
function Header({ tab, setTab, health }) {
  const TABS = [
    { id: 'dashboard',  label: 'Dashboard' },
    { id: 'prediccion', label: 'Predicción' },
    { id: 'metricas',   label: 'Métricas' },
    { id: 'historial',  label: 'Historial' },
  ];
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#060811ee',
      backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 58,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 34, height: 34, background: T.cyanDim,
            border: `1px solid ${T.cyan}44`, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, animation: 'glow 3s ease infinite',
          }}>⚽</div>
          <div>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 20, color: T.white, letterSpacing: '.08em', lineHeight: 1 }}>
              MUNDIAL ML
            </div>
            <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.muted, letterSpacing: '.14em' }}>
              PLATAFORMA · PREDICCIÓN · FIFA WORLD CUP
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.fontMono, fontSize: 11, color: T.muted }}>
          <Dot ok={health?.status === 'ok'} pulse />
          <span>{health?.status === 'ok' ? 'SISTEMA ONLINE' : 'VERIFICANDO…'}</span>
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD VIEW
════════════════════════════════════════════════════════════ */
function Dashboard({ health }) {
  const [stats,   setStats]   = useState(null);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/estadisticas`).then(r => r.data).catch(() => null),
      axios.get(`${API}/api/modelos`).then(r => r.data.modelos || []).catch(() => []),
    ]).then(([s, m]) => { setStats(s); setModelos(m); setLoading(false); });
  }, []);

  const activos = modelos.filter(m => m.activo);

  // Mini donut-like bars for visual interest
  const statItems = stats ? [
    { label: 'Total partidos',     value: stats.total_partidos,          color: T.cyan,  sub: 'Copa del Mundo (1930–)' },
    { label: '% victorias local',  value: `${stats.pct_victorias_local}%`, color: T.gold,  sub: `${stats.victorias_local} partidos` },
    { label: '% goleadas',         value: `${stats.pct_goleadas}%`,      color: T.red,   sub: 'Diferencia absoluta > 3' },
    { label: 'Dif. goles promedio',value: stats.dif_gol_promedio,        color: T.green, sub: 'home_score − away_score' },
  ] : [];

  // Fake sparkline data for visual
  const sparkData = Array.from({length:12}, (_,i) => ({ v: 40 + Math.sin(i*.8)*20 + Math.random()*10 }));

  return (
    <div>
      {/* Hero strip */}
      <div className="grid-noise" style={{
        background: `linear-gradient(180deg, ${T.bg2} 0%, ${T.bg} 100%)`,
        borderBottom: `1px solid ${T.border}`,
        padding: '2.5rem 0', marginBottom: '2rem',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 2rem' }}>
          <div className="fade-up" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 56, color: T.white, letterSpacing: '.04em', lineHeight: 1 }}>
                SISTEMA DE<br />
                <span style={{ color: T.cyan }}>PREDICCIÓN</span>
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: 14, color: T.muted, marginTop: 10 }}>
                Plataforma ML · Microservicios · Copa del Mundo FIFA
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.muted, letterSpacing: '.1em', marginBottom: 4 }}>SERVICIOS ACTIVOS</div>
              {[['API', health?.status === 'ok'], ['Base de datos', health?.db], ['Modelos', health?.modelos]].map(([n, ok]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.muted }}>{n}</span>
                  <Dot ok={ok} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 2rem' }}>
        {loading ? <Spinner /> : (
          <>
            {/* Stats grid */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {statItems.map((s, i) => (
                  <BigStat key={s.label} {...s} animate delay={i * 0.07} />
                ))}
              </div>
            )}

            {/* Modelos + sparkline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', marginBottom: '2rem' }}>
              <Panel animate delay={.3}>
                <SectionLabel>Modelos entrenados</SectionLabel>
                {activos.length === 0 ? (
                  <div style={{ color: T.muted, fontSize: 13, padding: '2rem 0', textAlign: 'center' }}>
                    Sin modelos. El pipeline de entrenamiento debe correr primero.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fontBody, fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Algoritmo','Tipo','Accuracy','F1','AUC-ROC'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: T.muted, fontWeight: 400, fontSize: 11, fontFamily: T.fontMono, letterSpacing: '.08em', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activos.map((m, i) => (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${T.bg1}` }}>
                          <td style={{ padding: '10px', fontWeight: 500, color: T.text }}>{m.nombre}</td>
                          <td style={{ padding: '10px' }}><Tag color={m.tipo === 'resultado' ? 'cyan' : 'gold'}>{m.tipo}</Tag></td>
                          {['accuracy','f1_score','auc_roc'].map(k => {
                            const val = m[k];
                            const pct = val != null ? val * 100 : null;
                            const color = pct > 70 ? T.green : pct > 55 ? T.gold : T.muted;
                            return (
                              <td key={k} style={{ padding: '10px', fontFamily: T.fontMono, fontSize: 12, color }}>
                                {pct != null ? pct.toFixed(1) + '%' : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              <Panel animate delay={.38}>
                <SectionLabel>Distribución de resultados</SectionLabel>
                {stats && (
                  <div style={{ padding: '0.5rem 0' }}>
                    {[
                      { label: 'Victoria local',   pct: stats.pct_victorias_local, color: T.green },
                      { label: 'No victoria local', pct: 100 - stats.pct_victorias_local, color: T.muted },
                      { label: 'Goleadas',          pct: stats.pct_goleadas, color: T.red },
                      { label: 'Partidos normales', pct: 100 - stats.pct_goleadas, color: T.dim },
                    ].map(({ label, pct, color }) => (
                      <div key={label} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.muted }}>{label}</span>
                          <span style={{ fontFamily: T.fontMono, fontSize: 11, color }}>{pct}%</span>
                        </div>
                        <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 2, background: color,
                            width: `${pct}%`, transformOrigin: 'left',
                            animation: 'barGrow .8s cubic-bezier(.22,.68,0,1) both',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* Pipeline flow */}
            <Panel animate delay={.45} style={{ padding: '1.5rem 2rem' }}>
              <SectionLabel>Pipeline de Machine Learning</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '0.5rem 0' }}>
                {[
                  { icon: '📂', label: 'Ingesta', sub: 'CSV → PostgreSQL' },
                  { icon: '🔧', label: 'Preprocesamiento', sub: 'Nulos · Outliers · Encoding' },
                  { icon: '🔍', label: 'Selección features', sub: 'Correlación + RF Importance' },
                  { icon: '🧠', label: 'Entrenamiento', sub: 'LR · KNN · SVM · RF' },
                  { icon: '📊', label: 'Evaluación', sub: 'F1 · AUC · CV 5-fold' },
                  { icon: '💾', label: 'Persistencia', sub: '.pkl + BD métricas' },
                  { icon: '⚡', label: 'Inferencia', sub: 'REST API Flask' },
                ].map((step, i) => (
                  <React.Fragment key={step.label}>
                    <div className="fade-up" style={{ animationDelay: `${.5 + i * .06}s`, textAlign: 'center', minWidth: 110, padding: '0 8px' }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{step.icon}</div>
                      <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.text, fontWeight: 500, marginBottom: 3 }}>{step.label}</div>
                      <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.muted, letterSpacing: '.06em' }}>{step.sub}</div>
                    </div>
                    {i < 6 && (
                      <div style={{ color: T.dim, fontSize: 18, flexShrink: 0, padding: '0 2px' }}>›</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PREDICTION VIEW
════════════════════════════════════════════════════════════ */
const CONTINENTS = [
  { v: 1, label: 'América'  },
  { v: 2, label: 'Europa'   },
  { v: 3, label: 'África'   },
  { v: 4, label: 'Asia'     },
  { v: 5, label: 'Oceanía'  },
];

// Mapeo exacto reconstruido con LabelEncoder sobre df_attack_processed.csv
// le.fit_transform(df["home_team"]) → 80 países
const LOCAL_MAP = {
  0:"Algeria",1:"Angola",2:"Argentina",3:"Australia",4:"Austria",
  5:"Belgium",6:"Bolivia",7:"Bosnia And Herzegovina",8:"Brazil",9:"Bulgaria",
  10:"Cameroon",11:"Canada",12:"Chile",13:"China Pr",14:"Colombia",
  15:"Costa Rica",16:"Croatia",17:"Cuba",18:"Czech Republic",19:"Czechoslovakia",
  20:"Denmark",21:"Dr Congo",22:"Ecuador",23:"Egypt",24:"El Salvador",
  25:"England",26:"France",27:"German Dr",28:"Germany",29:"Ghana",
  30:"Greece",31:"Haiti",32:"Honduras",33:"Hungary",34:"Iceland",
  35:"Iran",36:"Iraq",37:"Israel",38:"Italy",39:"Ivory Coast",
  40:"Jamaica",41:"Japan",42:"Mexico",43:"Morocco",44:"Netherlands",
  45:"New Zealand",46:"Nigeria",47:"North Korea",48:"Northern Ireland",49:"Norway",
  50:"Panama",51:"Paraguay",52:"Peru",53:"Poland",54:"Portugal",
  55:"Qatar",56:"Republic Of Ireland",57:"Romania",58:"Russia",59:"Saudi Arabia",
  60:"Scotland",61:"Senegal",62:"Serbia",63:"Slovakia",64:"Slovenia",
  65:"South Africa",66:"South Korea",67:"Spain",68:"Sweden",69:"Switzerland",
  70:"Togo",71:"Trinidad And Tobago",72:"Tunisia",73:"Turkey",74:"Ukraine",
  75:"United Arab Emirates",76:"United States",77:"Uruguay",78:"Wales",79:"Yugoslavia",
};

// le.fit_transform(df["away_team"]) → 79 países (Indonesia y Kuwait solo son visitantes)
const VISITANTE_MAP = {
  0:"Algeria",1:"Angola",2:"Argentina",3:"Australia",4:"Austria",
  5:"Belgium",6:"Bolivia",7:"Bosnia And Herzegovina",8:"Brazil",9:"Bulgaria",
  10:"Cameroon",11:"Canada",12:"Chile",13:"China Pr",14:"Colombia",
  15:"Costa Rica",16:"Croatia",17:"Czech Republic",18:"Czechoslovakia",19:"Denmark",
  20:"Dr Congo",21:"Ecuador",22:"Egypt",23:"El Salvador",24:"England",
  25:"France",26:"German Dr",27:"Germany",28:"Ghana",29:"Greece",
  30:"Haiti",31:"Honduras",32:"Hungary",33:"Iceland",34:"Indonesia",
  35:"Iran",36:"Iraq",37:"Italy",38:"Ivory Coast",39:"Jamaica",
  40:"Japan",41:"Kuwait",42:"Mexico",43:"Morocco",44:"Netherlands",
  45:"New Zealand",46:"Nigeria",47:"North Korea",48:"Northern Ireland",49:"Norway",
  50:"Panama",51:"Paraguay",52:"Peru",53:"Poland",54:"Portugal",
  55:"Republic Of Ireland",56:"Romania",57:"Russia",58:"Saudi Arabia",59:"Scotland",
  60:"Senegal",61:"Serbia",62:"Slovakia",63:"Slovenia",64:"South Africa",
  65:"South Korea",66:"Spain",67:"Sweden",68:"Switzerland",69:"Togo",
  70:"Trinidad And Tobago",71:"Tunisia",72:"Turkey",73:"Ukraine",74:"United Arab Emirates",
  75:"United States",76:"Uruguay",77:"Wales",78:"Yugoslavia",
};

// le.fit_transform(df["country"]) → 18 países sede
const ANFITRION_MAP = {
  0:"Argentina",1:"Brazil",2:"Chile",3:"England",4:"France",
  5:"Germany",6:"Italy",7:"Japan",8:"Mexico",9:"Qatar",
  10:"Russia",11:"South Africa",12:"South Korea",13:"Spain",14:"Sweden",
  15:"Switzerland",16:"United States",17:"Uruguay",
};

// Helpers: invertir mapa num→nombre a nombre→num para el select
const toOptions = (map) =>
  Object.entries(map)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([v, label]) => ({ v: Number(v), label }));

const LOCAL_OPTIONS     = toOptions(LOCAL_MAP);
const VISITANTE_OPTIONS = toOptions(VISITANTE_MAP);
const ANFITRION_OPTIONS = toOptions(ANFITRION_MAP);

function SliderField({ label, name, min, max, value, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.muted }}>{label}</span>
        <span style={{ fontFamily: T.fontMono, fontSize: 14, color: T.cyan }}>{value}</span>
      </div>
      <input type="range" className="slider-track" min={min} max={max} value={value} name={name}
        onChange={onChange} style={{ '--pct': `${pct}%` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: T.fontMono, fontSize: 10, color: T.dim }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function ProbGauge({ value, color, label }) {
  const deg = (value / 100) * 180;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="160" height="90" viewBox="0 0 160 90">
        {/* Track */}
        <path d="M 16 84 A 64 64 0 0 1 144 84" fill="none" stroke={T.border} strokeWidth="10" strokeLinecap="round"/>
        {/* Fill */}
        <path d="M 16 84 A 64 64 0 0 1 144 84" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(value/100)*201} 201`} style={{ transition: 'stroke-dasharray 1s cubic-bezier(.22,.68,0,1)' }}/>
        {/* Needle */}
        <line x1="80" y1="84" x2={80 + 50 * Math.cos((Math.PI - deg * Math.PI/180))} y2={84 - 50 * Math.sin((Math.PI - deg * Math.PI/180))}
          stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all 1s cubic-bezier(.22,.68,0,1)' }}/>
        <circle cx="80" cy="84" r="5" fill={color}/>
        <text x="80" y="72" textAnchor="middle" fill={color} fontFamily="'Bebas Neue'" fontSize="22" letterSpacing="1">{value}%</text>
      </svg>
      <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.muted, letterSpacing: '.1em', marginTop: -8 }}>{label}</div>
    </div>
  );
}

// Banderas emoji por nombre de país
const FLAG = {
  "Algeria":"🇩🇿","Angola":"🇦🇴","Argentina":"🇦🇷","Australia":"🇦🇺","Austria":"🇦🇹",
  "Belgium":"🇧🇪","Bolivia":"🇧🇴","Bosnia And Herzegovina":"🇧🇦","Brazil":"🇧🇷","Bulgaria":"🇧🇬",
  "Cameroon":"🇨🇲","Canada":"🇨🇦","Chile":"🇨🇱","China Pr":"🇨🇳","Colombia":"🇨🇴",
  "Costa Rica":"🇨🇷","Croatia":"🇭🇷","Cuba":"🇨🇺","Czech Republic":"🇨🇿","Czechoslovakia":"🏳️",
  "Denmark":"🇩🇰","Dr Congo":"🇨🇩","Ecuador":"🇪🇨","Egypt":"🇪🇬","El Salvador":"🇸🇻",
  "England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","France":"🇫🇷","German Dr":"🏳️","Germany":"🇩🇪","Ghana":"🇬🇭",
  "Greece":"🇬🇷","Haiti":"🇭🇹","Honduras":"🇭🇳","Hungary":"🇭🇺","Iceland":"🇮🇸",
  "Indonesia":"🇮🇩","Iran":"🇮🇷","Iraq":"🇮🇶","Israel":"🇮🇱","Italy":"🇮🇹",
  "Ivory Coast":"🇨🇮","Jamaica":"🇯🇲","Japan":"🇯🇵","Kuwait":"🇰🇼","Mexico":"🇲🇽",
  "Morocco":"🇲🇦","Netherlands":"🇳🇱","New Zealand":"🇳🇿","Nigeria":"🇳🇬","North Korea":"🇰🇵",
  "Northern Ireland":"🏴󠁧󠁢󠁮󠁩󠁲󠁿","Norway":"🇳🇴","Panama":"🇵🇦","Paraguay":"🇵🇾","Peru":"🇵🇪",
  "Poland":"🇵🇱","Portugal":"🇵🇹","Qatar":"🇶🇦","Republic Of Ireland":"🇮🇪","Romania":"🇷🇴",
  "Russia":"🇷🇺","Saudi Arabia":"🇸🇦","Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Senegal":"🇸🇳","Serbia":"🇷🇸",
  "Slovakia":"🇸🇰","Slovenia":"🇸🇮","South Africa":"🇿🇦","South Korea":"🇰🇷","Spain":"🇪🇸",
  "Sweden":"🇸🇪","Switzerland":"🇨🇭","Togo":"🇹🇬","Trinidad And Tobago":"🇹🇹","Tunisia":"🇹🇳",
  "Turkey":"🇹🇷","Ukraine":"🇺🇦","United Arab Emirates":"🇦🇪","United States":"🇺🇸",
  "Uruguay":"🇺🇾","Wales":"🏴󠁧󠁢󠁷󠁬󠁳󠁿","Yugoslavia":"🏳️",
};

function CountrySelect({ label, name, value, onChange, options, accentColor }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: T.fontMono, fontSize: 10, color: accentColor, letterSpacing: '.12em', marginBottom: 10 }}>
        {label}
      </div>
      <select className="styled" name={name} value={value} onChange={onChange}
        style={{ fontSize: 14 }}>
        {options.map(o => (
          <option key={o.v} value={o.v}>
            {FLAG[o.label] || '🏳️'} {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Prediccion() {
  const [form, setForm] = useState({
    local: 2,          // Argentina
    visitante: 27,     // Germany
    pais_anfitrion: 1, // Brazil (no se usa en modelo pero se muestra)
    num_continente_local: 1,
    num_continente_visitante: 2,
    num_continente_anfitrion: 1,
  });
  const [resR, setResR] = useState(null);
  const [resG, setResG] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: Number(e.target.value) }));

  const predecir = async () => {
    setLoading(true); setError(''); setResR(null); setResG(null);
    try {
      const payload = {
        local:                   form.local,
        visitante:               form.visitante,
        num_continente_local:    form.num_continente_local,
        num_continente_visitante:form.num_continente_visitante,
        num_continente_anfitrion:form.num_continente_anfitrion,
      };
      const [a, b] = await Promise.all([
        axios.post(`${API}/api/predecir/resultado`, payload),
        axios.post(`${API}/api/predecir/goleada`,   payload),
      ]);
      setResR(a.data); setResG(b.data);
    } catch(e) {
      setError(e.response?.data?.error || 'Error de conexión con la API');
    } finally { setLoading(false); }
  };

  const localName     = LOCAL_MAP[form.local]     || '—';
  const visitanteName = VISITANTE_MAP[form.visitante] || '—';

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: T.fontDisplay, fontSize: 40, color: T.white, letterSpacing: '.04em' }}>
          PREDICCIÓN DE PARTIDO
        </h1>
        <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.muted, marginTop: 6 }}>
          Selecciona los equipos y obtén la predicción de los modelos entrenados.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Config panel */}
        <Panel animate>
          <SectionLabel>Configurar enfrentamiento</SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
            <div>
              <CountrySelect
                label="EQUIPO LOCAL"
                name="local"
                value={form.local}
                onChange={handleChange}
                options={LOCAL_OPTIONS}
                accentColor={T.cyan}
              />
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.muted, marginBottom: 6 }}>Continente</div>
                <select className="styled" name="num_continente_local" value={form.num_continente_local} onChange={handleChange}>
                  {CONTINENTS.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <CountrySelect
                label="EQUIPO VISITANTE"
                name="visitante"
                value={form.visitante}
                onChange={handleChange}
                options={VISITANTE_OPTIONS}
                accentColor={T.gold}
              />
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.muted, marginBottom: 6 }}>Continente</div>
                <select className="styled" name="num_continente_visitante" value={form.num_continente_visitante} onChange={handleChange}>
                  {CONTINENTS.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <CountrySelect
              label="PAÍS ANFITRIÓN"
              name="pais_anfitrion"
              value={form.pais_anfitrion}
              onChange={handleChange}
              options={ANFITRION_OPTIONS}
              accentColor={T.muted}
            />
            <div>
              <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.muted, marginBottom: 6 }}>Continente anfitrión</div>
              <select className="styled" name="num_continente_anfitrion" value={form.num_continente_anfitrion} onChange={handleChange}>
                {CONTINENTS.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* VS display con nombres */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            background: T.bg1, borderRadius: 8, padding: '1.25rem 1rem', marginBottom: '1.5rem',
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 6 }}>{FLAG[localName] || '🏳️'}</div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 20, color: T.cyan, letterSpacing: '.04em', lineHeight: 1.1 }}>
                {localName.toUpperCase()}
              </div>
              <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.dim, marginTop: 4 }}>LOCAL · ID {form.local}</div>
            </div>
            <div style={{
              fontFamily: T.fontDisplay, fontSize: 22, color: T.dim,
              padding: '0 8px', flexShrink: 0,
            }}>VS</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 6 }}>{FLAG[visitanteName] || '🏳️'}</div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 20, color: T.gold, letterSpacing: '.04em', lineHeight: 1.1 }}>
                {visitanteName.toUpperCase()}
              </div>
              <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.dim, marginTop: 4 }}>VISITANTE · ID {form.visitante}</div>
            </div>
          </div>

          <button className="btn-primary" onClick={predecir} disabled={loading} style={{ width: '100%', textAlign: 'center' }}>
            {loading ? 'PROCESANDO...' : '⚡ EJECUTAR PREDICCIÓN'}
          </button>
          {error && <div style={{ color: T.red, fontSize: 12, marginTop: 10, fontFamily: T.fontMono }}>⚠ {error}</div>}
        </Panel>

        {/* Results panel */}
        <Panel animate delay={.1}>
          <SectionLabel>Resultado de la predicción</SectionLabel>
          {!resR && !resG && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 340, gap: 12 }}>
              <div style={{ fontSize: 48 }}>🎯</div>
              <div style={{ fontFamily: T.fontBody, fontSize: 14, color: T.muted, textAlign: 'center' }}>
                Configura el partido y presiona<br /><strong style={{ color: T.text }}>Ejecutar predicción</strong>
              </div>
            </div>
          )}
          {resR && resG && (
            <div className="fade-in">
              {/* Matchup header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: '1.25rem', padding: '0.75rem 1rem',
                background: T.bg1, borderRadius: 6, border: `1px solid ${T.border}`,
              }}>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 15, color: T.cyan }}>
                  {FLAG[localName] || '🏳️'} {localName.toUpperCase()}
                </span>
                <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.dim }}>VS</span>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 15, color: T.gold }}>
                  {FLAG[visitanteName] || '🏳️'} {visitanteName.toUpperCase()}
                </span>
              </div>
              {/* Gauges */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1.5rem' }}>
                <ProbGauge
                  value={resR.probabilidad}
                  color={resR.prediccion === 1 ? T.green : T.red}
                  label="VICTORIA LOCAL"
                />
                <ProbGauge
                  value={resG.probabilidad}
                  color={resG.prediccion === 1 ? T.red : T.green}
                  label="PROB. GOLEADA"
                />
              </div>

              {/* Result cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  {
                    titulo: `¿GANA ${localName.split(' ')[0].toUpperCase()}?`,
                    si: resR.prediccion === 1,
                    etiqueta: resR.etiqueta,
                  },
                  {
                    titulo: '¿HABRÁ GOLEADA?',
                    si: resG.prediccion === 1,
                    etiqueta: resG.etiqueta,
                  },
                ].map(({ titulo, si, etiqueta }) => (
                  <div key={titulo} style={{
                    background: si ? T.greenDim : T.redDim,
                    border: `1px solid ${si ? T.green + '44' : T.red + '44'}`,
                    borderRadius: 6, padding: '1rem',
                  }}>
                    <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.muted, letterSpacing: '.1em', marginBottom: 8 }}>{titulo}</div>
                    <div style={{ fontFamily: T.fontDisplay, fontSize: 28, color: si ? T.green : T.red, letterSpacing: '.04em' }}>
                      {si ? 'SÍ' : 'NO'}
                    </div>
                    <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.muted, marginTop: 4 }}>{etiqueta}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MÉTRICAS VIEW
════════════════════════════════════════════════════════════ */
const METRIC_COLORS = [T.cyan, T.gold, T.green, T.red, '#b388ff'];

function Metricas() {
  const [tipo,    setTipo]    = useState('resultado');
  const [data,    setData]    = useState({});
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async (t) => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/metricas?tipo=${t}`);
      setData(r.data.metricas || {});
    } catch { setData({}); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(tipo); }, [tipo, cargar]);

  // Build chart data: one entry per "model_metric" grouping
  const SHOW_METRICS = ['accuracy', 'f1', 'precision', 'recall', 'auc_roc'];
  
  // Extract unique model names from metric keys like "RandomForest_accuracy"
  const modelNames = [...new Set(
    Object.values(data).flatMap(vals => Object.keys(vals).map(k => k.split('_')[0]))
  )].filter(Boolean);

  // Build bar chart data: one bar per model per metric
  const chartData = SHOW_METRICS.map(met => {
    const entry = { metric: met.replace('_', ' ').toUpperCase() };
    Object.entries(data).forEach(([, vals]) => {
      Object.entries(vals).forEach(([key, val]) => {
        if (key.toLowerCase().includes(met.replace('_',''))) {
          const modelName = key.split('_')[0];
          entry[modelName] = parseFloat((val * 100).toFixed(1));
        }
      });
    });
    return entry;
  });

  const allModelNames = [...new Set(chartData.flatMap(d => Object.keys(d).filter(k => k !== 'metric')))];

  // Radar data
  const radarData = SHOW_METRICS.map(met => {
    const entry = { metric: met.toUpperCase() };
    allModelNames.forEach(model => {
      const found = chartData.find(d => d.metric === met.replace('_',' ').toUpperCase());
      entry[model] = found?.[model] || 0;
    });
    return entry;
  });

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: T.fontDisplay, fontSize: 40, color: T.white, letterSpacing: '.04em' }}>MÉTRICAS DE MODELOS</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.muted, marginTop: 6 }}>
            Comparativa de desempeño por algoritmo y tipo de problema.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['resultado','goleada'].map(t => (
            <button key={t} className={`tab-btn ${tipo === t ? 'active' : ''}`}
              style={{ fontSize: 13, padding: '8px 20px' }} onClick={() => setTipo(t)}>
              {t === 'resultado' ? '🏆 Resultado' : '⚡ Goleada'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : Object.keys(data).length === 0 ? (
        <Panel style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ color: T.muted, fontFamily: T.fontBody, fontSize: 14 }}>
            Sin datos. El pipeline debe haber corrido para generar métricas.
          </div>
        </Panel>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Bar chart */}
            <Panel animate>
              <SectionLabel>Métricas por modelo (%)</SectionLabel>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="metric" tick={{ fill: T.muted, fontSize: 10, fontFamily: "'DM Mono'" }} />
                    <YAxis domain={[0,100]} tick={{ fill: T.muted, fontSize: 10, fontFamily: "'DM Mono'" }} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    {allModelNames.map((model, i) => (
                      <Bar key={model} dataKey={model} fill={METRIC_COLORS[i % METRIC_COLORS.length]} radius={[3,3,0,0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
                {allModelNames.map((m, i) => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: METRIC_COLORS[i % METRIC_COLORS.length] }} />
                    <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.muted }}>{m}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Radar chart */}
            <Panel animate delay={.1}>
              <SectionLabel>Radar comparativo</SectionLabel>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={T.border} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: T.muted, fontSize: 9, fontFamily: "'DM Mono'" }} />
                    {allModelNames.map((model, i) => (
                      <Radar key={model} name={model} dataKey={model}
                        stroke={METRIC_COLORS[i % METRIC_COLORS.length]}
                        fill={METRIC_COLORS[i % METRIC_COLORS.length]} fillOpacity={0.08} strokeWidth={2} />
                    ))}
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          {/* Detail table */}
          <Panel animate delay={.2}>
            <SectionLabel>Tabla completa de métricas</SectionLabel>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fontBody, fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Métrica', ...Object.keys(data)].map(h => (
                      <th key={h} style={{
                        padding: '8px 14px', textAlign: 'left', color: T.muted,
                        fontWeight: 400, fontSize: 11, fontFamily: T.fontMono,
                        letterSpacing: '.08em', borderBottom: `1px solid ${T.border}`,
                      }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(Object.values(data)[0] || {}).slice(0, 24).map(([metrica]) => (
                    <tr key={metrica} style={{ borderBottom: `1px solid ${T.bg1}` }}>
                      <td style={{ padding: '8px 14px', color: T.muted, fontSize: 11, fontFamily: T.fontMono, letterSpacing: '.06em' }}>
                        {metrica}
                      </td>
                      {Object.values(data).map((vals, i) => {
                        const v = vals[metrica];
                        const pct = v != null ? v * 100 : null;
                        const col = pct > 70 ? T.green : pct > 55 ? T.gold : pct != null ? T.muted : T.dim;
                        return (
                          <td key={i} style={{ padding: '8px 14px', fontFamily: T.fontMono, fontSize: 12, color: col }}>
                            {pct != null ? pct.toFixed(1) + '%' : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HISTORIAL VIEW
════════════════════════════════════════════════════════════ */
function Historial() {
  const [preds,   setPreds]   = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/api/predicciones`);
      setPreds(r.data.predicciones || []);
    } catch { setPreds([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Mini stats from history
  const totalPreds  = preds.length;
  const siPreds     = preds.filter(p => p.prediccion === 1).length;
  const recentTypes = preds.slice(0, 20).reduce((a, p) => { a[p.tipo] = (a[p.tipo]||0)+1; return a; }, {});

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: T.fontDisplay, fontSize: 40, color: T.white, letterSpacing: '.04em' }}>HISTORIAL</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.muted, marginTop: 6 }}>
            Registro de todas las predicciones realizadas vía API.
          </p>
        </div>
        <button className="btn-ghost" onClick={cargar}>↺ Actualizar</button>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <BigStat label="Total predicciones" value={totalPreds} color={T.cyan} animate />
            <BigStat label="Predicciones positivas" value={siPreds} color={T.green} animate delay={.07} />
            <BigStat label="Tipos (últimas 20)" value={Object.keys(recentTypes).join(' · ') || '—'} color={T.gold} animate delay={.14} />
          </div>

          <Panel animate delay={.2}>
            <SectionLabel>Registro de predicciones</SectionLabel>
            {preds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: T.muted, fontFamily: T.fontBody, fontSize: 14 }}>
                Sin predicciones aún. Dirígete a <strong style={{ color: T.text }}>Predicción</strong> para crear la primera.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fontBody, fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['#','Modelo','Local','Visitante','Tipo','Predicción','Probabilidad','Timestamp'].map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left', color: T.muted,
                          fontWeight: 400, fontSize: 11, fontFamily: T.fontMono,
                          letterSpacing: '.08em', borderBottom: `1px solid ${T.border}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preds.map((p, i) => (
                      <tr key={p.id} className="fade-up" style={{ animationDelay: `${i * 0.025}s`, borderBottom: `1px solid ${T.bg1}` }}>
                        <td style={{ padding: '9px 12px', color: T.dim, fontFamily: T.fontMono, fontSize: 11 }}>{p.id}</td>
                        <td style={{ padding: '9px 12px', color: T.text, fontWeight: 500 }}>{p.modelo}</td>
                        <td style={{ padding: '9px 12px', color: T.cyan, fontSize: 13 }}>
                          {FLAG[LOCAL_MAP[p.local]] || '🏳️'} {LOCAL_MAP[p.local] || `#${p.local}`}
                        </td>
                        <td style={{ padding: '9px 12px', color: T.gold, fontSize: 13 }}>
                          {FLAG[VISITANTE_MAP[p.visitante]] || '🏳️'} {VISITANTE_MAP[p.visitante] || `#${p.visitante}`}
                        </td>
                        <td style={{ padding: '9px 12px' }}><Tag color={p.tipo === 'resultado' ? 'cyan' : 'gold'}>{p.tipo}</Tag></td>
                        <td style={{ padding: '9px 12px' }}>
                          <Tag color={p.prediccion === 1 ? 'green' : 'red'}>{p.prediccion === 1 ? 'SÍ' : 'NO'}</Tag>
                        </td>
                        <td style={{ padding: '9px 12px', fontFamily: T.fontMono, fontSize: 12, color: T.muted }}>
                          {p.probabilidad != null ? `${(p.probabilidad * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', fontFamily: T.fontMono, fontSize: 11, color: T.dim }}>
                          {p.creada_en ? new Date(p.creada_en).toLocaleString('es-CO') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════════════════════ */
export default function App() {
  const [tab,    setTab]    = useState('dashboard');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    injectCSS();
    const fetch = () => axios.get(`${API}/health`).then(r => setHealth(r.data)).catch(() => setHealth({ status: 'error' }));
    fetch();
    const iv = setInterval(fetch, 20000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.fontBody }}>
      <Header tab={tab} setTab={setTab} health={health} />
      <main style={{ paddingBottom: '3rem' }}>
        {tab === 'dashboard'  && <Dashboard health={health} />}
        {tab === 'prediccion' && <Prediccion />}
        {tab === 'metricas'   && <Metricas />}
        {tab === 'historial'  && <Historial />}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${T.border}`, padding: '1.5rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: T.fontMono, fontSize: 10, color: T.dim, letterSpacing: '.1em',
      }}>
        <span>MUNDIAL ML · PROGRAMACIÓN AVANZADA · 7° SEM · ING. SOFTWARE</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Dot ok={health?.status === 'ok'} />
          DOCKER · FLASK · REACT · POSTGRESQL · SKLEARN
        </span>
      </footer>
    </div>
  );
}
