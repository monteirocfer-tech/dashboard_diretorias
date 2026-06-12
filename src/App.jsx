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
  Pause
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const CSV_URL = './base_diretorias.csv';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const FUTURE_MONTHS = ['JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const colors = {
  magenta: '#d61c59',
  green: '#2E7D32',
  orange: '#F57C00',
  purple: '#7B1FA2',
  blue: '#0288D1',
  graphite: '#333333',
  canceled: '#546E7A',
  rescheduled: '#6a1b9a',
  delayed: '#e65100',
  planned: '#cbd5e1',
  standby: '#0288D1',
  navy: '#1e293b',
};

// ─────────────────────────────────────────────────────────────
// STATUS NORMALIZATION
// ─────────────────────────────────────────────────────────────
const STATUS_ORDER = ['Realizado', 'Em andamento', 'Planejado', 'Cancelado', 'Reagendado', 'Atrasado', 'Stand-by'];

const normalizeStatus = (status) => {
  const raw = (status || '').toString().trim().toLowerCase();
  if (raw.startsWith('real')) return 'Realizado';
  if (raw.startsWith('em and')) return 'Em andamento';
  if (raw.startsWith('plan')) return 'Planejado';
  if (raw.startsWith('cancel')) return 'Cancelado';
  if (raw.startsWith('reagend')) return 'Reagendado';
  if (raw.startsWith('atras')) return 'Atrasado';
  if (raw.startsWith('stand')) return 'Stand-by';
  return null;
};

const statusMatchesFilter = (status, selected) => {
  if (!selected || selected.length === 0) return true;
  return selected.includes(normalizeStatus(status));
};

const getStatusStyle = (statusNorm) => {
  switch (statusNorm) {
    case 'Realizado': return { bg: colors.green, text: 'white' };
    case 'Em andamento': return { bg: colors.magenta, text: 'white' };
    case 'Cancelado': return { bg: colors.canceled, text: 'white' };
    case 'Reagendado': return { bg: colors.rescheduled, text: 'white' };
    case 'Atrasado': return { bg: colors.delayed, text: 'white' };
    case 'Stand-by': return { bg: colors.standby, text: 'white' };
    default: return { bg: 'transparent', text: '#9ca3af', border: '2px dashed #e5e7eb' };
  }
};

const getStatusDotColor = (statusNorm) => {
  switch (statusNorm) {
    case 'Realizado': return colors.green;
    case 'Em andamento': return colors.magenta;
    case 'Planejado': return colors.planned;
    case 'Cancelado': return colors.canceled;
    case 'Reagendado': return colors.rescheduled;
    case 'Atrasado': return colors.delayed;
    case 'Stand-by': return colors.standby;
    default: return '#cbd5e1';
  }
};

