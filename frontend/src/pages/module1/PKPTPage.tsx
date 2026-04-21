import { useState } from 'react';
import { ChevronRight, BarChart2, FileText, Calendar, Users } from 'lucide-react';
import RiskTab from './components/RiskTab';
import ProgramTab from './components/ProgramTab';
import WorkloadTab from './components/WorkloadTab';

type TabId = 'risk' | 'program' | 'workload';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'risk',     label: 'Data Risiko',          icon: BarChart2 },
  { id: 'program',  label: 'Program Kerja (PKPT)',  icon: FileText  },
  { id: 'workload', label: 'Beban Kerja Auditor',   icon: Users     },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function PKPTPage() {
  const [activeTab, setActiveTab] = useState<TabId>('risk');
  const [tahun, setTahun] = useState(CURRENT_YEAR);
  const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

  return (
    <div className="space-y-6">
      
      {/* ── Panel Navigasi Atas ── */}
      <div className="bg-white px-5 sm:px-8 pt-5 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Baris Atas: Breadcrumb & Year Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="hover:text-slate-800 cursor-pointer transition-colors">
              Perencanaan
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-primary-700 font-bold bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
              Pengawasan Tahunan
            </span>
          </div>

          {/* Filter Tahun Audit (Redesign Compact & Elegan) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 transition-all">
            <div className="flex items-center gap-1.5 pl-3 pr-2 py-2 bg-slate-50 border-r border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider hidden sm:block">
                Tahun Audit
              </span>
            </div>
            <div className="relative">
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="appearance-none bg-transparent text-slate-800 text-sm font-bold pl-3 pr-8 py-2 focus:outline-none cursor-pointer hover:bg-slate-50 transition-colors"
              >
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Baris Bawah: Underline Tabs */}
        <div className="flex gap-8 border-b border-slate-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2.5 pb-3.5 px-1 border-b-2 text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors duration-300 ${
                  isActive ? 'bg-primary-100/50' : 'bg-slate-50 group-hover:bg-slate-100'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`} />
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Konten Tab ── */}
      <div className="transition-all duration-300 ease-in-out">
        {activeTab === 'risk'     && <RiskTab     tahun={tahun} />}
        {activeTab === 'program'  && <ProgramTab  tahun={tahun} />}
        {activeTab === 'workload' && <WorkloadTab tahun={tahun} />}
      </div>
      
    </div>
  );
}