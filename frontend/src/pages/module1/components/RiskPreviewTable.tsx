import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { RiskData, RiskLevel, RiskStatus } from '../../../types';

const LEVEL_STYLE: Record<RiskLevel, string> = {
  Critical: 'bg-red-100 text-red-700 border border-red-200',
  High:     'bg-red-50  text-red-600  border border-red-100',
  Medium:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Low:      'bg-green-50 text-green-600  border border-green-200',
};

const STATUS_STYLE: Record<RiskStatus, string> = {
  Open:      'bg-slate-100 text-slate-600',
  Mitigated: 'bg-green-100 text-green-700',
  Closed:    'bg-gray-100  text-gray-500',
};

interface Props {
  data:       RiskData[];
  total:      number;
  page:       number;
  limit:      number;
  isLoading:  boolean;
  onPageChange:  (p: number) => void;
  onSearch:      (q: string) => void;
  onFilterDept:  (d: string) => void;
  onFilterLevel: (l: string) => void;
  selectedIds:   string[];
  onToggleSelect:(id: string) => void;
  onSelectAll:   () => void;
}

export default function RiskPreviewTable({
  data, total, page, limit, isLoading,
  onPageChange, onSearch, onFilterDept, onFilterLevel,
  selectedIds, onToggleSelect, onSelectAll,
}: Props) {
  const [search, setSearch]   = useState('');
  const [dept,   setDept]     = useState('');
  const [level,  setLevel]    = useState('');
  const totalPages = Math.ceil(total / limit);

  function handleSearch(v: string) { setSearch(v); onSearch(v); }
  function handleDept(v: string)   { setDept(v);   onFilterDept(v); }
  function handleLevel(v: string)  { setLevel(v);  onFilterLevel(v); }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search risks..."
            className="input pl-9"
          />
        </div>

        <select
          value={dept} onChange={(e) => handleDept(e.target.value)}
          className="input w-44"
        >
          <option value="">All Departments</option>
          {[...new Set(data.map((r) => r.department_name))].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={level} onChange={(e) => handleLevel(e.target.value)}
          className="input w-40"
        >
          <option value="">All Risk Levels</option>
          {(['Critical','High','Medium','Low'] as RiskLevel[]).map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-slate-700 text-sm">Data Risiko</h3>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
                {selectedIds.length} risiko dipilih
              </span>
            )}
            <span className="text-xs text-slate-400">
              {total > 0
                ? `${Math.min((page - 1) * limit + 1, total)}–${Math.min(page * limit, total)} dari ${total} risiko`
                : 'Tidak ada data'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && data.every((r) => selectedIds.includes(r.id))}
                    ref={(el) => {
                      if (el) el.indeterminate = data.some((r) => selectedIds.includes(r.id)) && !data.every((r) => selectedIds.includes(r.id));
                    }}
                    onChange={onSelectAll}
                    className="rounded"
                    title="Pilih semua di halaman ini"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Risk ID</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Department</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Risk Description</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Level</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                    Belum ada data risiko. Import dari TRUST atau upload file.
                  </td>
                </tr>
              ) : (
                data.map((risk) => (
                  <tr
                    key={risk.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      selectedIds.includes(risk.id) ? 'bg-primary-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(risk.id)}
                        onChange={() => onToggleSelect(risk.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-medium text-primary-600 whitespace-nowrap">
                      {risk.risk_code}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {risk.department_name}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 max-w-xs">
                      <span className="line-clamp-2">{risk.risk_description}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${LEVEL_STYLE[risk.risk_level]}`}>
                        {risk.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[risk.status]}`}>
                        {risk.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 flex items-center justify-between border-t border-slate-50">
          <span className="text-xs text-slate-400">
            {total > 0 ? `Showing ${Math.min((page-1)*limit+1,total)} to ${Math.min(page*limit,total)} of ${total} risks` : 'No data'}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button
                key={i + 1}
                onClick={() => onPageChange(i + 1)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  page === i + 1 ? 'bg-primary-500 text-white' : 'btn-secondary'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