// ─────────────────────────────────────────────────────────────
// PARSING HELPERS
// ─────────────────────────────────────────────────────────────
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number.parseFloat(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────
const DashboardHeader = () => (
  <header className="dashboard-header md:sticky md:top-0 z-50 shadow-sm">
    <div className="header-content">
      <div>
        <h1 className="dashboard-title">
          CAPACITAÇÕES <span style={{ color: '#d61c59' }}>CORPORATIVAS</span>
        </h1>
        <p className="dashboard-subtitle">Acompanhamento das ações de desenvolvimento corporativo da organização</p>
      </div>
    </div>
  </header>
);

const App = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterDiretorias, setFilterDiretorias] = useState([]);
  const [filterFornecedores, setFilterFornecedores] = useState([]);
  const [fornecedorSearch, setFornecedorSearch] = useState('');
  const [filterTipos, setFilterTipos] = useState([]);
  const [filterMonths, setFilterMonths] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [openFilter, setOpenFilter] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);

  // ── LOAD DATA ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(CSV_URL, { cache: 'no-store' });
        const text = await response.text();
        Papa.parse(text.replace(/^\uFEFF/, ''), {
          header: true,
          skipEmptyLines: 'greedy',
          delimiter: ';',
          complete: (result) => {
            const data = (result.data || [])
              .map((r) => ({
                diretoria: (r.Diretoria || '').trim(),
                nome: (r.Nome || '').trim(),
                fornecedor: (r.Fornecedor || '').trim(),
                tipo: (r.Tipo || '').trim(),
                horas: parseNumber(r.Horas),
                turma: (r.Turma || '').trim(),
                mes: (r.Mes || '').trim().toUpperCase(),
                data_: (r.Data || '').trim(),
                statusRaw: (r.Status || '').trim(),
                status: normalizeStatus(r.Status),
                convidados: parseNumber(r.Convidados),
                presentes: parseNumber(r.Presentes),
                nps: r.NPS !== '' && r.NPS !== undefined ? parseNumber(r.NPS) : null,
                justificativa: (r.Justificativa || '').trim(),
              }))
              .filter((r) => r.nome && r.status);
            setRows(data);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Erro ao carregar base:', error);
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

  const toggleMulti = (value, selected, setSelected) => {
    setSelected(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const resetFilters = () => {
    setFilterDiretorias([]);
    setFilterFornecedores([]);
    setFornecedorSearch('');
    setFilterTipos([]);
    setFilterMonths([]);
    setFilterStatuses([]);
    setOpenFilter(null);
  };

  // ── FILTER OPTIONS ──
  const diretorias = useMemo(() => [...new Set(rows.map((r) => r.diretoria))].filter(Boolean).sort(), [rows]);
  const fornecedores = useMemo(() => [...new Set(rows.map((r) => r.fornecedor))].filter(Boolean).sort(), [rows]);
  const tipos = useMemo(() => [...new Set(rows.map((r) => r.tipo))].filter(Boolean).sort(), [rows]);

  const fornecedoresFiltered = useMemo(() => {
    if (!fornecedorSearch.trim()) return fornecedores;
    const q = fornecedorSearch.trim().toLowerCase();
    return fornecedores.filter((f) => f.toLowerCase().includes(q));
  }, [fornecedores, fornecedorSearch]);

  // ── FILTERED ROWS ──
  const filteredRows = useMemo(() => {
    return rows.filter((r) =>
      (filterDiretorias.length === 0 || filterDiretorias.includes(r.diretoria)) &&
      (filterFornecedores.length === 0 || filterFornecedores.includes(r.fornecedor)) &&
      (filterTipos.length === 0 || filterTipos.includes(r.tipo)) &&
      (filterMonths.length === 0 || filterMonths.includes(r.mes)) &&
      statusMatchesFilter(r.statusRaw, filterStatuses)
    );
  }, [rows, filterDiretorias, filterFornecedores, filterTipos, filterMonths, filterStatuses]);

  // ── STATUS SUMMARY ──
  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_ORDER.forEach((s) => { counts[s] = 0; });
    filteredRows.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status] += 1; });
    return counts;
  }, [filteredRows]);

  const totalCount = filteredRows.length || 1;

  // ── KPIs: Pessoas Impactadas / Horas / Hora-Pessoa ──
  const realizados = useMemo(() => filteredRows.filter((r) => r.status === 'Realizado'), [filteredRows]);
  const pessoasImpactadas = useMemo(() => realizados.reduce((acc, r) => acc + (r.presentes || 0), 0), [realizados]);
  const horasFormacao = useMemo(
    () => realizados.reduce((acc, r) => acc + (r.presentes || 0) * (r.horas || 0), 0),
    [realizados]
  );
  const horaPorPessoa = pessoasImpactadas > 0 ? (horasFormacao / pessoasImpactadas) : 0;

  // ── PLANEJAMENTO PRÓXIMOS MESES (heatmap) ──
  const planningData = useMemo(() => {
    return FUTURE_MONTHS.map((m) => {
      const items = filteredRows.filter((r) => r.mes === m);
      const total = items.length;
      const concluidos = items.filter((r) => r.status === 'Realizado').length;
      const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
      return { mes: m, total, concluidos, pct };
    });
  }, [filteredRows]);

  const heatColor = (pct, total) => {
    if (total === 0) return '#f1f5f9';
    if (pct >= 75) return colors.green;
    if (pct >= 40) return '#a3d977';
    if (pct > 0) return colors.orange;
    return '#fde68a';
  };

  // ── CALENDÁRIO: agrupar por treinamento ──
  const calendarRows = useMemo(() => {
    const grouped = new Map();
    filteredRows.forEach((r) => {
      const key = `${r.diretoria}|||${r.nome}`;
      if (!grouped.has(key)) {
        grouped.set(key, { diretoria: r.diretoria, nome: r.nome, byMonth: {} });
      }
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
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
        <RefreshCw className="animate-spin text-pink-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#333333] font-sans selection:bg-pink-100 relative pb-20">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/p6.png')" }}
      ></div>

      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 pb-7 pt-4 box-border">
        {/* ── HEADER ── */}
        <DashboardHeader />

        {/* ── STATUS GERAL + KPIs ── */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 mb-3 mt-3">
          {/* STATUS GERAL */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <p className="text-[11px] text-slate-600 uppercase font-black tracking-[0.16em] leading-none">Status Geral do Programa</p>
            </div>
            <div className="p-3.5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {STATUS_ORDER.map((s) => {
                  const count = statusCounts[s] || 0;
                  const pct = Math.round((count / totalCount) * 100);
                  const dot = getStatusDotColor(s);
                  return (
                    <div key={s} className="rounded-lg border border-gray-100 p-2.5 bg-slate-50/70">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }}></span>
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 leading-none">{s}</span>
                      </div>
                      <p className="text-2xl font-black leading-none" style={{ color: dot === colors.planned ? '#94a3b8' : dot }}>{pct}%</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">{count} ações</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                  {STATUS_ORDER.map((s) => {
                    const count = statusCounts[s] || 0;
                    const pct = (count / totalCount) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={`bar-${s}`}
                        style={{ width: `${pct}%`, backgroundColor: getStatusDotColor(s) }}
                        className="h-full"
                        title={`${s}: ${count} (${Math.round(pct)}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="flex flex-col gap-2">
            <div className="bg-[#1e293b] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Users size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-300 leading-none">Pessoas impactadas</p>
                <p className="text-xl font-black text-white leading-tight mt-0.5">{pessoasImpactadas}</p>
              </div>
            </div>
            <div className="bg-[#1e293b] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-300 leading-none">Horas de formação</p>
                <p className="text-xl font-black text-white leading-tight mt-0.5">{Math.round(horasFormacao)}</p>
              </div>
            </div>
            <div className="bg-[#1e293b] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Hourglass size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-300 leading-none">Hora / pessoa</p>
                <p className="text-xl font-black text-white leading-tight mt-0.5">{horaPorPessoa.toFixed(1)}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTROS ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-3 sticky top-0 md:top-[76px] z-40 bg-[#f1f5f9] py-2 shadow-[0_4px_12px_rgba(0,0,0,0.07)]">
          <div className="bg-white w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-1.5 rounded-2xl sm:rounded-full shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-2.5 relative flex-wrap">
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest sm:mr-1">
              <Filter size={14} /> Filtros:
            </div>

            {/* DIRETORIA */}
            <div className="relative w-full sm:w-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === 'diretoria' ? null : 'diretoria'); }}
                className="bg-transparent text-[11px] font-black uppercase tracking-wide outline-none cursor-pointer sm:border-r sm:pr-3 flex items-center justify-between gap-1 w-full sm:w-auto"
              >
                Diretoria{filterDiretorias.length > 0 ? `: ${filterDiretorias.length}` : ''}
                <ChevronDown size={15} className="text-gray-500" />
              </button>
              {openFilter === 'diretoria' && (
                <div onClick={(e) => e.stopPropagation()} className="z-20 mt-2 sm:absolute sm:top-8 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-full sm:min-w-56 max-h-64 overflow-y-auto">
                  {diretorias.map((d) => (
                    <label key={d} className="flex items-center gap-2 py-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={filterDiretorias.includes(d)} onChange={() => toggleMulti(d, filterDiretorias, setFilterDiretorias)} />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* FORNECEDOR / FACILITADOR */}
            <div className="relative w-full sm:w-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === 'fornecedor' ? null : 'fornecedor'); }}
                className="bg-transparent text-[11px] font-black uppercase tracking-wide outline-none cursor-pointer sm:border-r sm:pr-3 flex items-center justify-between gap-1 w-full sm:w-auto"
              >
                Fornecedor/Facilitador{filterFornecedores.length > 0 ? `: ${filterFornecedores.length}` : ''}
                <ChevronDown size={15} className="text-gray-500" />
              </button>
              {openFilter === 'fornecedor' && (
                <div onClick={(e) => e.stopPropagation()} className="z-20 mt-2 sm:absolute sm:top-8 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-full sm:min-w-64 max-h-72 overflow-y-auto">
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={fornecedorSearch}
                      onChange={(e) => setFornecedorSearch(e.target.value)}
                      placeholder="Buscar fornecedor ou facilitador..."
                      className="w-full text-xs border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 outline-none focus:border-pink-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {fornecedoresFiltered.length === 0 && (
                    <p className="text-[11px] text-gray-400 py-1">Nenhum fornecedor encontrado.</p>
                  )}
                  {fornecedoresFiltered.map((f) => (
                    <label key={f} className="flex items-center gap-2 py-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={filterFornecedores.includes(f)} onChange={() => toggleMulti(f, filterFornecedores, setFilterFornecedores)} />
                      <span>{f}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* TIPO */}
            <div className="relative w-full sm:w-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === 'tipo' ? null : 'tipo'); }}
                className="bg-transparent text-[11px] font-black uppercase tracking-wide outline-none cursor-pointer sm:border-r sm:pr-3 flex items-center justify-between gap-1 w-full sm:w-auto"
              >
                Tipo{filterTipos.length > 0 ? `: ${filterTipos.length}` : ''}
                <ChevronDown size={15} className="text-gray-500" />
              </button>
              {openFilter === 'tipo' && (
                <div onClick={(e) => e.stopPropagation()} className="z-20 mt-2 sm:absolute sm:top-8 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-full sm:min-w-40 max-h-64 overflow-y-auto">
                  {tipos.map((t) => (
                    <label key={t} className="flex items-center gap-2 py-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={filterTipos.includes(t)} onChange={() => toggleMulti(t, filterTipos, setFilterTipos)} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* MÊS */}
            <div className="relative w-full sm:w-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === 'mes' ? null : 'mes'); }}
                className="bg-transparent text-[11px] font-black uppercase tracking-wide outline-none cursor-pointer sm:border-r sm:pr-3 flex items-center justify-between gap-1 w-full sm:w-auto"
              >
                Mês{filterMonths.length > 0 ? `: ${filterMonths.length}` : ''}
                <ChevronDown size={15} className="text-gray-500" />
              </button>
              {openFilter === 'mes' && (
                <div onClick={(e) => e.stopPropagation()} className="z-20 mt-2 sm:absolute sm:top-8 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-full sm:min-w-48 max-h-64 overflow-y-auto">
                  {MONTHS.map((m) => (
                    <label key={m} className="flex items-center gap-2 py-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={filterMonths.includes(m)} onChange={() => toggleMulti(m, filterMonths, setFilterMonths)} />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* STATUS */}
            <div className="relative w-full sm:w-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === 'status' ? null : 'status'); }}
                className="bg-transparent text-[11px] font-black uppercase tracking-wide outline-none cursor-pointer w-full sm:w-auto flex items-center justify-between gap-1"
              >
                Status{filterStatuses.length > 0 ? `: ${filterStatuses.length}` : ''}
                <ChevronDown size={15} className="text-gray-500" />
              </button>
              {openFilter === 'status' && (
                <div onClick={(e) => e.stopPropagation()} className="z-20 mt-2 sm:absolute sm:top-8 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-full sm:min-w-48 max-h-64 overflow-y-auto">
                  {STATUS_ORDER.map((s) => (
                    <label key={s} className="flex items-center gap-2 py-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={filterStatuses.includes(s)} onChange={() => toggleMulti(s, filterStatuses, setFilterStatuses)} />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button onClick={resetFilters} className="sm:ml-2 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:text-slate-700 text-left">
              Limpar filtros
            </button>
          </div>

          {/* Legend */}
          <div className="sm:ml-auto flex items-center gap-3.5 flex-wrap">
            {STATUS_ORDER.map((s) => (
              <div key={`legend-${s}`} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={
                    s === 'Planejado'
                      ? { border: '1px solid #cbd5e1' }
                      : { backgroundColor: getStatusDotColor(s) }
                  }
                ></div>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* ── PLANEJAMENTO PRÓXIMOS MESES (heatmap) ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-[11px] text-slate-600 uppercase font-black tracking-[0.16em] leading-none">Planejamento dos próximos meses</p>
          </div>
          <div className="p-3.5">
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2.5">
              {planningData.map((d) => (
                <div
                  key={d.mes}
                  className="rounded-lg p-2.5 flex flex-col items-center justify-center min-h-[88px]"
                  style={{ backgroundColor: heatColor(d.pct, d.total), opacity: d.total === 0 ? 0.5 : 1 }}
                >
                  <span className="text-[10px] font-black uppercase tracking-wide text-white/90 mb-1">{d.mes}</span>
                  <span className="text-2xl font-black text-white leading-none">{d.total}</span>
                  <span className="text-[10px] font-bold text-white/90 mt-1">{d.pct}% concl.</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-[10px] font-black uppercase text-slate-400">Conclusão:</span>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors.green }}></span> Alta (75%+)
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#a3d977' }}></span> Média (40-74%)
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors.orange }}></span> Baixa (1-39%)
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#fde68a' }}></span> Sem realizações
              </div>
            </div>
          </div>
        </div>

        {/* ── CALENDÁRIO OPERACIONAL ── */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: colors.navy }}>
                  <th className="p-3 text-[9px] uppercase font-black tracking-widest w-24 text-center sticky top-0 z-10">Diretoria</th>
                  <th className="p-3 text-[9px] uppercase font-black tracking-widest min-w-[240px] sticky top-0 z-10">Capacitação</th>
                  {MONTHS.map((m) => (
                    <th key={m} className="p-2 text-[9px] uppercase font-black tracking-wide text-center w-[78px] min-w-[78px] max-w-[78px] sticky top-0 z-10">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calendarRows.map((training, idx) => (
                  <tr key={`${training.diretoria}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-r border-gray-50 text-center">
                      <span className="text-[10px] font-black text-gray-500 uppercase">{training.diretoria}</span>
                    </td>
                    <td className="p-3 border-r border-gray-50">
                      <span className="text-[13px] font-extrabold text-slate-800">{training.nome}</span>
                    </td>
                    {MONTHS.map((m) => {
                      const cellItems = training.byMonth[m] || [];
                      return (
                        <td key={m} className="py-2.5 px-2 align-middle overflow-visible text-center border-l border-gray-50 w-[78px] min-w-[78px] max-w-[78px]">
                          <div className="flex flex-col items-center gap-2 min-h-[46px] overflow-visible">
                            {cellItems.map((cls, ci) => {
                              const style = getStatusStyle(cls.status);
                              const hasDetail = ['Atrasado', 'Reagendado', 'Stand-by'].includes(cls.status);
                              const detailId = `${idx}-${m}-${ci}`;
                              const isOpen = activeDetail?.id === detailId;
                              return (
                                <div key={detailId} className="relative">
                                  <div
                                    className={`inline-flex flex-col items-center justify-center min-w-[64px] max-w-[78px] min-h-[40px] py-1.5 px-2 rounded shadow-sm transition-transform hover:scale-[1.02] ${hasDetail ? 'cursor-pointer' : ''}`}
                                    style={{
                                      backgroundColor: style.bg,
                                      color: style.text,
                                      border: style.border || 'none',
                                      lineHeight: 1.1,
                                    }}
                                    onClick={hasDetail ? (e) => {
                                      e.stopPropagation();
                                      setActiveDetail(isOpen ? null : { id: detailId, training, cls });
                                    } : undefined}
                                  >
                                    <span className="text-[9px] font-black leading-none">{cls.turma}</span>
                                    {cls.status === 'Reagendado' && (
                                      <div className="mt-1 flex items-center gap-1">
                                        <CalendarClock size={10} />
                                      </div>
                                    )}
                                    {cls.status === 'Atrasado' && (
                                      <div className="mt-1 flex items-center gap-1">
                                        <AlertTriangle size={10} />
                                      </div>
                                    )}
                                    {cls.status === 'Stand-by' && (
                                      <div className="mt-1 flex items-center gap-1">
                                        <Pause size={10} />
                                      </div>
                                    )}
                                    {cls.status === 'Cancelado' && (
                                      <div className="mt-1 flex items-center gap-1">
                                        <XCircle size={10} />
                                      </div>
                                    )}
                                  </div>

                                  {isOpen && (
                                    <div
                                      className="absolute z-50 bottom-full left-1/2 mb-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-left"
                                      style={{ transform: 'translateX(-50%)' }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: style.bg }}></div>
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">{cls.status} · {cls.turma}</span>
                                      </div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Treinamento</p>
                                      <p className="text-xs text-slate-700 leading-relaxed mb-2">{training.nome}</p>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Justificativa</p>
                                      {cls.justificativa
                                        ? <p className="text-xs text-slate-700 leading-relaxed">{cls.justificativa}</p>
                                        : <p className="text-xs text-gray-400 italic">Sem justificativa registrada.</p>
                                      }
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <span className="text-[9px] text-gray-400">Clique fora para fechar</span>
                                      </div>
                                    </div>
                                  )}
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

        {/* ── FOOTER ── */}
        <footer className="mt-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-16 bg-gray-300"></div>
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.magenta }}></div>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.orange }}></div>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.purple }}></div>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.blue }}></div>
            </div>
            <div className="h-[1px] w-16 bg-gray-300"></div>
          </div>
        </footer>
      </div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          body { font-family: 'Inter', sans-serif; }
          .dashboard-header {
            background-color: #ffffff;
            border-radius: 0 0 14px 14px;
            padding: 16px 24px 14px;
            border-bottom: 3px solid #e91e63;
          }
          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .dashboard-title {
            font-size: 24px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.3px;
            line-height: 1;
          }
          .dashboard-subtitle {
            font-size: 11px;
            margin-top: 4px;
            opacity: 0.7;
            letter-spacing: 0.04em;
            font-weight: 700;
          }
          @media print {
            .no-print { display: none !important; }
            header { position: static !important; border-bottom: 3px solid #e91e63 !important; }
            table { border: 1px solid #ddd !important; }
            thead tr { background-color: #1e293b !important; -webkit-print-color-adjust: exact; }
          }
        `}
      </style>
    </div>
  );
};

export default App;
