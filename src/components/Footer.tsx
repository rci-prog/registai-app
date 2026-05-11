import { useState } from 'react';
import { SupportModal } from '@/components/SupportModal';

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      <footer className="w-full border-t border-slate-800/60 bg-slate-900/80 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              &copy; {CURRENT_YEAR} registAI. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => { /* placeholder */ }}
                className="text-slate-400 hover:text-violet-400 transition-colors px-2 py-1"
              >
                Privacidade
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => { /* placeholder */ }}
                className="text-slate-400 hover:text-violet-400 transition-colors px-2 py-1"
              >
                Termos de Servico
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => setSupportOpen(true)}
                className="text-slate-400 hover:text-violet-400 transition-colors px-2 py-1"
              >
                Suporte
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center mt-3 pt-3 border-t border-slate-800/40">
            <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
              Desenvolvido com
              <svg className="w-3 h-3 text-red-500 inline" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              no Brasil
              <svg className="w-3.5 h-3 inline ml-0.5" viewBox="0 0 32 24" fill="none">
                <rect width="32" height="24" rx="2" fill="#009C3B" />
                <path d="M16 3L28.5 12L16 21L3.5 12L16 3Z" fill="#FFDF00" />
                <circle cx="16" cy="12" r="5" fill="#002776" />
              </svg>
            </p>
          </div>
        </div>
      </footer>
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
