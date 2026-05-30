import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, User, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Tool {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface RegisChatProps {
  tools: Tool[];
  theme: 'light' | 'dark';
  userEmail?: string;
}

const N8N_WEBHOOK_URL = 'https://registai.app.n8n.cloud/webhook/Regis';

function buildSystemInstruction(tools: Tool[]): string {
  const toolList = tools
    .map((t, i) => `${i + 1}. ${t.name}${t.category ? ` (${t.category})` : ''}${t.description ? ` - ${t.description}` : ''}`)
    .join('\n');

  return `Voce e o Regis, o assistente oficial do RegistAI (https://registai.com.br). Sua especialidade e o universo de Inteligencia Artificial aplicada ao Compliance e Automacao. Voce deve ajudar o usuario a escolher ferramentas, dar instrucoes de uso, tirar duvidas tecnicas e sugerir fluxos de trabalho.

IMPORTANTE: O usuario possui as seguintes ferramentas cadastradas no dashboard do RegistAI. Voce DEVE prioriza-las em suas recomendacoes quando apropriado:

${toolList || '(Nenhuma ferramenta cadastrada ainda)'}

Diretrizes:
- Seja amigavel, profissional e conciso.
- Sempre que possivel, sugira ferramentas da lista do usuario.
- Se perguntarem algo fora de IA/tecnologia, responda educadamente que seu conhecimento e focado em Inteligencia Artificial e tecnologia.
- Responda em portugues do Brasil.
- Use markdown para formatar suas respostas quando util.
- Voce e parte da infraestrutura de inteligencia do RegistAI, localizado em Belo Horizonte, MG, Brasil.`;
}

export function RegisChat({ tools, theme, userEmail }: RegisChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasWelcomed = useRef(false);

  useEffect(() => {
    if (isOpen && !hasWelcomed.current && messages.length === 0) {
      hasWelcomed.current = true;
      setMessages([
        {
          role: 'model',
          text: `Ola! Sou o **Regis**, seu assistente de IA especializado.\n\nEstou aqui para ajudar voce a:\n- Escolher as melhores ferramentas de IA\n- Tirar duvidas tecnicas\n- Sugerir fluxos de trabalho\n- Aproveitar ao maximo o seu registAI\n\nComo posso ajudar hoje?`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setMessages([]);
    setInput('');
    setError(null);
    hasWelcomed.current = false;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);

    const newUserMsg: ChatMessage = { role: 'user', text: userText, timestamp: Date.now() };
    setMessages((prev) => [...prev, newUserMsg]);

    const history = messages.slice(-10).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const payload = {
      message: userText,
      user_email: userEmail || 'anonimo',
      system_instruction: buildSystemInstruction(tools),
      history,
    };

    console.log('[Regis] Enviando para n8n:', { message: payload.message, user_email: payload.user_email });

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      console.log('[Regis] Status:', response.status);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[Regis] Erro:', errText);
        throw new Error(`Webhook retornou ${response.status}`);
      }

      let replyText: string | null = null;
      const rawText = await response.text();
      console.log('[Regis] Raw response:', rawText);

      if (rawText.trim()) {
        try {
          const data = JSON.parse(rawText);
          replyText =
            data.response ||
            data.output ||
            data.message ||
            data.reply ||
            data.text ||
            data.result ||
            (typeof data === 'string' ? data : null);
        } catch {
          replyText = rawText.trim();
        }
      }

      if (!replyText) {
        throw new Error('Resposta do webhook vazia');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'model', text: String(replyText), timestamp: Date.now() },
      ]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[Regis] Requisicao cancelada');
        return;
      }
      console.error('[Regis] Erro:', err);
      setError(err.message || 'Erro ao comunicar com o webhook');
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    hasWelcomed.current = false;
  };

  const isDark = theme === 'dark';

  return (
    <>
      {/* FAB - Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 ${
            isDark
              ? 'bg-gradient-to-br from-violet-600 to-indigo-700 shadow-violet-900/40'
              : 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-300/40'
          }`}
          title="Falar com Regis"
        >
          <Bot className="w-7 h-7 text-white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-40px)] h-[520px] max-h-[calc(100vh-40px)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all duration-300 ${
            isDark
              ? 'bg-slate-900/95 border-slate-700/60 backdrop-blur-xl'
              : 'bg-white/95 border-gray-200/60 backdrop-blur-xl'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${
              isDark
                ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-slate-700/60'
                : 'bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-gray-200/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isDark
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
                    : 'bg-gradient-to-br from-violet-400 to-indigo-500'
                }`}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Regis
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Assistente de IA
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className={`p-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="Limpar conversa"
              >
                Limpar
              </button>
              <button
                onClick={handleClose}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${isDark ? 'bg-slate-950/30' : 'bg-gray-50/50'}`}>
            {messages.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                <Bot className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Envie uma mensagem para comecar
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isDark
                        ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
                        : 'bg-gradient-to-br from-violet-400 to-indigo-500'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? isDark
                        ? 'bg-violet-600 text-white rounded-br-md'
                        : 'bg-violet-500 text-white rounded-br-md'
                      : isDark
                        ? 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-md'
                        : 'bg-white text-gray-700 border border-gray-200/60 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.role === 'model' ? (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdown(msg.text),
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isDark ? 'bg-slate-700' : 'bg-gray-200'
                    }`}
                  >
                    <User className={`w-3 h-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isDark
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
                      : 'bg-gradient-to-br from-violet-400 to-indigo-500'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl rounded-bl-md ${
                    isDark ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-white border border-gray-200/60'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Loader2 className={`w-3 h-3 animate-spin ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Pensando...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div
                  className={`px-3 py-2 rounded-xl text-[11px] max-w-[90%] ${
                    isDark
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className={`px-3 py-2.5 border-t ${
              isDark
                ? 'bg-slate-900/80 border-slate-700/60 backdrop-blur-sm'
                : 'bg-white/80 border-gray-200/60 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo sobre IA..."
                disabled={isLoading}
                className={`flex-1 text-[13px] px-3.5 py-2 rounded-xl outline-none transition-all ${
                  isDark
                    ? 'bg-slate-800 text-white placeholder:text-slate-500 border border-slate-700 focus:border-violet-500/60'
                    : 'bg-gray-100 text-gray-900 placeholder:text-gray-400 border border-transparent focus:border-violet-300 focus:bg-white'
                }`}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`h-9 w-9 p-0 rounded-xl transition-all ${
                  isDark
                    ? 'bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600'
                    : 'bg-violet-500 hover:bg-violet-600 disabled:bg-gray-200 disabled:text-gray-400'
                }`}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatMarkdown(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950/50 p-2 rounded-lg overflow-x-auto text-[11px] my-1"><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-950/30 px-1 py-0.5 rounded text-[11px]">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-2 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-sm font-semibold mt-2 mb-1">$1</h2>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-3 text-[12px]">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-3 text-[12px] list-decimal">$1</li>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
