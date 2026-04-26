import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExternalEmbedProps {
  title: string;
  url: string;
  icon?: React.ReactNode;
}

export default function ExternalEmbed({ title, url, icon }: ExternalEmbedProps) {
  const navigate = useNavigate();

  function handleOpenExternal() {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Fallback icon jika tidak disediakan
  const displayIcon = icon || <ShieldCheck className="w-10 h-10 text-primary-600" strokeWidth={1.5} />;

  return (
    <div className="space-y-6">
      
      {/* ── Header Panel ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors flex-shrink-0"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="min-w-0">
            {/* Breadcrumb style */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5 font-medium tracking-wide">
              <span>SPI Secure Portal</span>
              <span>/</span>
              <span className="text-primary-600">Eksternal Dashboard</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 truncate tracking-tight">{title}</h1>
          </div>
        </div>

        <button 
          onClick={handleOpenExternal} 
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-500/20 active:scale-95 flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          Buka di Tab Baru
        </button>
      </div>

      {/* ── Portal Entry Card (Menggantikan Iframe Abu-abu) ──────── */}
      <div className="relative bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden min-h-[500px] flex items-center justify-center p-8 sm:p-12">
        
        {/* ── BACKGROUND ANIMATION ── */}
        {/* Animasi gradient flow yang lembut sebagai background */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-100 via-indigo-100 to-primary-100 animate-gradient-xy"></div>
          {/* Pattern dot dekoratif */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)' }}></div>
        </div>
        
        {/* ── CONTENT BUBBLE ── */}
        <div className="relative z-10 w-full max-w-xl bg-white/80 backdrop-blur-lg rounded-2xl border border-white/50 p-10 shadow-2xl shadow-primary-500/10 text-center flex flex-col items-center">
          
          {/* ── FLOATING ICON ANIMATION ── */}
          {/* Lingkaran bersinar dengan ikon yang melayang naik-turun */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-primary-500 blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 animate-float">
              {displayIcon}
            </div>
          </div>

          {/* ── TEXT CONTENT ── */}
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight leading-snug mb-3">
            Akses Secure <span className="text-primary-600">{title}</span>
          </h2>
          
          <p className="text-slate-600 text-base leading-relaxed mb-10 max-w-md mx-auto">
            Demi keamanan, konten dashboard ini diproteksi dan harus diakses langsung melalui tautan resmi. Klik tombol di bawah untuk membukanya dengan aman di jendela baru.
          </p>

          {/* ── BIG CALL TO ACTION ── */}
          <button 
            onClick={handleOpenExternal}
            className="group relative flex items-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-primary-500/50 active:scale-95"
          >
            {/* Efek kilauan saat di-hover */}
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            
            <ExternalLink className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Buka Dashboard Sekarang
          </button>
          
          <p className="text-slate-400 text-xs mt-6 font-medium tracking-wide font-mono truncate w-full">
            Source: {url}
          </p>
        </div>
      </div>

      {/* ── Inline CSS untuk Animasi (Tanpa perlu ubah tailwind.config) ── */}
      <style>{`
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 15s ease infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}