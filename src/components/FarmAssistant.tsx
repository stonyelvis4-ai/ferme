import { FormEvent, useEffect, useRef, useState } from 'react';
import { Camera, CircleAlert, ImagePlus, LoaderCircle, MessageCircle, Plus, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import type * as ThreeModule from 'three';

import { ApiError, postForm } from '../services/fermApi';

type AssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: number;
  image?: {
    name: string;
    previewUrl: string;
  };
};

type SelectedImage = {
  file: File;
  previewUrl: string;
};

type AssistantRequest = {
  question: string;
  history: Array<Pick<AssistantMessage, 'role' | 'content'>>;
  image: SelectedImage | null;
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
  createdAt: Date.now(),
  content: 'Bonjour, je suis Orion, votre assistant agricole. Envoyez-moi une photo de symptôme ou de culture : je décrirai ce qui est visible et les mesures prudentes à prendre. Je ne peux pas confirmer un diagnostic médical ou vétérinaire à partir d’une image.',
}];

const SUGGESTIONS = [
  'Comment améliorer la biosécurité du poulailler ?',
  'Comment surveiller la qualité de l’eau d’un bassin ?',
  'Quels contrôles faire avant de semer ?',
];

const MAX_HISTORY_ENTRY_LENGTH = 1200;
const MAX_IMAGE_SIZE_BYTES = 7 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
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
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const lastRequestRef = useRef<AssistantRequest | null>(null);
  const mascotMood: MascotMood = isSending ? 'thinking' : draft.trim() ? 'listening' : 'idle';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, []);

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (!isCameraOpen) return undefined;

    let disposed = false;
    setCameraError('');

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('La caméra nécessite HTTPS (ou localhost) et votre autorisation. Vous pouvez joindre une image existante.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1600 },
            height: { ideal: 1200 },
          },
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play();
        }
      } catch {
        if (!disposed) {
          stopCamera();
          setCameraError('Orion ne peut pas accéder à la caméra. Autorisez-la dans le navigateur ou joignez une image existante.');
        }
      }
    };

    void startCamera();

    return () => {
      disposed = true;
      stopCamera();
    };
  }, [isCameraOpen]);

  const clearSelectedImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.previewUrl);
      previewUrlsRef.current.delete(selectedImage.previewUrl);
    }
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const selectImage = (file: File | null) => {
    if (!file) return;

    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setError('Choisissez une image au format JPG, PNG ou WebP.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('La photo doit faire 7 Mo ou moins.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.previewUrl);
      previewUrlsRef.current.delete(selectedImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);
    setSelectedImage({ file, previewUrl });
    setError('');
  };

  const closeCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('La caméra est encore en cours de démarrage. Réessayez dans un instant.');
      return;
    }

    const largestDimension = Math.max(video.videoWidth, video.videoHeight);
    const scale = Math.min(1, 1600 / largestDimension);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');

    if (!context) {
      setCameraError('La photo n’a pas pu être préparée. Réessayez ou joignez une image existante.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('La photo n’a pas pu être créée. Réessayez ou joignez une image existante.');
        return;
      }

      selectImage(new File([blob], `orion-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      closeCamera();
    }, 'image/jpeg', 0.88);
  };

  const requestAssistant = async (request: AssistantRequest, appendUserMessage: boolean) => {
    if (isSending) return;
    if (!navigator.onLine) {
      setError('L’assistant nécessite une connexion Internet pour répondre.');
      return;
    }

    if (appendUserMessage) {
      setMessages((current) => [...current, {
        id: `user-${Date.now()}`,
        role: 'user',
        content: request.question || 'Photo envoyée pour analyse.',
        createdAt: Date.now(),
        image: request.image ? {
          name: request.image.file.name,
          previewUrl: request.image.previewUrl,
        } : undefined,
      }]);
    }

    setError('');
    setIsSending(true);
    lastRequestRef.current = request;

    try {
      const formData = new FormData();
      formData.append('message', request.question);
      request.history.forEach((entry, index) => {
        formData.append(`history[${index}][role]`, entry.role);
        formData.append(`history[${index}][content]`, entry.content);
      });
      if (request.image) formData.append('image', request.image.file);

      const response = await postForm<{ answer: string }>('/assistant/chat', formData, authToken);
      const answer = response.data?.answer?.trim();

      if (!answer) throw new Error('Réponse de l’assistant indisponible.');

      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
        createdAt: Date.now(),
      }]);
      lastRequestRef.current = null;
    } catch (caughtError) {
      const message = caughtError instanceof ApiError || caughtError instanceof Error
        ? caughtError.message
        : 'L’assistant agricole est indisponible pour le moment.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = draft.trim();
    const imageToSend = selectedImage;
    if ((!question && !imageToSend) || isSending) return;

    const history = messages.slice(-6).map(({ role, content }) => ({
      role,
      content: content.length > MAX_HISTORY_ENTRY_LENGTH
        ? `…${content.slice(-(MAX_HISTORY_ENTRY_LENGTH - 1))}`
        : content,
    }));

    setDraft('');
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    void requestAssistant({ question, history, image: imageToSend }, true);
  };

  const retryLastRequest = () => {
    if (lastRequestRef.current) void requestAssistant(lastRequestRef.current, false);
  };

  const startNewConversation = () => {
    setMessages([{ ...STARTER_MESSAGES[0], id: `welcome-${Date.now()}`, createdAt: Date.now() }]);
    setDraft('');
    setError('');
    lastRequestRef.current = null;
    clearSelectedImage();
  };

  const useSuggestion = (suggestion: string) => {
    setDraft(suggestion);
  };

  return (
    <div className="fixed bottom-5 right-5 z-30">
      {isCameraOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="orion-camera-title" className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="orion-camera-title" className="text-sm font-bold text-slate-900">Prendre une photo pour Orion</h2>
                <p className="mt-0.5 text-xs text-slate-500">Cadrez le symptôme de près, avec une bonne lumière.</p>
              </div>
              <button type="button" onClick={closeCamera} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Fermer la caméra">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="bg-slate-950 p-3">
              {cameraError ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900 px-6 text-center text-sm text-slate-200">
                  <Camera className="h-8 w-8 text-emerald-300" aria-hidden="true" />
                  <p>{cameraError}</p>
                  <button type="button" onClick={() => { closeCamera(); imageInputRef.current?.click(); }} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-300">Choisir une image</button>
                </div>
              ) : (
                <video ref={cameraVideoRef} autoPlay muted playsInline className="aspect-[4/3] w-full rounded-2xl object-cover" aria-label="Aperçu de la caméra" />
              )}
            </div>
            <footer className="flex items-center justify-between gap-3 px-5 py-4">
              <button type="button" onClick={closeCamera} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">Annuler</button>
              <button type="button" disabled={Boolean(cameraError)} onClick={capturePhoto} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Prendre la photo
              </button>
            </footer>
          </section>
        </div>
      ) : null}
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
                <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Conseils et analyse de photos</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" disabled={isSending} aria-label="Nouvelle conversation" title="Nouvelle conversation" onClick={startNewConversation} className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Fermer l’assistant agricole"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' ? (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                ) : null}
                <div className={`flex max-w-[82%] flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`px-1 text-[10px] font-semibold ${message.role === 'user' ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {message.role === 'user' ? 'Vous' : 'Orion'}
                  </span>
                  <div className={`overflow-hidden rounded-2xl text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-emerald-600 text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm'
                  }`}>
                    {message.image ? (
                      <img
                        src={message.image.previewUrl}
                        alt={`Photo envoyée : ${message.image.name}`}
                        className="max-h-44 w-full object-cover"
                      />
                    ) : null}
                    <p className="whitespace-pre-wrap px-3.5 py-2.5">{message.content}</p>
                  </div>
                  <time className="px-1 text-[10px] text-slate-400" dateTime={new Date(message.createdAt).toISOString()}>
                    {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(message.createdAt)}
                  </time>
                </div>
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
            {error ? (
              <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-relaxed">{error}</p>
                  {lastRequestRef.current ? (
                    <button type="button" disabled={isSending} onClick={retryLastRequest} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Réessayer
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {messages.length === STARTER_MESSAGES.length ? (
              <div className="mb-3 space-y-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
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
                <p className="px-1 text-[10px] leading-relaxed text-slate-500">Pour une analyse utile, joignez une photo nette du symptôme, précisez l’espèce et depuis quand le problème est observé.</p>
              </div>
            ) : null}
            {selectedImage ? (
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-2.5">
                <img src={selectedImage.previewUrl} alt="Aperçu de la photo à analyser" className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-emerald-950">{selectedImage.file.name}</p>
                  <p className="mt-0.5 text-[10px] text-emerald-700">Prête pour l’analyse d’Orion</p>
                </div>
                <button type="button" onClick={clearSelectedImage} className="rounded-lg p-1.5 text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Retirer la photo">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
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
                placeholder="Décrivez ce que vous observez…"
                className="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={isSending}
                onClick={() => setIsCameraOpen(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Prendre une photo avec la caméra"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={() => imageInputRef.current?.click()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Joindre une photo à analyser"
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="submit"
                disabled={(!draft.trim() && !selectedImage) || isSending}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                aria-label="Envoyer la question"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
            <p className="mt-2 px-1 text-[10px] leading-snug text-slate-400">JPG, PNG ou WebP, 7 Mo maximum. La photo est analysée pour cette demande et n’est pas ajoutée aux données FERM+. Conseils généraux uniquement : pour une urgence sanitaire ou un traitement, contactez un vétérinaire ou conseiller local.</p>
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
