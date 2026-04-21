import { useState } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Minimize2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExternalEmbedProps {
  title: string;
  subtitle?: string;
  url: string;
  /** Ikon lucide-react yang dirender sebagai JSX */
  icon?: React.ReactNode;
  /** Warna aksen badge (tailwind class) */
  accentColor?: string;
  /** Catatan khusus yang ditampilkan di bawah tombol jika embed gagal */
  note?: string;
}

export default function ExternalEmbed({
  title,
  subtitle,
  url,
  icon,
  accentColor = 'bg-primary-100 text-primary-700',
  note,
}: ExternalEmbedProps) {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeKey, setIframeKey]   = useState(0);   // increment to force reload
  const [showWarning, setShowWarning] = useState(true);

  function handleOpenExternal() {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleReload() {
    setIframeKey((k) => k + 1);
  }

  return (
    <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-white' : 'space-y-3'}`}>

      {/* ── Top bar ───────────────────────────────────────────── */}
      <div className={`flex items-center justify-between gap-3 ${fullscreen ? 'px-4 py-3 border-b border-slate-200 bg-white shadow-sm flex-shrink-0' : 'bg-white rounded-xl border border-slate-100 px-4 py-3'}`}>
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          {!fullscreen && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {icon && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentColor}`}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-800 truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleReload}
            title="Muat ulang"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buka di Tab Baru
          </button>
        </div>
      </div>

      {/* ── Iframe warning (dismiss-able) ─────────────────────── */}
      {showWarning && !fullscreen && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Konten Eksternal</p>
            <p className="text-xs text-amber-700">
              Halaman ini menampilkan konten dari{' '}
              <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">{new URL(url).hostname}</code>.
              Jika konten tidak muncul, gunakan tombol <strong>Buka di Tab Baru</strong> di kanan atas.
              {note && <><br />{note}</>}
            </p>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-amber-400 hover:text-amber-600 text-xs font-medium whitespace-nowrap flex-shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ── iframe ────────────────────────────────────────────── */}
      <div className={`bg-white rounded-xl border border-slate-100 overflow-hidden ${fullscreen ? 'flex-1' : 'h-[calc(100vh-13rem)]'}`}>
        <iframe
          key={iframeKey}
          src={url}
          title={title}
          className="w-full h-full border-0"
          allow="fullscreen; clipboard-write; encrypted-media"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          referrerPolicy="no-referrer-when-downgrade"
          loading="lazy"
        />
      </div>

      {/* ── Fallback CTA bawah ────────────────────────────────── */}
      {!fullscreen && (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-5 flex flex-col items-center gap-3 text-center">
          <ExternalLink className="w-7 h-7 text-slate-300" />
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Konten tidak tampil?</p>
            <p className="text-xs text-slate-400 max-w-sm">
              Beberapa layanan eksternal memerlukan autentikasi terpisah atau tidak mengizinkan tampilan embedded.
              Klik tombol di bawah untuk membukanya langsung.
            </p>
          </div>
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Buka {title} di Tab Baru
          </button>
          <p className="text-[10px] text-slate-300 font-mono break-all max-w-md">{url}</p>
        </div>
      )}
    </div>
  );
}
