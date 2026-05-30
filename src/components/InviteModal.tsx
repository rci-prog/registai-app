     1	import { useState } from 'react';
     2	import { Button } from '@/components/ui/button';
     3	import { Input } from '@/components/ui/input';
     4	import {
     5	  Dialog,
     6	  DialogContent,
     7	  DialogDescription,
     8	  DialogHeader,
     9	  DialogTitle,
    10	} from '@/components/ui/dialog';
    11	import { Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';
    12	import { useAuth } from '@/contexts/AuthContext';
    13	import { supabase } from '@/lib/supabase';
    14	
    15	/**
    16	 * InviteModal — Sistema de Convites
    17	 *
    18	 * Abre ao clicar em "Convidar Amigo" no Header.
    19	 * Chama a Edge Function send-invite do Supabase que:
    20	 *  - Valida o e-mail
    21	 *  - Aplica rate limit (5 convites/hora)
    22	 *  - Gera token unico
    23	 *  - Salva no banco para rastreamento
    24	 *
    25	 * O envio real de e-mail depende do SMTP/Resend configurado
    26	 * na Edge Function (em breve).
    27	 */
    28	
    29	interface InviteModalProps {
    30	  open: boolean;
    31	  onClose: () => void;
    32	}
    33	
    34	export function InviteModal({ open, onClose }: InviteModalProps) {
    35	  const { currentUser } = useAuth();
    36	  const [email, setEmail] = useState('');
    37	  const [sending, setSending] = useState(false);
    38	  const [sent, setSent] = useState(false);
    39	  const [error, setError] = useState<string | null>(null);
    40	
    41	  const validateEmail = (value: string): boolean => {
    42	    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    43	  };
    44	
    45	  const handleSendInvite = async () => {
    46	    // Validacao
    47	    if (!email.trim()) {
    48	      setError('Digite um e-mail valido.');
    49	      return;
    50	    }
    51	    if (!validateEmail(email)) {
    52	      setError('E-mail invalido.');
    53	      return;
    54	    }
    55	
    56	    setSending(true);
    57	    setError(null);
    58	
    59	    try {
    60	      // Insert direto na tabela invites (sem Edge Function)
    61	      const inviteToken = crypto.randomUUID();
    62	      const finalInviteUrl = `https://www.registai.com.br?ref=${inviteToken}`;
    63	
    64	      const { data, error } = await supabase.from('invites').insert({
    65	        sender_id: currentUser?.id,
    66	        sender_email: currentUser?.email,
    67	        recipient_email: email.trim(),
    68	        token: inviteToken,
    69	        invite_url: finalInviteUrl,
    70	        status: 'pending',
    71	      }).select();
    72	
    73	      if (error) {
    74	        console.error('[Invite] INSERT ERROR:', error.code, error.message);
    75	        throw new Error(`[${error.code}] ${error.message}`);
    76	      }
    77	
    78	      console.log('[Invite] Convite salvo:', data);
    79	      setSent(true);
    80	    } catch (err: any) {
    81	      console.error('[Invite] Erro:', err);
    82	      const msg = err.message || '';
    83	      if (msg.includes('23503')) {
    84	        setError('Erro de referencia: usuario nao encontrado.');
    85	      } else if (msg.includes('23505')) {
    86	        setError('Convite ja enviado para este e-mail.');
    87	      } else if (msg.includes('42501')) {
    88	        setError('Sem permissao para enviar convites.');
    89	      } else if (msg.includes('42703')) {
    90	        setError('Coluna nao encontrada. Verifique a tabela invites.');
    91	      } else {
    92	        setError(msg || 'Erro ao enviar convite. Tente novamente.');
    93	      }
    94	    } finally {
    95	      setSending(false);
    96	    }
    97	  };
    98	
    99	  const handleClose = () => {
   100	    setEmail('');
   101	    setSent(false);
   102	    setError(null);
   103	    onClose();
   104	  };
   105	
   106	  return (
   107	    <Dialog open={open} onOpenChange={handleClose}>
   108	      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
   109	        <DialogHeader>
   110	          <DialogTitle className="flex items-center gap-2 text-white">
   111	            <Mail className="w-5 h-5 text-violet-400" />
   112	            Convidar Amigo
   113	          </DialogTitle>
   114	          <DialogDescription className="text-slate-400">
   115	            Indique o RegistAI para um amigo. Ele recebera um convite por e-mail.
   116	          </DialogDescription>
   117	        </DialogHeader>
   118	
   119	        {sent ? (
   120	          /* Estado de sucesso */
   121	          <div className="flex flex-col items-center gap-4 py-6">
   122	            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
   123	            <p className="text-center text-emerald-400 font-medium text-lg">
   124	              Convite enviado com sucesso!
   125	            </p>
   126	            <p className="text-center text-sm text-slate-400">
   127	              Assim que seu amigo se cadastrar, voces poderao compartilhar ferramentas.
   128	            </p>
   129	            <Button
   130	              onClick={handleClose}
   131	              className="mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
   132	            >
   133	              Fechar
   134	            </Button>
   135	          </div>
   136	        ) : (
   137	          /* Formulario de envio */
   138	          <div className="flex flex-col gap-4 py-2">
   139	            <div className="space-y-2">
   140	              <label className="text-sm font-medium text-slate-300">
   141	                E-mail do convidado
   142	              </label>
   143	              <Input
   144	                type="email"
   145	                placeholder="amigo@email.com"
   146	                value={email}
   147	                onChange={(e) => { setEmail(e.target.value); setError(null); }}
   148	                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
   149	                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
   150	                disabled={sending}
   151	              />
   152	              {error && (
   153	                <p className="text-sm text-red-400">{error}</p>
   154	              )}
   155	            </div>
   156	
   157	            <Button
   158	              onClick={handleSendInvite}
   159	              disabled={sending || !email.trim()}
   160	              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white disabled:opacity-50"
   161	            >
   162	              {sending ? (
   163	                <>
   164	                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
   165	                  Enviando...
   166	                </>
   167	              ) : (
   168	                <>
   169	                  <Send className="w-4 h-4 mr-2" />
   170	                  Enviar Convite
   171	                </>
   172	              )
   173	              }
   174	            </Button>
   175	
   176	            <p className="text-xs text-slate-600 text-center">
   177	              Limite de 5 convites por hora.
   178	            </p>
   179	          </div>
   180	        )}
   181	      </DialogContent>
   182	    </Dialog>
   183	  );
   184	}
   185	
