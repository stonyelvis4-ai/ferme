import { FormEvent, useEffect, useRef, useState } from 'react';
import { LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type * as ThreeModule from 'three';

import { ApiError, postJson } from '../services/fermApi';

type AssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

type FarmAssistantProps = {
  authToken: string;
};

type MascotMood = 'idle' | 'listening' | 'thinking';

type MascotInstance = {
  destroy: () => void;
  setState: (state: 'idle' | 'listening' | 'thinking' | 'talking' | 'happy') => MascotInstance;
};

type MascotRuntime = {
  create: (container: HTMLElement, options: {
    framing: 'bust' | 'full';
    decor: boolean;
    shadows: boolean;
    followPointer: boolean;
    autoCheer: boolean;
    THREE: typeof ThreeModule;
  }) => MascotInstance;
};

type LoadedMascotRuntime = {
  runtime: MascotRuntime;
  three: typeof ThreeModule;
};

declare global {
  interface Window {
    FermierMascotte?: MascotRuntime;
    THREE?: typeof ThreeModule;
  }
}

const STARTER_MESSAGES: AssistantMessage[] = [{
  id: 'welcome',
  role: 'assistant',
  content: 'Bonjour, je suis Orion, votre assistant agricole. Je peux vous aider sur l’élevage, les cultures, la pisciculture, les intrants et l’organisation de la ferme.',
}];

const SUGGESTIONS = [
  'Comment améliorer la biosécurité du poulailler ?',
  'Comment surveiller la qualité de l’eau d’un bassin ?',
  'Quels contrôles faire avant de semer ?',
];

const MAX_HISTORY_ENTRY_LENGTH = 1200;
const MASCOT_SCRIPT_ID = 'ferm-plus-farmer-mascot';
let mascotRuntimePromise: Promise<LoadedMascotRuntime> | null = null;

function loadMascotRuntime(): Promise<LoadedMascotRuntime> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Mascotte indisponible.'));

  if (mascotRuntimePromise) return mascotRuntimePromise;

  mascotRuntimePromise = import('three').then((three) => new Promise((resolve, reject) => {
    window.THREE = three;
    if (window.FermierMascotte) {
      resolve({ runtime: window.FermierMascotte, three });
      return;
    }

    const finishLoading = () => {
      if (window.FermierMascotte) resolve({ runtime: window.FermierMascotte, three });
      else reject(new Error('La mascotte agricole n’a pas pu être chargée.'));
    };
    const existingScript = document.getElementById(MASCOT_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', finishLoading, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('La mascotte agricole est indisponible.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = MASCOT_SCRIPT_ID;
    script.src = '/mascotte/fermier-mascotte.js';
    script.async = true;
    script.onload = finishLoading;
    script.onerror = () => reject(new Error('La mascotte agricole est indisponible.'));
    document.head.appendChild(script);
  }));

  return mascotRuntimePromise;
}

function FarmMascot({ mood, compact = false }: { mood: MascotMood; compact?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mascotRef = useRef<MascotInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return undefined;

    void loadMascotRuntime()
      .then(({ runtime, three }) => {
        if (cancelled || !containerRef.current) return;

        mascotRef.current = runtime.create(containerRef.current, {
          framing: 'bust',
          decor: false,
          shadows: false,
          followPointer: !compact,
          autoCheer: false,
          THREE: three,
        });
        mascotRef.current.setState(mood);
      })
      .catch(() => {
        // Le chatbot reste utilisable si WebGL est indisponible.
      });

    return () => {
      cancelled = true;
      mascotRef.current?.destroy();
      mascotRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    mascotRef.current?.setState(mood);
  }, [mood]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden ${compact ? 'h-11 w-11' : 'h-14 w-14'}`}
    />
  );
}

export default function FarmAssistant({ authToken }: FarmAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>(STARTER_MESSAGES);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mascotMood: MascotMood = isSending ? 'thinking' : draft.trim() ? 'listening' : 'idle';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, isSending]);

  const submitQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = draft.trim();
    if (!question || isSending) return;

    if (!navigator.onLine) {
      setError('L’assistant nécessite une connexion Internet pour répondre.');
      return;
    }

    const nextUserMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    };
    const history = messages.slice(-6).map(({ role, content }) => ({
      role,
      content: content.length > MAX_HISTORY_ENTRY_LENGTH
        ? `…${content.slice(-(MAX_HISTORY_ENTRY_LENGTH - 1))}`
        : content,
    }));

    setMessages((current) => [...current, nextUserMessage]);
    setDraft('');
    setError('');
    setIsSending(true);

    try {
      const response = await postJson<{ answer: string }>('/assistant/chat', {
        message: question,
        history,
      }, authToken);
      const answer = response.data?.answer?.trim();

      if (!answer) throw new Error('Réponse de l’assistant indisponible.');

      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
      }]);
    } catch (caughtError) {
      const message = caughtError instanceof ApiError || caughtError instanceof Error
        ? caughtError.message
        : 'L’assistant agricole est indisponible pour le moment.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const useSuggestion = (suggestion: string) => {
    setDraft(suggestion);
  };

  return (
    <div className="fixed bottom-5 right-5 z-30">
      {isOpen ? (
        <section
          aria-label="Assistant agricole Orion"
          className="flex h-[min(38rem,calc(100vh-2.5rem))] w-[calc(100vw-2rem)] max-w-[26rem] flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl shadow-slate-950/20"
        >
          <header className="flex items-start justify-between gap-4 bg-slate-900 px-5 py-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-emerald-500/20 shadow-lg shadow-emerald-950/30">
                <FarmMascot mood={mascotMood} />
              </div>
              <div>
                <h2 className="text-sm font-bold">Orion, assistant agricole</h2>
                <p className="mt-0.5 text-xs text-slate-300">Conseils généraux pour votre exploitation</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fermer l’assistant agricole"
              onClick={() => setIsOpen(false)}
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' ? (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                ) : null}
                <p className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-emerald-600 text-white'
                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm'
                }`}>
                  {message.content}
                </p>
              </div>
            ))}
            {isSending ? (
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                </div>
                Orion prépare une réponse…
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            {error ? <p role="alert" className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
            {messages.length === STARTER_MESSAGES.length ? (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => useSuggestion(suggestion)}
                    className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-left text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            <form onSubmit={submitQuestion} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="farm-assistant-question">Votre question agricole</label>
              <textarea
                id="farm-assistant-question"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                maxLength={1200}
                disabled={isSending}
                placeholder="Posez une question sur votre ferme…"
                className="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!draft.trim() || isSending}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                aria-label="Envoyer la question"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
            <p className="mt-2 px-1 text-[10px] leading-snug text-slate-400">Conseils généraux uniquement. Pour une urgence sanitaire ou un traitement, contactez un vétérinaire ou conseiller local.</p>
          </div>
        </section>
      ) : (
        <button
          type="button"
          aria-label="Ouvrir l’assistant agricole Orion"
          onClick={() => setIsOpen(true)}
          className="group flex h-14 items-center gap-2 rounded-2xl bg-emerald-600 px-3 pr-4 text-sm font-bold text-white shadow-xl shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <div className="flex h-11 w-11 items-end justify-center overflow-hidden rounded-xl bg-emerald-950/20">
            <FarmMascot mood="idle" compact />
          </div>
          <span>Parler à Orion</span>
          <MessageCircle className="h-4 w-4 opacity-80" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
