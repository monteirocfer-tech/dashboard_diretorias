import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Filter,
  ChevronDown,
  XCircle,
  CalendarClock,
  AlertTriangle,
  Users,
  Clock,
  Hourglass,
  RefreshCw,
  Search,
  Pause,
  X,
} from 'lucide-react';

// Exportação CSV pública do Google Sheets — a planilha deve estar compartilhada como "qualquer pessoa com o link pode ver"
const CSV_URL = 'https://docs.google.com/spreadsheets/d/1EAxSRoWOyuCdMA6WsWnkrTbBHQNRkze1/export?format=csv';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const FUTURE_MONTHS = ['JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// ── PALETA CORPORATIVA — IDENTIDADE INTERCEMENT ─────────────────
const C = {
  // InterCement — 5 cores principais
  purple:       '#662479',  // Roxo   — cor principal da marca
  purpleLight:  '#8B3EA0',  // Roxo claro (derivado)
  purpleDark:   '#4A1957',  // Roxo escuro (derivado)
  purpleBg:     '#f6eefa',  // Roxo fundo suave
  green:        '#488B4C',  // Verde  — Realizado
  greenBg:      '#edf4ee',  // Verde fundo suave
  orange:       '#F07E21',  // Laranja — Atrasado
  orangeBg:     '#fff4e8',  // Laranja fundo suave
  magenta:      '#DD1E73',  // Magenta — Reagendado
  magentaBg:    '#fdeef5',  // Magenta fundo suave
  red:          '#B02420',  // Vermelho — Cancelado
  redBg:        '#fdf0ef',  // Vermelho fundo suave
  // Neutros
  gray800:      '#374151',
  gray600:      '#6B7280',
  gray400:      '#9CA3AF',
  gray200:      '#E5E7EB',
  gray100:      '#F3F4F6',
  slate:        '#64748b',
  navy:         '#0f1e35',
  navyMid:      '#1e2d4a',
  standby:      '#94a3b8',
  white:        '#ffffff',
  bg:           '#f1f5f9',
};

const STATUS_ORDER = ['Realizado', 'Em andamento', 'Planejado', 'Cancelado', 'Reagendado', 'Atrasado', 'Stand-by'];

const normalizeStatus = (status) => {
  const raw = (status || '').toString().trim().toLowerCase();
  if (raw.startsWith('real'))     return 'Realizado';
  if (raw.startsWith('em and'))   return 'Em andamento';
  if (raw.startsWith('plan'))     return 'Planejado';
  if (raw.startsWith('cancel'))   return 'Cancelado';
  if (raw.startsWith('reagend'))  return 'Reagendado';
  if (raw.startsWith('atras'))    return 'Atrasado';
  if (raw.startsWith('stand'))    return 'Stand-by';
  return null;
};

const statusMatchesFilter = (status, selected) => {
  if (!selected || selected.length === 0) return true;
  return selected.includes(normalizeStatus(status));
};

const STATUS_META = {
  'Realizado':    { dot: C.green,    bg: C.green,    label: 'Realizado' },
  'Em andamento': { dot: C.purple,   bg: C.purple,   label: 'Em andamento' },
  'Planejado':    { dot: C.gray200,  bg: 'transparent', label: 'Planejado', dashed: true },
  'Cancelado':    { dot: C.red,      bg: C.red,      label: 'Cancelado' },
  'Reagendado':   { dot: C.magenta,  bg: C.magenta,  label: 'Reagendado' },
  'Atrasado':     { dot: C.orange,   bg: C.orange,   label: 'Atrasado' },
  'Stand-by':     { dot: C.standby,  bg: C.standby,  label: 'Stand-by' },
};

const STATUS_CARD_META = {
  'Realizado':    { color: C.green,   softBg: C.greenBg,   softColor: '#1B5E20' },
  'Em andamento': { color: C.purple,  softBg: C.purpleBg,  softColor: C.purpleDark },
  'Planejado':    { color: C.gray400, softBg: C.gray100,   softColor: C.gray800 },
  'Cancelado':    { color: C.red,     softBg: C.redBg,     softColor: '#7A1A17' },
  'Reagendado':   { color: C.magenta, softBg: C.magentaBg, softColor: '#A01555' },
  'Atrasado':     { color: C.orange,  softBg: C.orangeBg,  softColor: '#B05A10' },
  'Stand-by':     { color: C.standby, softBg: '#f8fafc',   softColor: '#475569' },
};

const getStatusStyle = (statusNorm) => {
  const m = STATUS_META[statusNorm];
  if (!m) return { bg: 'transparent', text: '#9ca3af', border: `2px dashed ${C.gray200}` };
  if (m.dashed) return { bg: 'transparent', text: C.gray400, border: `2px dashed ${C.gray200}` };
  return { bg: m.bg, text: C.white };
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number.parseFloat(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

// ── COMPONENTES ─────────────────────────────────────────────────

const DashboardHeader = () => (
  <header style={{
    backgroundColor: C.white,
    borderRadius: '0 0 16px 16px',
    padding: '18px 28px 16px',
    borderBottom: `3px solid ${C.purple}`,
    boxShadow: '0 2px 12px rgba(102,36,121,0.08)',
  }}>
    <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0, letterSpacing: '-0.3px', lineHeight: 1, color: C.navy }}>
      CAPACITAÇÕES <span style={{ color: C.purple }}>CORPORATIVAS</span>
    </h1>
    <p style={{ fontSize: '11px', marginTop: '5px', color: C.slate, letterSpacing: '0.04em', fontWeight: 600 }}>
      Acompanhamento das Ações de Capacitações Corporativas da InterCement
    </p>
  </header>
);

const KpiCard = ({ icon: Icon, label, value, sub, accentColor }) => (
  <div style={{
    background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`,
    borderRadius: '14px',
    padding: '14px 20px',
    borderBottom: `4px solid ${accentColor}`,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(15,30,53,0.18)',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  }}>
    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.06 }}>
      <Icon size={52} color="white" />
    </div>
    <div>
      <p style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#94a3b8', marginBottom: '4px', lineHeight: 1 }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 900, color: C.white, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</p>
      {sub && <p style={{ fontSize: '9px', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>{sub}</p>}
    </div>
  </div>
);

const CircleProgress = ({ pct, total }) => {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const stroke = pct >= 75 ? C.green : pct >= 40 ? C.purple : pct > 0 ? C.orange : C.gray200;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke={C.gray200} strokeWidth="3" />
      {total > 0 && pct > 0 && (
        <circle cx="22" cy="22" r={r} fill="none" stroke={stroke} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 22 22)" />
      )}
      <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="800"
        fill={total === 0 ? C.gray200 : C.navy}>{pct}%</text>
    </svg>
  );
};

const MonthCard = ({ mes, total, pct }) => (
  <div style={{
    background: C.white,
    borderRadius: '12px',
    borderLeft: `3px solid ${total === 0 ? C.gray200 : C.purple}`,
    padding: '14px 16px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    opacity: total === 0 ? 0.6 : 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '10px', fontWeight: 800, color: total === 0 ? C.gray400 : C.purple, letterSpacing: '0.14em', marginBottom: '4px' }}>{mes}</p>
        <p style={{ fontSize: '24px', fontWeight: 900, color: C.navy, lineHeight: 1 }}>{total}</p>
        <p style={{ fontSize: '10px', color: C.slate, fontWeight: 600, marginTop: '2px' }}>
          {total === 1 ? 'previsto' : 'previstos'}
        </p>
      </div>
      <CircleProgress pct={pct} total={total} />
    </div>
    <div style={{ height: '2px', backgroundColor: C.gray100, borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct >= 75 ? C.green : pct >= 40 ? C.purple : pct > 0 ? C.orange : C.gray200, borderRadius: '2px', transition: 'width 0.5s ease' }} />
    </div>
  </div>
);

const FilterDropdown = ({ label, activeCount, filterKey, openFilter, setOpenFilter, children }) => (
  <div style={{ position: 'relative' }}>
    <button
      onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === filterKey ? null : filterKey); }}
      style={{
        background: activeCount > 0 ? C.purpleBg : 'transparent',
        border: `1px solid ${activeCount > 0 ? C.purpleLight : C.gray200}`,
        borderRadius: '8px',
        padding: '5px 10px',
        fontSize: '11px',
        fontWeight: 700,
        color: activeCount > 0 ? C.purpleDark : C.gray600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}{activeCount > 0 ? ` (${activeCount})` : ''}
      <ChevronDown size={13} />
    </button>
    {openFilter === filterKey && (
      <div onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          background: C.white, border: `1px solid ${C.gray200}`, borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '10px',
          minWidth: '200px', maxHeight: '260px', overflowY: 'auto',
        }}>
        {children}
      </div>
    )}
  </div>
);

const CheckItem = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 2px', fontSize: '12px', cursor: 'pointer', color: C.gray800, fontWeight: 500 }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: C.purple }} />
    {label}
  </label>
);

const DetailPanel = ({ detail, onClose }) => {
  if (!detail) return null;
  const { training, cls } = detail;
  const meta = STATUS_META[cls.status] || {};
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,30,53,0.25)', backdropFilter: 'blur(2px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: '80px', right: '24px', width: '300px',
          background: C.white, borderRadius: '18px',
          boxShadow: '0 12px 48px rgba(15,30,53,0.2)',
          border: `1px solid ${C.gray200}`, overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${C.gray100}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Detalhes da Turma</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, padding: '2px' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: '14px', fontWeight: 800, color: C.navy, marginBottom: '10px', lineHeight: 1.3 }}>{training.nome}</p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
            color: C.white, backgroundColor: meta.bg || C.gray400,
            padding: '3px 10px', borderRadius: '20px', marginBottom: '16px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.7)', display: 'inline-block' }} />
            {cls.status}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cls.turma && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 800, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '2px' }}>Turma</p>
                <p style={{ fontSize: '12px', color: C.navy, fontWeight: 600 }}>{cls.turma}</p>
              </div>
            )}
            {cls.data_ && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 800, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '2px' }}>
                  {cls.status === 'Reagendado' ? 'Data original' : 'Data'}
                </p>
                <p style={{ fontSize: '12px', color: C.navy, fontWeight: 600 }}>{cls.data_}</p>
              </div>
            )}
            <div>
              <p style={{ fontSize: '9px', fontWeight: 800, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '2px' }}>Justificativa</p>
              {cls.justificativa
                ? <p style={{ fontSize: '12px', color: C.gray800, lineHeight: 1.5 }}>{cls.justificativa}</p>
                : <p style={{ fontSize: '12px', color: C.gray400, fontStyle: 'italic' }}>Sem justificativa registrada.</p>
              }
            </div>
          </div>
        </div>
        <div style={{ padding: '10px 20px 14px' }}>
          <p style={{ fontSize: '10px', color: C.gray400, textAlign: 'center' }}>Clique fora para fechar</p>
        </div>
      </div>
    </div>
  );
};

// ── APP ─────────────────────────────────────────────────────────
const App = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [filterDiretorias, setFilterDiretorias] = useState([]);
  const [filterFornecedores, setFilterFornecedores] = useState([]);
  const [fornecedorSearch, setFornecedorSearch] = useState('');
  const [filterTipos, setFilterTipos] = useState([]);
  const [filterMonths, setFilterMonths] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [openFilter, setOpenFilter] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(CSV_URL, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} — ${response.statusText}`);
        }
        const text = await response.text();
        Papa.parse(text.replace(/^﻿/, ''), {
          header: true, skipEmptyLines: 'greedy',
          complete: (result) => {
            if (result.data?.[0]) console.log('[DEBUG] Colunas:', JSON.stringify(Object.keys(result.data[0])));
            if (result.data?.[0]) console.log('[DEBUG] Primeira linha:', JSON.stringify(result.data[0]));
            // Estrutura da planilha: uma linha por treinamento, turmas em colunas
            // horizontais: "Mes T1", "Data T1", "Status T1", "Convidados T1"...
            const data = [];
            (result.data || []).forEach((r) => {
              // Suporte aos dois formatos de nome de coluna (original e Google Sheets)
              const diretoria  = (r.Diretoria  || '').trim();
              const nome       = (r.Treinamento || r.Nome || '').trim();
              const fornecedor = (r['Nome Fornecedor/ Facilitador'] || r['Nome Fornecedor/Facilitador'] || r.Fornecedor || '').trim();
              const tipo       = (r.Tipo || '').trim();
              const horas      = parseNumber(r.Horas);
              if (!nome) return;
              for (let t = 1; t <= 20; t++) {
                const label = `T${t}`;
                // Tenta os dois formatos: "Mes T1" (Sheets) e "MES T1" (CSV original)
                const mes = (r[`Mes ${label}`] || r[`MES ${label}`] || '').trim().toUpperCase();
                if (!mes) continue;
                const statusRaw = (r[`Status ${label}`] || r[`STATUS ${label}`] || '').trim();
                const status    = normalizeStatus(statusRaw);
                if (!status) continue;
                const npsRaw = r[`NPS ${label}`] ?? r[`Nps ${label}`];
                data.push({
                  diretoria, nome, fornecedor, tipo, horas,
                  turma:        label,
                  mes,
                  data_:        (r[`Data ${label}`] || r[`DATA ${label}`] || '').trim(),
                  statusRaw,
                  status,
                  convidados:   parseNumber(r[`Convidados ${label}`] ?? r[`CONVIDADOS ${label}`]),
                  presentes:    parseNumber(r[`Presentes ${label}`]  ?? r[`PRESENTES ${label}`]),
                  nps:          (npsRaw !== '' && npsRaw !== undefined) ? parseNumber(npsRaw) : null,
                  justificativa:(r[`Justificativa ${label}`] || r[`JUSTIFICATIVA ${label}`] || '').trim(),
                });
              }
            });
            setRows(data);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Erro ao carregar base:', error);
        setFetchError(error.message || 'Erro desconhecido');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleGlobalClick = () => { setOpenFilter(null); };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const toggleMulti = (value, selected, setSelected) =>
    setSelected(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const resetFilters = () => {
    setFilterDiretorias([]); setFilterFornecedores([]); setFornecedorSearch('');
    setFilterTipos([]); setFilterMonths([]); setFilterStatuses([]); setOpenFilter(null);
  };

  const diretorias = useMemo(() => [...new Set(rows.map((r) => r.diretoria))].filter(Boolean).sort(), [rows]);
  const fornecedores = useMemo(() => [...new Set(rows.map((r) => r.fornecedor))].filter(Boolean).sort(), [rows]);
  const tipos = useMemo(() => [...new Set(rows.map((r) => r.tipo))].filter(Boolean).sort(), [rows]);

  const fornecedoresFiltered = useMemo(() => {
    if (!fornecedorSearch.trim()) return fornecedores;
    const q = fornecedorSearch.trim().toLowerCase();
    return fornecedores.filter((f) => f.toLowerCase().includes(q));
  }, [fornecedores, fornecedorSearch]);

  const filteredRows = useMemo(() => rows.filter((r) =>
    (filterDiretorias.length === 0 || filterDiretorias.includes(r.diretoria)) &&
    (filterFornecedores.length === 0 || filterFornecedores.includes(r.fornecedor)) &&
    (filterTipos.length === 0 || filterTipos.includes(r.tipo)) &&
    (filterMonths.length === 0 || filterMonths.includes(r.mes)) &&
    statusMatchesFilter(r.statusRaw, filterStatuses)
  ), [rows, filterDiretorias, filterFornecedores, filterTipos, filterMonths, filterStatuses]);

  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_ORDER.forEach((s) => { counts[s] = 0; });
    filteredRows.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status] += 1; });
    return counts;
  }, [filteredRows]);

  const totalCount = filteredRows.length || 1;

  const realizados = useMemo(() => filteredRows.filter((r) => r.status === 'Realizado'), [filteredRows]);
  const pessoasImpactadas = useMemo(() => realizados.reduce((acc, r) => acc + (r.presentes || 0), 0), [realizados]);
  const horasFormacao = useMemo(() => realizados.reduce((acc, r) => acc + (r.presentes || 0) * (r.horas || 0), 0), [realizados]);
  const horaPorPessoa = pessoasImpactadas > 0 ? (horasFormacao / pessoasImpactadas) : 0;

  const planningData = useMemo(() => FUTURE_MONTHS.map((m) => {
    const items = filteredRows.filter((r) => r.mes === m);
    const total = items.length;
    const concluidos = items.filter((r) => r.status === 'Realizado').length;
    const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    return { mes: m, total, concluidos, pct };
  }), [filteredRows]);

  const calendarRows = useMemo(() => {
    const grouped = new Map();
    filteredRows.forEach((r) => {
      const key = `${r.diretoria}|||${r.nome}`;
      if (!grouped.has(key)) grouped.set(key, { diretoria: r.diretoria, nome: r.nome, fornecedor: r.fornecedor, tipo: r.tipo, byMonth: {} });
      const entry = grouped.get(key);
      if (r.mes) {
        if (!entry.byMonth[r.mes]) entry.byMonth[r.mes] = [];
        entry.byMonth[r.mes].push(r);
      }
    });
    return [...grouped.values()].sort((a, b) =>
      a.diretoria.localeCompare(b.diretoria, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR')
    );
  }, [filteredRows]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <RefreshCw size={40} style={{ color: C.purple, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <div style={{ background: C.white, borderRadius: '16px', padding: '32px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', maxWidth: '500px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 800, color: C.red, marginBottom: '8px' }}>Erro ao carregar a planilha</p>
          <p style={{ fontSize: '12px', color: C.gray600, marginBottom: '16px' }}>{fetchError}</p>
          <p style={{ fontSize: '11px', color: C.gray400 }}>Verifique se a planilha está compartilhada como <strong>"Qualquer pessoa com o link pode ver"</strong> e se o link está correto.</p>
        </div>
      </div>
    );
  }

  const hasAnyFilter = filterDiretorias.length + filterFornecedores.length + filterTipos.length + filterMonths.length + filterStatuses.length > 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.navy, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 20px 60px', boxSizing: 'border-box' }}>

        {/* HEADER */}
        <DashboardHeader />

        {/* KPIs — faixa horizontal compacta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '12px 0 10px' }}>
          <KpiCard icon={Users}     label="Pessoas Impactadas" value={pessoasImpactadas}              sub="participantes únicos"    accentColor={C.purple} />
          <KpiCard icon={Clock}     label="Horas de Formação"  value={Math.round(horasFormacao)}      sub="carga horária total"     accentColor={C.orange} />
          <KpiCard icon={Hourglass} label="Hora / Pessoa"      value={`${horaPorPessoa.toFixed(1)}h`} sub="média por participante"  accentColor={C.magenta} />
        </div>

        {/* STATUS GERAL */}
        {(() => {
          const primary   = ['Realizado', 'Em andamento', 'Stand-by', 'Planejado'];
          const secondary = ['Reagendado', 'Atrasado', 'Cancelado'];
          return (
            <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.gray200}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '10px' }}>
              {/* Header */}
              <div style={{ padding: '9px 18px', background: C.purpleBg, borderBottom: `1px solid #e8d5f5`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.purple, flexShrink: 0 }} />
                <p style={{ fontSize: '9.5px', color: C.purple, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.18em', lineHeight: 1 }}>Status Geral do Programa</p>
              </div>

              <div style={{ padding: '14px 18px 16px' }}>
                {/* Linha 1 — 4 status principais: cards maiores com fundo colorido */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  {primary.map((s) => {
                    const count = statusCounts[s] || 0;
                    const pct   = Math.round((count / totalCount) * 100);
                    const meta  = STATUS_CARD_META[s];
                    return (
                      <div key={s} style={{
                        borderRadius: '12px',
                        border: `1.5px solid ${pct === 0 ? C.gray200 : meta.softBg === C.gray100 ? C.gray200 : meta.softBg}`,
                        padding: '12px 14px',
                        backgroundColor: pct === 0 ? '#fafafa' : meta.softBg,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: pct === 0 ? C.gray400 : meta.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: pct === 0 ? C.gray400 : C.slate, lineHeight: 1 }}>{s}</span>
                        </div>
                        <p style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.3px', color: pct === 0 ? C.gray400 : meta.softColor }}>{pct}%</p>
                        <p style={{ fontSize: '10px', fontWeight: 600, color: pct === 0 ? C.gray200 : C.gray400, marginTop: '4px' }}>{count} {count === 1 ? 'ação' : 'ações'}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Linha 2 — 3 status secundários: menores, discretos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  {secondary.map((s) => {
                    const count = statusCounts[s] || 0;
                    const pct   = Math.round((count / totalCount) * 100);
                    const meta  = STATUS_CARD_META[s];
                    const active = pct > 0;
                    return (
                      <div key={s} style={{
                        borderRadius: '10px',
                        border: `1px solid ${active ? meta.softBg : C.gray200}`,
                        padding: '10px 14px',
                        backgroundColor: active ? meta.softBg : '#fafafa',
                        display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: active ? meta.color : C.gray400, flexShrink: 0, opacity: active ? 1 : 0.4 }} />
                        <div>
                          <p style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: active ? C.slate : C.gray400, lineHeight: 1, marginBottom: '3px' }}>{s}</p>
                          <p style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.3px', color: active ? meta.softColor : C.gray400 }}>{pct}%
                            <span style={{ fontSize: '10px', fontWeight: 600, color: active ? C.gray400 : C.gray200, marginLeft: '5px' }}>· {count} {count === 1 ? 'ação' : 'ações'}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Régua grossa */}
                <div style={{ height: '10px', backgroundColor: C.gray100, borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                  {STATUS_ORDER.map((s) => {
                    const count = statusCounts[s] || 0;
                    const pct   = (count / totalCount) * 100;
                    if (pct === 0) return null;
                    return (
                      <div key={`bar-${s}`}
                        style={{ width: `${pct}%`, backgroundColor: STATUS_CARD_META[s].color, height: '100%', transition: 'width 0.5s ease' }}
                        title={`${s}: ${count} (${Math.round(pct)}%)`}
                      />
                    );
                  })}
                </div>
                {/* Legenda inline da régua */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '7px', flexWrap: 'wrap' }}>
                  {STATUS_ORDER.filter(s => (statusCounts[s] || 0) > 0).map((s) => {
                    const count = statusCounts[s] || 0;
                    const pct   = Math.round((count / totalCount) * 100);
                    return (
                      <div key={`leg-${s}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: STATUS_CARD_META[s].color, flexShrink: 0 }} />
                        <span style={{ fontSize: '9px', fontWeight: 600, color: C.gray400 }}>{s} {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* FILTROS */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          backgroundColor: C.bg, padding: '8px 0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            background: C.white, borderRadius: '12px', border: `1px solid ${C.gray200}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          }}>
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 800, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.12em', marginRight: '4px', flexShrink: 0 }}>
              <Filter size={12} style={{ color: C.purple }} /> Filtros
            </div>

            <FilterDropdown label="Diretoria" activeCount={filterDiretorias.length} filterKey="diretoria" openFilter={openFilter} setOpenFilter={setOpenFilter}>
              {diretorias.map((d) => <CheckItem key={d} label={d} checked={filterDiretorias.includes(d)} onChange={() => toggleMulti(d, filterDiretorias, setFilterDiretorias)} />)}
            </FilterDropdown>

            <FilterDropdown label="Fornecedor / Facilitador" activeCount={filterFornecedores.length} filterKey="fornecedor" openFilter={openFilter} setOpenFilter={setOpenFilter}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: C.gray400 }} />
                <input
                  type="text" value={fornecedorSearch}
                  onChange={(e) => setFornecedorSearch(e.target.value)}
                  placeholder="Buscar..."
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '100%', fontSize: '12px', border: `1px solid ${C.gray200}`, borderRadius: '8px', padding: '6px 8px 6px 26px', outline: 'none', boxSizing: 'border-box', color: C.navy }}
                />
              </div>
              {fornecedoresFiltered.length === 0
                ? <p style={{ fontSize: '11px', color: C.gray400, padding: '4px' }}>Nenhum resultado.</p>
                : fornecedoresFiltered.map((f) => <CheckItem key={f} label={f} checked={filterFornecedores.includes(f)} onChange={() => toggleMulti(f, filterFornecedores, setFilterFornecedores)} />)
              }
            </FilterDropdown>

            <FilterDropdown label="Tipo" activeCount={filterTipos.length} filterKey="tipo" openFilter={openFilter} setOpenFilter={setOpenFilter}>
              {tipos.map((t) => <CheckItem key={t} label={t} checked={filterTipos.includes(t)} onChange={() => toggleMulti(t, filterTipos, setFilterTipos)} />)}
            </FilterDropdown>

            <FilterDropdown label="Mês" activeCount={filterMonths.length} filterKey="mes" openFilter={openFilter} setOpenFilter={setOpenFilter}>
              {MONTHS.map((m) => <CheckItem key={m} label={m} checked={filterMonths.includes(m)} onChange={() => toggleMulti(m, filterMonths, setFilterMonths)} />)}
            </FilterDropdown>

            <FilterDropdown label="Status" activeCount={filterStatuses.length} filterKey="status" openFilter={openFilter} setOpenFilter={setOpenFilter}>
              {STATUS_ORDER.map((s) => <CheckItem key={s} label={s} checked={filterStatuses.includes(s)} onChange={() => toggleMulti(s, filterStatuses, setFilterStatuses)} />)}
            </FilterDropdown>

            {hasAnyFilter && (
              <button onClick={resetFilters} style={{
                marginLeft: '4px', fontSize: '10px', fontWeight: 700, color: C.slate,
                background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', gap: '3px',
              }}>
                <X size={11} /> Limpar
              </button>
            )}

            {/* Legenda */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {STATUS_ORDER.map((s) => {
                const meta = STATUS_CARD_META[s];
                return (
                  <div key={`legend-${s}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.gray600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: meta.color, flexShrink: 0, opacity: s === 'Planejado' ? 0.4 : 1 }} />
                    {s}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PLANEJAMENTO DOS PRÓXIMOS MESES */}
        <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.gray200}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden', margin: '12px 0' }}>
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.gray100}`, background: C.gray100 }}>
            <p style={{ fontSize: '10px', color: C.slate, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.16em', lineHeight: 1 }}>Planejamento dos Próximos Meses</p>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
              {planningData.map((d) => <MonthCard key={d.mes} {...d} />)}
            </div>
          </div>
        </div>

        {/* CALENDÁRIO OPERACIONAL */}
        <div style={{ background: C.white, borderRadius: '16px', border: `1px solid ${C.gray200}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {/* Barra de scroll no topo — espelha o scroll da tabela */}
          <div
            id="top-scroll"
            style={{ overflowX: 'auto', overflowY: 'hidden', height: '12px' }}
            onScroll={(e) => {
              const bottom = document.getElementById('table-scroll');
              if (bottom) bottom.scrollLeft = e.currentTarget.scrollLeft;
            }}
          >
            <div id="top-scroll-inner" style={{ height: '1px' }} />
          </div>
          <div
            id="table-scroll"
            style={{ overflowX: 'auto' }}
            onScroll={(e) => {
              const top = document.getElementById('top-scroll');
              if (top) top.scrollLeft = e.currentTarget.scrollLeft;
              const inner = document.getElementById('top-scroll-inner');
              if (inner) inner.style.width = e.currentTarget.scrollWidth + 'px';
            }}
            ref={(el) => {
              if (el) {
                const inner = document.getElementById('top-scroll-inner');
                if (inner) inner.style.width = el.scrollWidth + 'px';
              }
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: C.navy, color: C.white }}>
                  <th style={{ padding: '12px', fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.14em', width: '80px', textAlign: 'center' }}>Diretoria</th>
                  <th style={{ padding: '12px', fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.14em', minWidth: '220px', textAlign: 'left' }}>Capacitação Técnica</th>
                  {MONTHS.map((m) => (
                    <th key={m} style={{ padding: '10px 6px', fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', textAlign: 'center', width: '78px', minWidth: '78px' }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarRows.map((training, idx) => (
                  <tr key={`${training.diretoria}-${idx}`} style={{ borderBottom: `1px solid ${C.gray100}` }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafbff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = C.white}
                  >
                    <td style={{ padding: '10px 8px', borderRight: `1px solid ${C.gray100}`, textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: C.slate, textTransform: 'uppercase' }}>{training.diretoria}</span>
                    </td>
                    <td style={{ padding: '10px 12px', borderRight: `1px solid ${C.gray100}` }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy }}>{training.nome}</span>
                      {training.fornecedor && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                          <span style={{ fontSize: '9.5px', fontWeight: 600, color: C.gray400 }}>{training.fornecedor}</span>
                          {training.tipo && (
                            <>
                              <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: training.tipo.toLowerCase() === 'externo' ? C.orange : C.purple, flexShrink: 0 }} />
                              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: training.tipo.toLowerCase() === 'externo' ? C.orange : C.purple }}>{training.tipo}</span>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    {MONTHS.map((m) => {
                      const cellItems = training.byMonth[m] || [];
                      return (
                        <td key={m} style={{ padding: '6px 4px', textAlign: 'center', borderLeft: `1px solid ${C.gray100}`, width: '78px', minWidth: '78px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minHeight: '40px', justifyContent: 'center' }}>
                            {cellItems.map((cls, ci) => {
                              const style = getStatusStyle(cls.status);
                              const hasDetail = ['Atrasado', 'Reagendado', 'Stand-by'].includes(cls.status);
                              const detailId = `${idx}-${m}-${ci}`;
                              return (
                                <div
                                  key={detailId}
                                  onClick={hasDetail ? (e) => {
                                    e.stopPropagation();
                                    setActiveDetail(activeDetail?.id === detailId ? null : { id: detailId, training, cls });
                                  } : undefined}
                                  style={{
                                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    minWidth: '62px', maxWidth: '74px', minHeight: '38px',
                                    padding: '5px 6px', borderRadius: '6px',
                                    backgroundColor: style.bg, color: style.text,
                                    border: style.border || 'none',
                                    cursor: hasDetail ? 'pointer' : 'default',
                                    transition: 'opacity 0.15s, transform 0.1s',
                                    boxShadow: style.bg !== 'transparent' ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                                  }}
                                  onMouseEnter={(e) => hasDetail && (e.currentTarget.style.opacity = '0.85')}
                                  onMouseLeave={(e) => hasDetail && (e.currentTarget.style.opacity = '1')}
                                >
                                  <span style={{ fontSize: '9px', fontWeight: 800, lineHeight: 1.2, textAlign: 'center' }}>{cls.turma}</span>
                                  {cls.data_ && <span style={{ fontSize: '8px', fontWeight: 600, lineHeight: 1.2, textAlign: 'center', opacity: 0.85 }}>{cls.data_}</span>}
                                  {cls.status === 'Reagendado' && <CalendarClock size={9} style={{ marginTop: '2px' }} />}
                                  {cls.status === 'Atrasado'   && <AlertTriangle  size={9} style={{ marginTop: '2px' }} />}
                                  {cls.status === 'Stand-by'   && <Pause          size={9} style={{ marginTop: '2px' }} />}
                                  {cls.status === 'Cancelado'  && <XCircle        size={9} style={{ marginTop: '2px' }} />}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <footer style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ height: '1px', width: '48px', backgroundColor: C.gray200 }} />
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: C.purple }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: C.green }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: C.orange }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: C.magenta }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: C.red }} />
            </div>
            <div style={{ height: '1px', width: '48px', backgroundColor: C.gray200 }} />
          </div>
        </footer>
      </div>

      {/* DETAIL PANEL */}
      <DetailPanel detail={activeDetail} onClose={() => setActiveDetail(null)} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; margin: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        @media print {
          header { position: static !important; }
          table { border: 1px solid #ddd !important; }
          thead tr { background-color: #0f1e35 !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default App;
