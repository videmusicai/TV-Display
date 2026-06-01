import { useState, useEffect, useMemo, useRef, FormEvent, ChangeEvent } from "react";
import { 
  Tv, 
  Utensils, 
  Layers, 
  Image as ImageIcon, 
  DollarSign, 
  Wifi, 
  RefreshCw, 
  Sliders, 
  Plus, 
  Trash2, 
  Settings, 
  ChevronRight, 
  Copy, 
  ExternalLink, 
  Upload, 
  X, 
  Sparkles, 
  Check, 
  ChevronDown, 
  BookOpen, 
  Info, 
  AlertCircle,
  Megaphone,
  Lock,
  Users,
  Calendar,
  ShieldAlert,
  CreditCard,
  UserCheck,
  Search
} from "lucide-react";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "./firebase";
import { handleFirestoreError, OperationType } from "./firebaseError";
import { PRESET_TEMPLATES, MenuTemplate } from "./templates";

// Definindo as Interfaces principais
interface PlaylistItem {
  id: string;
  image: string;
  duration: number;
  enabled: boolean;
}

interface ScreenData {
  id: string;
  name: string;
  location: string;
  status: string;
  currentImage: string; // ID do template ou URL/Base64
  aspectRatio: string;
  lastSync: string;
  overlayPrices: boolean;
  selectedCategory: string; // categoria para filtrar o overlay
  clientId?: string;
  displayMode?: "single" | "playlist";
  playlist?: PlaylistItem[];
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  clientId?: string;
}

interface CustomImageData {
  id: string;
  name: string;
  base64: string;
  createdAt: string;
  clientId?: string;
}

// Componente de Logo Oficial do Vitrion Digital Display em SVG Vetorial de Alta Resolução
export function VitrionLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Gradiente Azul/Ciano Elétrico para o contorno da TV */}
        <linearGradient id="logoBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        {/* Gradiente Laranja/Ouro para a letra V */}
        <linearGradient id="logoOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Base da TV */}
      <path 
        d="M 32 70 H 68" 
        stroke="url(#logoBlueGrad)" 
        strokeWidth="4" 
        strokeLinecap="round" 
      />
      <rect x="46" y="60" width="8" height="10" rx="1" fill="url(#logoBlueGrad)" />
      
      {/* Moldura da TV (aberta no canto superior direito para a ponta do V sobressair) */}
      <path 
        d="M 62 20 H 18 C 13.5 20 10 23.5 10 28 V 52 C 10 56.5 13.5 60 18 60 H 72 C 76.5 60 80 56.5 80 52 V 33" 
        stroke="url(#logoBlueGrad)" 
        strokeWidth="4.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* A letra V estilizada (Sua Vitrine Digital Inteligente) */}
      <path 
        d="M 23 30 L 44 54 L 75 12" 
        stroke="url(#logoOrangeGrad)" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

export default function App() {
  // Estado de Roteamento Simples (Baseado em Query Params)
  const [screenParam, setScreenParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const screenId = params.get("screen");
    setScreenParam(screenId);
  }, []);

  // RENDERIZAÇÃO 1: Tela de Exibição Pública do Amazon Fire TV (Sem headers, sem botões)
  if (screenParam) {
    return <PublicDisplayView screenId={screenParam} />;
  }

  // RENDERIZAÇÃO 2: Dashboard Administrador Principal
  return <AdminDashboardView />;
}

// ==========================================
// VIEW 1: TELA PÚBLICA PARA O AMAZON FIRE TV
// ==========================================
function PublicDisplayView({ screenId }: { screenId: string }) {
  const [screen, setScreen] = useState<ScreenData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [introTimerDone, setIntroTimerDone] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [currentPlaylistItemIndex, setCurrentPlaylistItemIndex] = useState(0);

  // Filtra itens habilitados com imagem válida da playlist
  const enabledPlaylist = useMemo(() => {
    if (!screen?.playlist) return [];
    return screen.playlist.filter((item) => item.enabled && item.image);
  }, [screen?.playlist]);

  // Carrossel giratório com timings individuais por imagem
  useEffect(() => {
    if (enabledPlaylist.length <= 1) {
      setCurrentPlaylistItemIndex(0);
      return;
    }

    if (currentPlaylistItemIndex >= enabledPlaylist.length) {
      setCurrentPlaylistItemIndex(0);
      return;
    }

    const activeItem = enabledPlaylist[currentPlaylistItemIndex];
    const durationMs = Math.max(3, activeItem?.duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentPlaylistItemIndex((prevIndex) => (prevIndex + 1) % enabledPlaylist.length);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentPlaylistItemIndex, enabledPlaylist]);

  // Garante pelo menos 5 segundos de exibição do Logo Splash no início da TV
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroTimerDone(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Escuta em tempo real o documento da TV no Firestore
  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, "screens", screenId);
    
    let unsubscribeClient: (() => void) | null = null;

    const unsubscribeScreen = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as ScreenData;
        setScreen(data);
        setError(null);

        // Se a tela pertence a um cliente, monitora a assinatura do cliente em tempo real
        if (data.clientId) {
          if (unsubscribeClient) {
            (unsubscribeClient as () => void)();
          }
          
          unsubscribeClient = onSnapshot(doc(db, "clients", data.clientId), (clientSnap) => {
            if (clientSnap.exists()) {
              const clientData = clientSnap.data();
              const today = new Date();
              today.setHours(0,0,0,0);
              const expDate = new Date(clientData.expirationDate);
              expDate.setHours(23,59,59,999);
              
              if (clientData.status === "suspended") {
                setSubscriptionError("Esta transmissão foi suspensa pelo administrador da plataforma.");
              } else if (today > expDate) {
                setSubscriptionError(`Esta licença para o ponto de exibição expirou em ${new Date(clientData.expirationDate).toLocaleDateString("pt-BR")}. Por favor, realize o acerto da mensalidade para reestabelecer o sinal.`);
              } else {
                setSubscriptionError(null);
              }
            } else {
              // Se o cliente foi removido ou não existe no banco, desliga a TV por segurança
              setSubscriptionError("O transmissor associado a esta TV não foi localizado no cadastro.");
            }
          }, (err) => {
            console.error("Erro ao verificar termo de assinatura da tela", err);
          });
        } else {
          setSubscriptionError(null);
        }
      } else {
        setError(`A tela "${screenId}" não foi encontrada no banco do Vitrion Digital Display. Verifique o ID no painel administrador.`);
      }
      setLoading(false);
    }, (err) => {
      setError(`Erro na escuta da tela: ${err.message}`);
      setLoading(false);
    });

    // Escuta em tempo real os produtos para exibir como Overlay se ativado
    const productsRef = collection(db, "products");
    const unsubscribeProducts = onSnapshot(productsRef, (snapshot) => {
      const items: ProductData[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ProductData);
      });
      setProducts(items);
    }, (err) => {
      console.error("Erro ao obter produtos para overlay", err);
    });

    return () => {
      unsubscribeScreen();
      unsubscribeProducts();
      if (unsubscribeClient) {
        (unsubscribeClient as () => void)();
      }
    };
  }, [screenId]);

  if (loading || !introTimerDone) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans gap-8 select-none relative overflow-hidden">
        {/* Efeito sutil de brilho azul no fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative flex items-center justify-center w-32 h-32 animate-fade-in">
          {/* Círculos pulsantes externos */}
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-70" />
          <div className="absolute inset-4 bg-orange-500/10 rounded-full animate-pulse opacity-50" />
          
          <VitrionLogo className="w-20 h-20 relative z-10 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
        </div>

        <div className="flex flex-col items-center gap-1.5 relative z-10 text-center animate-fade-in">
          <h1 className="text-xl font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-sans leading-none">
            Vitrion
          </h1>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] leading-none mt-1">
            Digital Display
          </span>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
            Iniciando transmissão segura...
          </p>
        </div>

        {/* Barra de progresso elegante de 5 segundos */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 h-1.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
            style={{
              animation: "loading-bar 5s linear forwards"
            }}
          />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes loading-bar {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}} />
      </div>
    );
  }

  if (subscriptionError) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans p-8 text-center relative overflow-hidden select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500 relative animate-pulse">
          <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-50" />
          <Lock className="w-10 h-10 relative z-10" />
        </div>
        
        <h2 className="text-3xl font-black uppercase tracking-wider mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-400">
          Transmissão Indisponível
        </h2>
        <p className="text-[10px] text-red-400 uppercase tracking-[0.3em] font-bold mb-4">Aguardando Ativação da Licença</p>
        
        <p className="text-slate-300 max-w-sm text-xs leading-relaxed mb-8">
          {subscriptionError}
        </p>

        <div className="bg-slate-900 border border-white/5 py-4 px-6 rounded-xl max-w-xs mx-auto">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Identificador da TV</p>
          <p className="text-sm font-mono font-bold text-white tracking-wider mt-1">{screenId}</p>
        </div>
        
        <p className="absolute bottom-8 text-[9px] text-slate-600 uppercase tracking-[0.2em] font-semibold">
          Vitrion Digital Display SaaS • Painel Administrativo
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Erro de Sincronização</h2>
        <p className="text-slate-400 max-w-md text-sm mb-6">{error}</p>
        <p className="text-xs text-slate-500">Certifique-se de configurar a tela correspondente no painel de controle principal.</p>
      </div>
    );
  }

  // Filtragem dos produtos para overlay
  const filteredProducts = products.filter(
    (p) => p.available && (!screen?.selectedCategory || screen.selectedCategory === "Todas" || p.category === screen.selectedCategory)
  );

  // Determina se a imagem é um preset ou uma personalizada convertida
  const activeImageToShow = (screen?.displayMode === "playlist" && enabledPlaylist.length > 0)
    ? (enabledPlaylist[currentPlaylistItemIndex]?.image || "")
    : (screen?.currentImage || "");

  const presetTemplate = PRESET_TEMPLATES.find(t => t.id === activeImageToShow);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative flex items-center justify-center font-sans select-none">
      
      {/* 1. LAYER DE BACKGROUND: Imagem Real-Time (Preset SVG ou Base64 personalizada do usuário) */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {presetTemplate ? (
          <div 
            className="w-full h-full animate-fade-in"
            key={activeImageToShow}
            dangerouslySetInnerHTML={{ __html: presetTemplate.svgMarkup }}
          />
        ) : activeImageToShow ? (
          <img 
            src={activeImageToShow} 
            alt="Fornada Display" 
            className="w-full h-full object-cover animate-fade-in"
            key={activeImageToShow}
          />
        ) : (
          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-500">
            <Tv className="w-16 h-16 opacity-30 mb-2" />
            <p className="text-xs tracking-wider font-mono">NENHUMA IMAGEM ENVIADA PARA ESTA TELA</p>
          </div>
        )}
      </div>

      {/* 2. LAYER DE OVERLAY DINÂMICO DE PREÇOS (Opcional, com belo estilo glassmorphism) */}
      {screen?.overlayPrices && filteredProducts.length > 0 && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-[380px] bg-slate-950/85 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl text-white">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-amber-400 font-serif">Ajuste na Hora</h3>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Preços em Alta Definição</p>
            </div>
            <span className="text-[10px] px-2 py-1 bg-amber-400/10 text-amber-300 font-bold rounded-md">Ativo</span>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => (
              <div key={p.id} className="flex justify-between items-center group">
                <div className="flex-1 pr-4">
                  <h4 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">{p.name}</h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{p.category}</p>
                </div>
                {/* Linha pontilhada estilosa de cardápio */}
                <div className="flex-1 border-b border-dashed border-slate-700 mx-2 self-end mb-1 opacity-50"></div>
                <div className="text-right text-base font-bold text-amber-300 font-mono">
                  R$ {p.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400">
            <span>Última Sincronização: {screen.lastSync || "Agora mesmo"}</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Sincronizado
            </span>
          </div>
        </div>
      )}
      {/* Identificador Sutil de Tela Cheia no Canto */}
      <div className="absolute left-6 bottom-6 text-[10px] font-mono text-white/20 bg-black/40 px-2 py-1 rounded">
        Vitrion Digital Display Screen: {screen?.id} • {screen?.name}
      </div>

    </div>
  );
}

// ==========================================
// PRESETS DE PROMOÇÕES E AVISOS PROFISSIONAIS COMPILADOS EM SVG
// ==========================================
const PROMPT_PROMO_PRESETS_RAW = [
  {
    id: "promo-combo",
    title: "Combo: CAFÉ EXPRESSO + COPO DE PÃO DE QUEIJO",
    subtitle: "Oferta imperdível do balcão",
    category: "Combo Sabor",
    svgMarkup: `<svg viewBox="0 0 1024 576" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-combo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1024" height="576" fill="url(#grad-combo)" />
      <rect x="25" y="25" width="974" height="526" fill="none" stroke="#f59e0b" stroke-width="4" rx="15" opacity="0.8" />
      <rect x="35" y="35" width="954" height="506" fill="none" stroke="#e2e8f0" stroke-width="1.5" rx="10" opacity="0.15" />
      
      <!-- Detalhe visual esquerdo -->
      <path d="M 0 0 L 150 0 L 0 400" fill="#f59e0b" opacity="0.2" />
      <path d="M 1024 576 L 874 576 L 1024 176" fill="#f59e0b" opacity="0.1" />

      <!-- Textos principais -->
      <text x="512" y="110" text-anchor="middle" fill="#f59e0b" font-family="'Georgia', serif" font-size="24" font-weight="bold" letter-spacing="4">OFERTA IMPERDÍVEL HOJE</text>
      <text x="512" y="190" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="52" font-weight="900" letter-spacing="1">COMBO CAFÉ E PÃO DE QUEIJO</text>
      <text x="512" y="240" text-anchor="middle" fill="#94a3b8" font-family="'Courier New', monospace" font-size="14" font-weight="bold" letter-spacing="4">O CLÁSSICO PERFEITO PARA COMEÇAR O SEU DIA</text>

      <!-- Preço gigante em destaque circular ou badge -->
      <rect x="362" y="280" width="300" height="120" rx="20" fill="#f59e0b" />
      <text x="512" y="332" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-size="34" font-weight="950">Apenas</text>
      <text x="512" y="378" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-size="36" font-weight="900">R$ 14,90</text>

      <text x="512" y="475" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="12" font-weight="600" letter-spacing="1">Disponível em todos os balcões • Imagem meramente ilustrativa</text>
    </svg>`
  },
  {
    id: "promo-pix",
    title: "Chave PIX e QR Code para Pagar",
    subtitle: "Aviso de facilidade para o balcão",
    category: "Finanças / Checkout",
    svgMarkup: `<svg viewBox="0 0 1024 576" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-pix" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#015a5a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#083333;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1024" height="576" fill="url(#grad-pix)" />
      <rect x="30" y="30" width="964" height="516" fill="none" stroke="#2dd4bf" stroke-width="3" rx="12" opacity="0.6" />

      <!-- Símbolo Pix no background sutil -->
      <path d="M 50 150 L 150 50 L 250 150 L 150 250 Z" fill="none" stroke="#2dd4bf" stroke-width="4" opacity="0.1" />

      <!-- Coluna da Esquerda: Textos ilustrativos -->
      <g transform="translate(100, 0)">
        <text x="0" y="130" fill="#2dd4bf" font-family="sans-serif" font-size="20" font-weight="bold" letter-spacing="4">PAGAMENTO INSTANTÂNEO</text>
        <text x="0" y="210" fill="#ffffff" font-family="sans-serif" font-size="54" font-weight="950" letter-spacing="1">ACEITAMOS PIX</text>
        
        <text x="0" y="280" fill="#e2e8f0" font-family="sans-serif" font-size="18" font-weight="bold">CHAVE CNPJ DA PADARIA:</text>
        <rect x="0" y="305" width="450" height="55" rx="8" fill="#082b2b" stroke="#2dd4bf" stroke-width="1.5" />
        <text x="20" y="338" fill="#2dd4bf" font-family="monospace" font-size="18" font-weight="900">12.345.678/0001-99</text>
        
        <text x="0" y="395" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="600">Confirme o favorecedor: Vitrion Padaria &amp; Confeitaria Ltda</text>
        <text x="0" y="460" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">Evite filas! Pague por PIX e retire no balcão de entregas.</text>
      </g>

      <!-- Coluna da Direita: Mock QR Code -->
      <g transform="translate(680, 110)">
        <rect x="0" y="0" width="220" height="220" rx="10" fill="#ffffff" stroke="#2dd4bf" stroke-width="4" />
        <!-- Grade preta representando o QR Code sutil -->
        <rect x="25" y="25" width="50" height="50" fill="#083333" />
        <rect x="145" y="25" width="50" height="50" fill="#083333" />
        <rect x="25" y="145" width="50" height="50" fill="#083333" />
        <!-- Padrão mock -->
        <rect x="90" y="90" width="40" height="40" fill="#083333" />
        <rect x="50" y="100" width="20" height="20" fill="#083333" />
        <rect x="100" y="50" width="20" height="20" fill="#083333" />
        <rect x="150" y="100" width="30" height="30" fill="#083333" />
        <rect x="100" y="145" width="30" height="30" fill="#083333" />
        <!-- Legenda QR code -->
        <text x="110" y="270" text-anchor="middle" fill="#2dd4bf" font-family="sans-serif" font-size="15" font-weight="900" letter-spacing="1">ESCANEAR PARA PAGAR</text>
      </g>
    </svg>`
  },
  {
    id: "promo-fresh-bread",
    title: "Festival Sazonal: PÃO QUENTINHO NA MESA",
    subtitle: "Informativo rústico de fornada fresca",
    category: "Aviso de Fornada",
    svgMarkup: `<svg viewBox="0 0 1024 576" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-bread" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#451a03;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1c1917;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1024" height="576" fill="url(#grad-bread)" />
      <rect x="25" y="25" width="974" height="526" fill="none" stroke="#f97316" stroke-width="4" opacity="0.6" />
      
      <!-- Detalhes no topo -->
      <line x1="300" y1="65" x2="724" y2="65" stroke="#f97316" stroke-width="2" opacity="0.5" />
      <circle cx="512" cy="65" r="5" fill="#f97316" />

      <!-- Textos principais -->
      <text x="512" y="130" text-anchor="middle" fill="#f97316" font-family="'Georgia', serif" font-size="30" font-style="italic" font-weight="bold">Fornada Rústica</text>
      <text x="512" y="210" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="56" font-weight="950" letter-spacing="2">PÃO INTEGRAL &amp; ITALIANO</text>
      <text x="512" y="260" text-anchor="middle" fill="#fdba74" font-family="sans-serif" font-size="16" font-weight="700" letter-spacing="4">SAINDO TODOS OS DIAS • 16:30 hrs</text>

      <!-- Divisória decorada -->
      <line x1="250" y1="310" x2="774" y2="310" stroke="#f97316" stroke-width="1.5" opacity="0.3" />

      <!-- Tabela sutil de horários -->
      <g transform="translate(200, 340)">
        <text x="0" y="30" fill="#fdba74" font-family="sans-serif" font-size="14" font-weight="bold">SEGUNDA A SEXTA</text>
        <text x="0" y="65" fill="#ffffff" font-family="monospace" font-size="24" font-weight="bold">07:0 | 12:0 | 16:30 | 19:0</text>
        
        <text x="400" y="30" fill="#fdba74" font-family="sans-serif" font-size="14" font-weight="bold">SÁBADOS E FERIADOS</text>
        <text x="400" y="65" fill="#ffffff" font-family="monospace" font-size="24" font-weight="bold">07:30 | 11:30 | 17:00</text>
      </g>

      <text x="512" y="495" text-anchor="middle" fill="#a8a29e" font-family="sans-serif" font-size="12" font-style="italic">Feito com fermentação 100% natural, crocância pura por fora e maciez por dentro</text>
    </svg>`
  }
];

const PROMPT_PROMO_PRESETS = PROMPT_PROMO_PRESETS_RAW.map(item => ({
  ...item,
  dataUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(item.svgMarkup)))}`,
  previewSvg: item.svgMarkup
}));

// ==========================================
// VIEW 2: PAINEL ADMINISTRATIVO (DASHBOARD)
// ==========================================
function AdminDashboardView() {
  const [activeTab, setActiveTab] = useState<"screens" | "products" | "assets" | "promotions" | "gallery" | "how-to" | "clients">("screens");
  const [rawScreens, setRawScreens] = useState<ScreenData[]>([]);
  const [rawProducts, setRawProducts] = useState<ProductData[]>([]);
  const [user, setUser] = useState<any>(null);

  // Estados dos Formulários de Autenticação (Login e Registro SaaS)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStoreName, setAuthStoreName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const handleAnonymousLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const cred = await signInAnonymously(auth);
      if (cred.user) {
        setUser(cred.user);
        showToast("Conectado em modo de demonstração!", "success");
      }
    } catch (err: any) {
      console.warn("Autenticação anônima do Firebase indisponível ou restrita. Usando sessão de testes local.", err);
      setUser({
        uid: "admin_local",
        isAnonymous: true,
        email: "admin@vitrion.com.br",
        emailVerified: true
      });
      showToast("Conectado com usuário administrativo local.", "success");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "login") {
        // Sign in with Firebase Auth
        const cred = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        if (cred.user) {
          setUser(cred.user);
          showToast(`Painel Vitrion acessado com sucesso!`, "success");
        }
      } else {
        // Sign up and create new customer account
        if (!authStoreName.trim()) {
          setAuthError("Por favor, preencha o Nome do Estabelecimento.");
          setAuthLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        if (cred.user) {
          // Logged in user!
          // Now create their SaaS client record in database
          const cliId = `client_${cred.user.uid}`;
          const expiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 15 dias de teste grátis!
          
          await setDoc(doc(db, "clients", cliId), {
            id: cliId,
            name: authStoreName,
            ownerEmail: authEmail.toLowerCase(),
            phone: authPhone || "",
            contactPhone: authPhone || "",
            monthlyFee: 99.90,
            expirationDate: expiry,
            status: "active",
            createdAt: new Date().toISOString()
          });

          // Also create a default screen for them so they can immediately see it!
          await setDoc(doc(db, "screens", `tv_${cred.user.uid}`), {
            id: `tv_${cred.user.uid}`,
            name: "TV Recepção - Principal",
            location: authStoreName,
            aspectRatio: "16:9",
            status: "online",
            currentImage: "chalk-bakery",
            lastSync: "Criada agora",
            overlayPrices: false,
            selectedCategory: "Todas",
            clientId: cliId,
            displayMode: "single",
            playlist: [
              { id: "slot-1", image: "chalk-bakery", duration: 10, enabled: true },
              { id: "slot-2", image: "cozy-coffee", duration: 10, enabled: false },
              { id: "slot-3", image: "", duration: 10, enabled: false },
              { id: "slot-4", image: "", duration: 10, enabled: false }
            ]
          });

          setUser(cred.user);
          showToast(`Sua conta e TV foram registradas com sucesso!`, "success");
        }
      }
    } catch (err: any) {
      console.error("Auth error", err);
      let BrazilianErrorMessage = "Ocorreu um erro ao processar. Verifique suas credenciais.";
      if (err.code === "auth/email-already-in-use") {
        BrazilianErrorMessage = "Este e-mail já está sendo utilizado por outra conta.";
      } else if (err.code === "auth/invalid-email") {
        BrazilianErrorMessage = "Formato de e-mail inválido.";
      } else if (err.code === "auth/weak-password") {
        BrazilianErrorMessage = "A senha deve ter no mínimo 6 caracteres.";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        BrazilianErrorMessage = "E-mail ou senha incorretos.";
      }
      setAuthError(BrazilianErrorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  // Banco de Imagens em Nuvem
  const [rawCustomImages, setRawCustomImages] = useState<CustomImageData[]>([]);
  const [galleryFileBase64, setGalleryFileBase64] = useState<string | null>(null);
  const [galleryFileName, setGalleryFileName] = useState<string>("");
  const [uploadingToGallery, setUploadingToGallery] = useState(false);
  const [targetBroadcastingImage, setTargetBroadcastingImage] = useState<CustomImageData | null>(null);
  const [broadcastingScreens, setBroadcastingScreens] = useState<string[]>([]);

  // SaaS Multi-Client States
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("all"); // "all" ou ID do cliente específico para o Super Admin
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientFee, setNewClientFee] = useState("99.90");
  const [newClientExpiration, setNewClientExpiration] = useState("");
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  const isSuperAdmin = user?.email?.toLowerCase() === "videmusicai@gmail.com" || user?.email?.toLowerCase() === "admin@vitrion.com.br";

  const loggedInClient = useMemo(() => {
    if (!user?.email) return null;
    return clients.find(c => c.ownerEmail?.toLowerCase() === user.email.toLowerCase());
  }, [clients, user]);

  const subscriptionStatus = useMemo(() => {
    if (isSuperAdmin) return { isValid: true, state: "super_admin" };
    if (!user) return { isValid: true, state: "loading" };
    if (!loggedInClient) {
      return { isValid: true, state: "demo", reason: "Sua conta é de demonstração. Entre em contato com o dono do sistema (contato: videmusicai@gmail.com) para obter sua própria credencial com TVs ativas." };
    }
    
    if (loggedInClient.status === "suspended") {
      return { isValid: false, state: "suspended", reason: "Seu acesso comercial foi suspenso pelo administrador do Vitrion." };
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(loggedInClient.expirationDate);
    expDate.setHours(23,59,59,999);
    
    if (today > expDate) {
      return { isValid: false, state: "expired", reason: `Sua assinatura mensal de ponto físico expirou em ${expDate.toLocaleDateString("pt-BR")}. Contate o administrador (videmusicai@gmail.com) para regularizar.` };
    }
    
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 5) {
      return { isValid: true, state: "near_due", daysLeft: diffDays, reason: `Faltam apenas ${diffDays} dias para o vencimento de sua licença (${expDate.toLocaleDateString("pt-BR")}).` };
    }
    
    return { isValid: true, state: "active" };
  }, [loggedInClient, isSuperAdmin, user]);

  const getCurrentClientId = () => {
    if (isSuperAdmin) {
      return selectedClientId === "all" ? "demo_client" : selectedClientId;
    }
    return loggedInClient ? loggedInClient.id : "demo_client";
  };

  const filteredScreens = useMemo(() => {
    if (isSuperAdmin && selectedClientId === "all") return rawScreens;
    return rawScreens.filter(s => s.clientId === getCurrentClientId());
  }, [rawScreens, selectedClientId, isSuperAdmin, loggedInClient, clients]);

  const filteredProducts = useMemo(() => {
    if (isSuperAdmin && selectedClientId === "all") return rawProducts;
    return rawProducts.filter(p => p.clientId === getCurrentClientId());
  }, [rawProducts, selectedClientId, isSuperAdmin, loggedInClient, clients]);

  const filteredCustomImages = useMemo(() => {
    if (isSuperAdmin && selectedClientId === "all") return rawCustomImages;
    return rawCustomImages.filter(img => img.clientId === getCurrentClientId());
  }, [rawCustomImages, selectedClientId, isSuperAdmin, loggedInClient, clients]);

  // Declaração de compatibilidade transparente
  const screens = filteredScreens;
  const products = filteredProducts;
  const customImages = filteredCustomImages;

  // Funções de Gestão de Clientes SaaS
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail || !newClientExpiration) {
      showToast("Por favor, preencha o nome da loja, email do cliente e data de vencimento.", "error");
      return;
    }
    try {
      const cId = editingClient ? editingClient.id : `client_${Date.now()}`;
      const payload = {
        id: cId,
        name: newClientName.trim(),
        ownerEmail: newClientEmail.trim().toLowerCase(),
        phone: newClientPhone.trim(),
        monthlyFee: parseFloat(newClientFee) || 0,
        expirationDate: newClientExpiration,
        status: editingClient ? editingClient.status : "active"
      };
      await setDoc(doc(db, "clients", cId), payload);
      showToast(`Cliente "${newClientName}" salvo com sucesso!`, "success");
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientFee("99.90");
      setNewClientExpiration("");
      setEditingClient(null);
    } catch (err) {
      console.error("Erro ao gravar cliente:", err);
      showToast("Erro ao gravar dados do cliente no Firebase.", "error");
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente apagar o cliente "${name}"? Todas as TVs sintonizadas a ele perderão o sinal.`)) return;
    try {
      await deleteDoc(doc(db, "clients", id));
      showToast(`Cliente "${name}" excluído do sistema.`, "success");
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      showToast("Erro ao remover cliente.", "error");
    }
  };

  const toggleClientStatus = async (client: any) => {
    const nextStatus = client.status === "active" ? "suspended" : "active";
    try {
      await updateDoc(doc(db, "clients", client.id), {
        status: nextStatus
      });
      showToast(`Cliente "${client.name}" está agora ${nextStatus === "active" ? "Ativo" : "Suspenso"}!`, "success");
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      showToast("Erro ao alterar status do cliente.", "error");
    }
  };

  // Estados para Promoções Customizadas e Envios Manuais
  const [promoFileBase64, setPromoFileBase64] = useState<string | null>(null);
  const [promoFileName, setPromoFileName] = useState<string>("");
  const [selectedPromoScreens, setSelectedPromoScreens] = useState<string[]>([]);

  // Função para processamento e compressão inteligente de imagens via canvas para ficar leve no Firestore
  const handlePromoFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      showToast("A imagem excedeu o limite máximo recomendado de 12MB.", "error");
      return;
    }

    setPromoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1280; // Resolução ideal horizontal sem sobrecarregar o Firestore

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85); // Compressão equilibrada
          setPromoFileBase64(compressed);
          showToast("A imagem promocional foi processada e comprimida com sucesso!", "success");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePublishPromotion = async () => {
    if (!promoFileBase64) {
      showToast("Por favor, selecione ou envie uma imagem promocional primeiro.", "info");
      return;
    }
    if (selectedPromoScreens.length === 0) {
      showToast("Selecione pelo menos uma TV para receber esta promoção.", "info");
      return;
    }

    try {
      showToast("Publicando promoção nas TVs conectadas...", "info");
      const promises = selectedPromoScreens.map((scId) => 
        updateDoc(doc(db, "screens", scId), {
          currentImage: promoFileBase64,
          lastSync: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        })
      );
      await Promise.all(promises);
      showToast(`Sucesso! Promoção transmitida em tempo real para ${selectedPromoScreens.length} TV(s)!`, "success");
      setPromoFileBase64(null);
      setPromoFileName("");
      setSelectedPromoScreens([]);
    } catch (err: unknown) {
      console.error("Erro ao sintonizar promoção:", err);
      showToast("Erro ao sintonizar promoção nas TVs selecionadas.", "error");
    }
  };

  // Seleção e compressão inteligente de imagens para salvamento em Banco de Dados
  const handleGalleryFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      showToast("A imagem excedeu o limite máximo recomendado de 12MB.", "error");
      return;
    }

    setGalleryFileName(file.name.split(".")[0]); // Pré-preenche o nome amigável
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1280; // Ideal para TVs de Alta Definição

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setGalleryFileBase64(compressed);
          showToast("A imagem foi processada e está pronta para o Banco de Dados!", "success");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Salvar imagem customizada no Banco de Dados Firestore
  const handleSaveToGallery = async () => {
    if (!subscriptionStatus.isValid) {
      showToast("Não é possível salvar imagens no banco: Sua assinatura está vencida ou suspensa.", "error");
      return;
    }
    if (!galleryFileBase64) {
      showToast("Selecione uma imagem promocional ou cartaz primeiro.", "info");
      return;
    }

    setUploadingToGallery(true);
    try {
      const imgName = galleryFileName.trim() || `Promoção ${new Date().toLocaleDateString()}`;
      const newId = `img-${Date.now()}`;
      
      await setDoc(doc(db, "custom_images", newId), {
        id: newId,
        name: imgName,
        base64: galleryFileBase64,
        createdAt: new Date().toISOString(),
        clientId: getCurrentClientId()
      });

      showToast(`Imagem "${imgName}" salva com sucesso no Banco de Dados Central!`, "success");
      setGalleryFileBase64(null);
      setGalleryFileName("");
    } catch (err: unknown) {
      console.error("Erro ao salvar imagem no banco de dados:", err);
      showToast("Erro ao guardar no banco de dados.", "error");
    } finally {
      setUploadingToGallery(false);
    }
  };

  // Excluir imagem do Banco de Dados Firestore
  const handleDeleteFromGallery = async (imageId: string, imageName: string) => {
    try {
      await deleteDoc(doc(db, "custom_images", imageId));
      showToast(`Imagem "${imageName}" removida do Banco de Dados!`, "success");
    } catch (err: unknown) {
      console.error("Erro ao remover imagem do banco de dados:", err);
      showToast("Erro ao remover a imagem selecionada.", "error");
    }
  };

  // Transmitir imagem do Banco de Dados para múltiplas TVs ao mesmo tempo
  const handleBroadcastGalleryImage = async () => {
    if (!targetBroadcastingImage) return;
    if (broadcastingScreens.length === 0) {
      showToast("Selecione pelo menos uma SmartTV para transmitir.", "info");
      return;
    }

    try {
      showToast("Sintonizando imagem nas TVs selecionadas...", "info");
      const promises = broadcastingScreens.map((scId) => 
        updateDoc(doc(db, "screens", scId), {
          currentImage: targetBroadcastingImage.base64,
          lastSync: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        })
      );
      await Promise.all(promises);
      showToast(`Mídia "${targetBroadcastingImage.name}" transmitida em tempo real!`, "success");
      setTargetBroadcastingImage(null);
      setBroadcastingScreens([]);
    } catch (err: unknown) {
      console.error("Erro ao sintonizar imagem no banco:", err);
      showToast("Erro de transmissão de sinal.", "error");
    }
  };
  
  // Estados para modais de edição
  const [editingScreen, setEditingScreen] = useState<ScreenData | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [isDeletingScreen, setIsDeletingScreen] = useState<string | null>(null);

  // Estado para Toast / Mensagens de Sucesso e Erro (Evitando alert e confirm do Navegador)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Estados com formulários
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Padaria");
  
  // Assistente de IA para formulação de Prompts
  const [promptCategory, setPromptCategory] = useState("Padaria");
  const [promptStyle, setPromptStyle] = useState("Chalkboard Rústica");
  const [promptOutput, setPromptOutput] = useState("");

  // Referência de Arquivo para Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadScreenId, setUploadScreenId] = useState<string | null>(null);

  // 1. Escuta Estado de Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  // 2. Carrega Dados do Firestore em Tempo Real (Sistemas Administrativos Multi-Client)
  useEffect(() => {
    const unsubscribeClients = onSnapshot(collection(db, "clients"), (snapshot) => {
      const clientItems: any[] = [];
      snapshot.forEach((doc) => {
        clientItems.push({ id: doc.id, ...doc.data() });
      });
      clientItems.sort((a, b) => a.name.localeCompare(b.name));
      setClients(clientItems);
    }, (error) => {
      console.warn("Dificuldade ao carregar clientes do banco", error);
    });

    const unsubscribeScreens = onSnapshot(collection(db, "screens"), (snapshot) => {
      const screenItems: ScreenData[] = [];
      snapshot.forEach((doc) => {
        screenItems.push({ id: doc.id, ...doc.data() } as ScreenData);
      });
      // Ordena por id
      screenItems.sort((a, b) => a.id.localeCompare(b.id));
      setRawScreens(screenItems);
    }, (error) => {
      console.error("Erro na escuta das telas", error);
    });

    const unsubscribeProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const productItems: ProductData[] = [];
      snapshot.forEach((doc) => {
        productItems.push({ id: doc.id, ...doc.data() } as ProductData);
      });
      setRawProducts(productItems);
    }, (error) => {
      console.error("Erro na escuta dos produtos", error);
    });

    const unsubscribeCustomImages = onSnapshot(collection(db, "custom_images"), (snapshot) => {
      const imageItems: CustomImageData[] = [];
      snapshot.forEach((doc) => {
        imageItems.push({ id: doc.id, ...doc.data() } as CustomImageData);
      });
      imageItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRawCustomImages(imageItems);
    }, (error) => {
      console.error("Erro na escuta das imagens customizadas", error);
    });

    return () => {
      unsubscribeClients();
      unsubscribeScreens();
      unsubscribeProducts();
      unsubscribeCustomImages();
    };
  }, []);

  // 3. Inicializa os dados padrões se o Firestore estiver zerado
  const handleInitializeDefaults = async () => {
    try {
      const batch = writeBatch(db);

      // Default Screens
      const defaultScreensList = [
        { id: "tela-1", name: "Tabela de Pães - Principal", location: "Balcão Administrativo", status: "online", currentImage: "chalk-bakery", aspectRatio: "16:9", lastSync: "Pronto", overlayPrices: true, selectedCategory: "Padaria" },
        { id: "tela-2", name: "Promocional Doces - Vitrina", location: "Vitrine Lateral", status: "online", currentImage: "pastel-sweet", aspectRatio: "16:9", lastSync: "Pronto", overlayPrices: true, selectedCategory: "Doce" },
        { id: "tela-3", name: "Cafés Exclusivos & Quentes", location: "Entrada Próximo Caixas", status: "online", currentImage: "cozy-coffee", aspectRatio: "16:9", lastSync: "Pronto", overlayPrices: true, selectedCategory: "Café" },
        { id: "tela-4", name: "Brunch e Almoço do Dia", location: "Bistrô Externo", status: "online", currentImage: "modern-brunch", aspectRatio: "16:9", lastSync: "Pronto", overlayPrices: true, selectedCategory: "Lanches" },
        { id: "tela-5", name: "Happy Hour & Promoções", location: "Mesas do Deck", status: "online", currentImage: "chalk-bakery", aspectRatio: "16:9", lastSync: "Pronto", overlayPrices: false, selectedCategory: "Todas" },
        { id: "tela-6", name: "Avisos Gerais & Pix", location: "Frente do Caixa 2", status: "online", currentImage: "modern-brunch", aspectRatio: "16:9", lastSync: "Pronto", overlayPrices: false, selectedCategory: "Todas" },
        { id: "tela-7", name: "Boas-Vindas Institucional", location: "Fachada de Entrada", status: "online", currentImage: "chalk-bakery", aspectRatio: "16:9", lastSync: "Pronto", overlayPrices: false, selectedCategory: "Todas" }
      ];

      for (const dScreen of defaultScreensList) {
        const docRef = doc(db, "screens", dScreen.id);
        batch.set(docRef, dScreen);
      }

      // Default Products
      const defaultProductsList = [
        { id: "p1", name: "Pão Francês Fresquinho (kg)", price: 14.90, category: "Padaria", available: true },
        { id: "p2", name: "Croissant Folhado Clássico", price: 8.50, category: "Padaria", available: true },
        { id: "p3", name: "Pão de Queijo Cascudo (un)", price: 4.50, category: "Padaria", available: true },
        { id: "p4", name: "Sonho Tradicional de Creme", price: 7.90, category: "Doce", available: true },
        { id: "p5", name: "Fatia Bolo Triplo Chocolate", price: 12.00, category: "Doce", available: true },
        { id: "p6", name: "Café Expresso Intensidade 8", price: 5.50, category: "Café", available: true },
        { id: "p7", name: "Caffè Latte Cremoso Médio", price: 7.90, category: "Café", available: true },
        { id: "p8", name: "Sanduíche Panini de Presunto e Queijo", price: 15.90, category: "Lanches", available: true }
      ];

      for (const dProd of defaultProductsList) {
        const docRef = doc(db, "products", dProd.id);
        batch.set(docRef, dProd);
      }

      await batch.commit();
      showToast("O sistema foi redefinido e povoado com 7 TVs prontas e um cardápio de padaria rústica!", "success");
    } catch (err: unknown) {
      console.error("Erro ao inicializar:", err);
      showToast(`Erro ao redefinir base: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  };

  // 4. CADASTRA / ATUALIZA PRODUTOS
  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;
    
    if (!subscriptionStatus.isValid) {
      showToast("Não é possível salvar produtos: Sua assinatura está bloqueada ou vencida. Ative sua mensalidade.", "error");
      return;
    }

    try {
      const pId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
      const payload: any = {
        id: pId,
        name: newProdName,
        price: parseFloat(parseFloat(newProdPrice.replace(",", ".")).toFixed(2)),
        category: newProdCategory,
        available: editingProduct ? editingProduct.available : true,
        clientId: getCurrentClientId()
      };

      await setDoc(doc(db, "products", pId), payload);
      
      // Limpar formulário de cadastro
      setNewProdName("");
      setNewProdPrice("");
      setEditingProduct(null);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `products-save`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este produto do catálogo?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  // 5. ATUALIZA CONFIGURAÇÃO DE UMA TELA (E.G. OVERLAY OU PRESET)
  const handleUpdateScreenConfig = async (updated: ScreenData) => {
    if (!subscriptionStatus.isValid) {
      showToast("Não é possível alterar as TVs: Sua assinatura está vencida ou bloqueada.", "error");
      return;
    }
    try {
      await updateDoc(doc(db, "screens", updated.id), {
        name: updated.name,
        location: updated.location,
        overlayPrices: updated.overlayPrices,
        selectedCategory: updated.selectedCategory,
        currentImage: updated.currentImage,
        clientId: updated.clientId || getCurrentClientId(),
        displayMode: updated.displayMode || "single",
        playlist: updated.playlist || [],
        lastSync: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      });
      setEditingScreen(null);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `screens/${updated.id}`);
    }
  };

  // Adiciona nova TV se desejar (até 10 ou ilimitado)
  const handleAddNewScreen = async () => {
    if (!subscriptionStatus.isValid) {
      showToast("Não é possível adicionar TVs: Sua assinatura está vencida ou bloqueada.", "error");
      return;
    }
    const currentId = getCurrentClientId();
    const count = rawScreens.filter(s => s.clientId === currentId).length;
    const nextId = `tela-${currentId}-${Date.now()}`;
    const name = `SmartTV 0${count + 1}`;
    try {
      await setDoc(doc(db, "screens", nextId), {
        id: nextId,
        name: name,
        location: "Nova Área Comercial",
        status: "online",
        currentImage: "chalk-bakery",
        aspectRatio: "16:9",
        lastSync: "Criada agora",
        overlayPrices: false,
        selectedCategory: "Todas",
        clientId: currentId,
        displayMode: "single",
        playlist: [
          { id: "slot-1", image: "chalk-bakery", duration: 10, enabled: true },
          { id: "slot-2", image: "cozy-coffee", duration: 10, enabled: false },
          { id: "slot-3", image: "", duration: 10, enabled: false },
          { id: "slot-4", image: "", duration: 10, enabled: false }
        ]
      });
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `screens/${nextId}`);
    }
  };

  const handleDeleteScreen = async () => {
    if (!isDeletingScreen) return;
    try {
      await deleteDoc(doc(db, "screens", isDeletingScreen));
      setIsDeletingScreen(null);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `screens/${isDeletingScreen}`);
    }
  };

  // 6. TRATAMENTO SENSACIONAL DE ARQUIVO PARA BASE64 COM COMPRESSÃO INTELIGENTE
  const handleUploadImageFile = (e: ChangeEvent<HTMLInputElement>, screenId: string) => {
    if (!subscriptionStatus.isValid) {
      showToast("Não é possível enviar imagens: Sua assinatura está vencida ou suspensa.", "error");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      showToast("Erro: A imagem excede o limite máximo para upload (máx: 12MB).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1280; // Resolução ideal para TV sem pesar no Firestore

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          
          try {
            await updateDoc(doc(db, "screens", screenId), {
              currentImage: compressedBase64,
              lastSync: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            });
            showToast(`A nova imagem/promoção foi enviada e sincronizada com a TV: ${screenId}!`, "success");
          } catch (err: unknown) {
            console.error("Erro ao fazer upload da imagem:", err);
            showToast("Erro ao salvar imagem na TV. Verifique os limites do Firestore.", "error");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePlaylistSlotFileSelect = (e: ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      showToast("Erro: A imagem excede o limite máximo para upload (máx: 12MB).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1200; // compact dimensions specifically for slot documents

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75); // high compression ratio for playlist item
          
          if (editingScreen) {
            const list = editingScreen.playlist ? [...editingScreen.playlist] : [];
            while (list.length <= slotIndex) {
              list.push({ id: `slot-${list.length + 1}`, image: "", duration: 10, enabled: false });
            }
            list[slotIndex] = {
              ...list[slotIndex],
              image: compressedBase64,
              enabled: true // auto-enable slot on custom upload
            };
            setEditingScreen({ ...editingScreen, playlist: list });
            showToast(`Imagem carregada no Slot 0${slotIndex + 1}! Clique em sincronizar para salvar.`, "success");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = (screenId: string) => {
    setUploadScreenId(screenId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 7. GERADOR DE PROMPTS DE IA (ASSISTENTE EXCLUSIVO)
  const generateAIPrompt = () => {
    let basePrompt = "";
    if (promptStyle === "Chalkboard Rústica") {
      basePrompt = `Rustic chalkboard bakery signage, high contrast slate gray texture, artistic chalk-drawn sketch of fresh bakery sourdough bread and warm croissant vector linearts, styled elegantly. Text headers like "FORNADA DO DIA fresca e quentinha" written in gorgeous calligraphy typography, high-density placement. Isolated layout with beautiful margins, realistic lighting, epic commercial food photographer, flat design menu board, background, 8k resolution, aspect ratio 16:9 --ar 16:9`;
    } else if (promptStyle === "Confeitaria Delicada") {
      basePrompt = `Gourmet pastel pink and cream luxury sweets menu vector board, watercolor sketch of delicate cupcakes, strawberry macarons and cherry tarts, elegant gold foil borders, chic handdrawn serif calligraphy. Professional luxury coffee shop bakery aesthetic, clean grid layout, ultra high fidelity, hyperdetailed, 3d render clean background list, Midjourney style, --ar 16:9`;
    } else if (promptStyle === "Cafeteria Moderna") {
      basePrompt = `Modern minimalist dark charcoal espresso coffee-shop price list frame background, steam rising from ceramic coffee cups, rustic coffee beans, industrial brass pipes, warm retro neon lettering overlay, professional digital menu template, stylish, high dynamic range --ar 16:9`;
    } else {
      basePrompt = `Brunch geometric design, light off-white and lemon-yellow block highlights, gourmet cheese and warm panini sandwich sketches, flat illustration typography signage, clean borders, professional corporate cafe display look --ar 16:9`;
    }
    setPromptOutput(basePrompt);
  };

  // Sincroniza prompt de IA inicial com base na aba ativa
  useEffect(() => {
    generateAIPrompt();
  }, [promptCategory, promptStyle]);

  // Estatísticas fáceis calculadas
  const onlineCount = screens.length; 
  const totalProducts = products.length;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans relative p-4 overflow-hidden">
        {/* Elementos de Brilho de Fundo */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 transition-all duration-300">
          <div className="flex flex-col items-center mb-8">
            <VitrionLogo className="w-14 h-14 mb-4 filter drop-shadow-[0_4px_12px_rgba(56,189,248,0.2)]" />
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Vitrion</h2>
            <p className="text-slate-400 text-xs text-center font-semibold tracking-wider uppercase mt-1">Sua Vitrine Digital Inteligente</p>
          </div>

          {/* Seletor de Tabs */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 mb-6 font-semibold select-none">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
                authMode === "login"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Conectar
            </button>
            <button
              type="button"
              id="tab-auth-signup"
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
                authMode === "signup"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {authError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="font-semibold">{authError}</div>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div>
                <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Nome do Estabelecimento / Loja</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <Utensils className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={authStoreName}
                    onChange={(e) => setAuthStoreName(e.target.value)}
                    placeholder="ex: Padaria Colonial, Cafeteria do Bairro"
                    className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">E-mail de Acesso</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <UserCheck className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="ex: contato@suapadaria.com"
                  className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Senha Secreta</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-600"
                />
              </div>
            </div>

            {authMode === "signup" && (
              <div>
                <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">WhatsApp / Telefone (Opcional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <Megaphone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="ex: (11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-600"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {authLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {authMode === "login" ? "Acessar Meu Painel" : "Criar Meu Acesso SaaS"}
                </>
              )}
            </button>
          </form>

          {/* Credenciais Rápidas de Teste */}
          {authMode === "login" && (
            <div className="mt-6 border-t border-slate-800/60 pt-5 space-y-3">
              <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider text-center">Acesso Rápido ou de Demonstração</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthEmail("admin@vitrion.com.br");
                    setAuthPassword("admin123");
                  }}
                  className="p-2.5 bg-slate-950/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-950 rounded-lg text-left transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-white block">Preencher Padrão</span>
                  <span className="text-[8px] text-slate-500 font-mono block">admin@vitrion...</span>
                </button>
                <button
                  type="button"
                  onClick={handleAnonymousLogin}
                  className="p-2.5 bg-slate-950/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-950 rounded-lg text-left transition-all flex flex-col justify-center cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-amber-500 block">Modo Demonstração</span>
                  <span className="text-[8px] text-slate-400 font-mono block">Testar sem login</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-center border-t border-slate-800/40 pt-4">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              O Vitrion utiliza um ecossistema com autenticação integrada ao Firebase Firestore para controle total e segurança absoluta das suas TVs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-800 bg-slate-50">
      
      {/* 1. BARRA LATERAL ADMINISTRATIVA */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 text-slate-300">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <VitrionLogo className="w-10 h-10 shrink-0" />
            <div>
              <h1 className="text-white text-base font-bold tracking-tight">Vitrion</h1>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Digital Display v2.5</p>
            </div>
          </div>
        </div>

        {/* Links de Tabuladores */}
        <nav className="flex-1 p-3 space-y-1">
          <button 
            onClick={() => setActiveTab("screens")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "screens" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            id="tab-screens"
          >
            <Tv className="w-4 h-4" />
            Controlar TVs ({screens.length})
          </button>
          
          <button 
            onClick={() => setActiveTab("products")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "products" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            id="tab-products"
          >
            <DollarSign className="w-4 h-4" />
            Tabela de Preços
          </button>

           <button 
            onClick={() => setActiveTab("promotions")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "promotions" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            id="tab-promotions"
          >
            <Megaphone className="w-4 h-4 text-emerald-400" />
            Promoções Customizadas
          </button>

          <button 
            onClick={() => setActiveTab("gallery")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "gallery" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            id="tab-gallery"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            Banco de Imagens ({customImages.length})
          </button>

          <button 
            onClick={() => setActiveTab("assets")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "assets" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            id="tab-assets"
          >
            <Sparkles className="w-4 h-4" />
            Criador de Menus (IA)
          </button>

          <button 
            onClick={() => setActiveTab("how-to")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "how-to" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            id="tab-howto"
          >
            <BookOpen className="w-4 h-4" />
            Conectar no Fire TV
          </button>
          
          {isSuperAdmin && (
            <button 
              onClick={() => setActiveTab("clients")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "clients" ? "bg-amber-600 text-white" : "hover:bg-slate-800 text-amber-500/85 hover:text-amber-400"}`}
              id="tab-clients"
            >
              <Users className="w-4 h-4 text-amber-400" />
              SaaS: Clientes ({clients.length})
            </button>
          )}
        </nav>

        {/* Rodapé do Perfil Admin */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700 uppercase">
              {auth.currentUser?.isAnonymous ? "TS" : auth.currentUser?.email?.slice(0, 2) || "ADM"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-xs font-bold truncate">
                {loggedInClient ? loggedInClient.name : (isSuperAdmin ? "Super Admin" : "Loja de Teste")}
              </p>
              <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider truncate">
                {isSuperAdmin ? "Provedor Master" : (loggedInClient ? `Venc: ${new Date(loggedInClient.expirationDate).toLocaleDateString("pt-BR")}` : "Sem Assinatura")}
              </p>
            </div>
          </div>
          <button 
            onClick={handleInitializeDefaults}
            className="w-full mt-3 py-1.5 px-3 bg-slate-800 hover:bg-red-950 text-red-300 border border-red-900/30 rounded text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer"
          >
            Redefinir Dados Padrão (Demo)
          </button>
          
          <button 
            onClick={async () => {
              await signOut(auth);
              setUser(null);
              showToast("Desconectado com sucesso!", "success");
            }}
            className="w-full mt-2 py-1.5 px-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-900/30 rounded text-[10px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3 h-3 text-red-400/80" />
            Desconectar / Sair
          </button>
        </div>
      </aside>

      {/* 2. CONTEÚDO PRINCIPAL REVESTIDOR */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Cabeçalho */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-base text-slate-900 uppercase tracking-wide">
              {activeTab === "screens" && "Gerenciar TVs Digitais"}
              {activeTab === "products" && "Mapeamento de Preços & Produtos"}
              {activeTab === "promotions" && "Promoções Customizadas & Envio Manual"}
              {activeTab === "gallery" && "Banco de Imagens & Galeria Central"}
              {activeTab === "assets" && "Biblioteca de Imagens de Inteligência Artificial"}
              {activeTab === "how-to" && "Como Conectar o Amazon Fire TV"}
              {activeTab === "clients" && "👥 Controlar Contas & Vendas de Clientes"}
            </h2>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Sincronizador Ativo
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Filtrar Cliente:</span>
                <select 
                  value={selectedClientId} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="bg-white text-xs border border-amber-200 outline-none rounded p-1 font-semibold text-slate-700 font-sans"
                >
                  <option value="all">Ver Todos os Clientes</option>
                  <option value="demo_client">Conta de Demonstração (Demo)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.ownerEmail})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Input oculto para carregar Base64 de imagem */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                if (uploadScreenId) {
                  handleUploadImageFile(e, uploadScreenId);
                }
              }}
            />

            <div className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md font-mono">
              IP Servidor: <span className="font-bold text-slate-700">Conectado (Cloud)</span>
            </div>
          </div>
        </header>

        {/* Banner de Status de Assinatura do SaaS */}
        {subscriptionStatus.state !== "super_admin" && (
          <div className={`px-6 py-2 flex items-center justify-between text-xs font-semibold shrink-0 select-none border-b ${
            subscriptionStatus.isValid 
              ? (subscriptionStatus.state === "near_due" ? "bg-amber-100 text-amber-800 border-amber-200 animate-pulse" : "bg-blue-50 text-blue-700 border-blue-100") 
              : "bg-red-100 text-red-800 border-red-200"
          }`}>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                {subscriptionStatus.isValid 
                  ? (subscriptionStatus.state === "near_due" ? subscriptionStatus.reason : (subscriptionStatus.state === "demo" ? subscriptionStatus.reason : `Licença ativa para: ${loggedInClient?.name || "Sem Nome"} (Vencimento em: ${new Date(loggedInClient?.expirationDate).toLocaleDateString("pt-BR")})`))
                  : subscriptionStatus.reason
                }
              </span>
            </div>
            {subscriptionStatus.state === "demo" && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase">
                Período Livre para Testes
              </span>
            )}
            {!subscriptionStatus.isValid && (
              <span className="px-2.5 py-0.5 bg-red-600 text-white rounded text-[10px] uppercase font-bold animate-pulse">
                Sinal Físico Bloqueado
              </span>
            )}
          </div>
        )}

        {/* Zona de Rolagem de Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

          {/* TAB 1: GERENCIAR CONFIGURAÇÃO DE TELAS */}
          {activeTab === "screens" && (
            <div className="space-y-6">
              {/* Box Informativo de Configuração rápida com Fire TV */}
              <div className="bg-blue-600 text-white p-4 rounded-xl shadow-sm flex items-start gap-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Tv className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-1">Como Funciona a Transmissão nas TVs da Padaria?</h3>
                  <p className="text-xs text-blue-100 leading-relaxed max-w-3xl">
                    Cada TV conectada ao <strong>Amazon Fire TV</strong> deve apenas abrir o link reservado abaixo em seu navegador (como o Amazon Silk). As imagens dos menus que você cria com Inteligência Artificial e carrega aqui são atualizadas nas TVs e painéis <strong>automaticamente e em tempo real</strong> pelo banco do Vitrion Digital Display sem precisar encostar em botões de sincronização!
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab("how-to")}
                  className="px-4 py-2 bg-white text-blue-900 text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-slate-100 shrink-0 self-center"
                >
                  Passo a Passo
                </button>
              </div>

              {/* Grid Principal com as 7 Telas de Signage */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Painel de TVs Cadastradas ({screens.length})</h3>
                  <button 
                    onClick={handleAddNewScreen}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar TV
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {screens.map((sc, index) => {
                    const activeImage = sc.displayMode === "playlist" && sc.playlist && sc.playlist.find(item => item.enabled && item.image)
                      ? (sc.playlist.find(item => item.enabled && item.image)?.image || "")
                      : (sc.currentImage || "");

                    const presetImg = PRESET_TEMPLATES.find(t => t.id === activeImage);
                    const isCustomUploaded = activeImage.startsWith("data:");
                    const displayUrl = `${window.location.origin}${window.location.pathname}?screen=${sc.id}`;

                    return (
                      <div key={sc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between group relative hover:shadow-md transition-all">
                        {/* Imagem de Preview Mockup 16:9 */}
                        <div className="h-32 bg-slate-900 relative flex items-center justify-center overflow-hidden border-b border-slate-100">
                          {presetImg ? (
                            <div className="w-full h-full scale-[0.6] opacity-90 select-none pointer-events-none" dangerouslySetInnerHTML={{ __html: presetImg.svgMarkup }} />
                          ) : isCustomUploaded ? (
                            <img src={activeImage} alt="Preview custom" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-slate-600 text-[10px] font-mono select-none">Sem Mídia Sincronizada</div>
                          )}

                          {/* Status Badge */}
                          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded-full uppercase tracking-wider shadow">
                            Ativo/Online
                          </div>

                          {/* Número da TV identificador */}
                          <div className="absolute left-2.5 top-2.5 bg-slate-950/80 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-widest">
                            #0{index + 1}
                          </div>
                        </div>

                        {/* Corpo com Informações */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{sc.location || "Área Comercial"}</p>
                            <h4 className="text-xs font-bold text-slate-900 mb-1">{sc.name}</h4>
                            
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-500">Modo de Sinal:</span>
                                <span className={`font-bold uppercase text-[8px] px-1.5 py-0.5 rounded-md ${
                                  sc.displayMode === "playlist" 
                                    ? "bg-purple-100 text-purple-700" 
                                    : "bg-blue-100 text-blue-700"
                                }`}>
                                  {sc.displayMode === "playlist" 
                                    ? `Carrossel (${sc.playlist?.filter(p => p.enabled).length || 0} mídias)` 
                                    : "Imagem Única"}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500">Overlay Preços:</span>
                                <span className={`font-bold ${sc.overlayPrices ? "text-blue-600" : "text-amber-600"}`}>
                                  {sc.overlayPrices ? `Sim (${sc.selectedCategory || 'Todas'})` : 'Desativado'}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500">Mídia Ativa:</span>
                                <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                                  {presetImg ? presetImg.name : isCustomUploaded ? "Imagem/Promoção Customizada" : "Padrão"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Ações Específicas do Card */}
                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                            {/* Link de Exibição Pública para copiar ou enviar à Silk */}
                            <div className="flex gap-1">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(displayUrl);
                                  showToast("URL do display copiado com sucesso!", "success");
                                }}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold uppercase tracking-wider"
                                title="Copiar link exclusivo da TV"
                              >
                                <Copy className="w-3 h-3" /> Copiar Link
                              </button>
                              <a 
                                href={displayUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center"
                                title="Visualizar Live Signage em tela cheia"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Botões de Alteração Rápida */}
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => {
                                  setEditingScreen(sc);
                                }}
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] rounded uppercase tracking-wider"
                              >
                                Configurar Menu
                              </button>
                              <button 
                                onClick={() => triggerFileUpload(sc.id)}
                                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-[9px] rounded uppercase tracking-wider flex items-center gap-1"
                                title="Enviar imagem manual, banner do Canva ou promoção customizada para esta TV"
                              >
                                <Upload className="w-3 h-3" /> Subir Imagem / Promoção
                              </button>
                            </div>

                            {/* Alerta de sincronização */}
                            <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono mt-1">
                              <span>Sincronia: {sc.lastSync}</span>
                              <button 
                                className="text-red-500 hover:underline"
                                onClick={() => setIsDeletingScreen(sc.id)}
                              >
                                Desativar TV
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CADASTRO E AJUSTE DE PREÇOS (CONEXÃO DIRETA DO CATALOGO) */}
          {activeTab === "products" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Lado Esquerdo: Formulário de Adicionar / Editar */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 self-start">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-slate-700">
                    {editingProduct ? <Sliders className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </div>
                  <h3 className="font-bold text-xs uppercase text-slate-600 tracking-wider">
                    {editingProduct ? "Editar Produto Cadastrado" : "Cadastrar Novo Produto"}
                  </h3>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Nome do Produto</label>
                    <input 
                      type="text" 
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="Ex: Pão de Sal Quentinho"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Preço Consumidor</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-medium">R$</span>
                        <input 
                          type="text" 
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(e.target.value)}
                          placeholder="0,00"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Setor / Categoria</label>
                      <select 
                        value={newProdCategory}
                        onChange={(e) => setNewProdCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                      >
                        <option value="Padaria">🥖 Padaria</option>
                        <option value="Doce">🍰 Doce</option>
                        <option value="Café">☕ Café</option>
                        <option value="Lanches">🍔 Lanches</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-sm"
                    >
                      {editingProduct ? "Salvar Alterações" : "Cadastrar no Cardápio"}
                    </button>
                    {editingProduct && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setNewProdName("");
                          setNewProdPrice("");
                        }}
                        className="w-full mt-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
                      >
                        Cancelar Edição
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-6 p-3.5 bg-orange-50 border border-orange-100 rounded-lg text-orange-900 text-xs">
                  <div className="flex gap-2 font-bold mb-1 items-center">
                    <Info className="w-4 h-4 text-orange-700" />
                    <span>Dica de Sincronia</span>
                  </div>
                  <p className="leading-relaxed opacity-90 text-[11px]">
                    Sempre que você cadastrar ou atualizar o valor de um item aqui, as TVs que possuem a opção <strong>"Overlay de Preços"</strong> ativada atualizarão os preços exibidos nas telas na mesma fração de segundo!
                  </p>
                </div>
              </div>

              {/* Lado Direito: Listagem Detalhada e Ajustes */}
              <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">Catálogo de Itens Cadastrados ({products.length})</h3>
                
                {products.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Utensils className="w-12 h-12 opacity-35 mb-2" />
                    <p className="font-medium text-xs uppercase">Nenhum produto cadastrado no Vitrion Digital Display</p>
                    <button 
                      onClick={handleInitializeDefaults}
                      className="mt-3 px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg"
                    >
                      Carregar Padrões
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          <th className="py-2.5 pb-4">Nome</th>
                          <th className="py-2.5 pb-4">Setor</th>
                          <th className="py-2.5 pb-4 text-right">Valor Consumidor</th>
                          <th className="py-2.5 pb-4 text-center">Status</th>
                          <th className="py-2.5 pb-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {products.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-3 font-semibold text-slate-900">{p.name}</td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-slate-800">
                              R$ {p.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-center">
                              <button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, "products", p.id), { available: !p.available });
                                  } catch (err: unknown) {
                                    handleFirestoreError(err, OperationType.WRITE, `products/${p.id}/toggle`);
                                  }
                                }}
                                className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full tracking-wider ${p.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                              >
                                {p.available ? "Disponível" : "Indisponível"}
                              </button>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setNewProdName(p.name);
                                    setNewProdPrice(p.price.toString().replace(".", ","));
                                    setNewProdCategory(p.category);
                                  }}
                                  className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[10px] font-bold uppercase"
                                >
                                  Editar
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: GERADOR DE PROMPTS PARA CRIAR IMAGENS DE MENU VIA IA */}
          {activeTab === "assets" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Lado Esquerdo: Formululador Assistente */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="font-bold text-xs uppercase text-slate-600 tracking-wider">Assistente de Prompts de IA</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Crie menus espetaculares para carregar no Fire TV</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Você pode criar quadros rústicos, tabelas de preço de confeitaria moderna ou lousas negras elegantes usando geradores de imagem de inteligência artificial (como DALL-E, Midjourney, Stable Diffusion ou Bing Image Creator) para destacar as delícias da sua padaria! Escolha o setor e estilo para criar um prompt matador:
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Setor do Alimento</label>
                        <select 
                          value={promptCategory}
                          onChange={(e) => setPromptCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                        >
                          <option value="Padaria">🥖 Forno de Pães</option>
                          <option value="Doce">🍰 Vitrine Doces</option>
                          <option value="Café">☕ Bebidas e Café</option>
                          <option value="Lanches">🍔 Sanduicheria / Brunch</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Aparência do Design</label>
                        <select 
                          value={promptStyle}
                          onChange={(e) => setPromptStyle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                        >
                          <option value="Chalkboard Rústica">🪵 Chalkboard Rústica</option>
                          <option value="Confeitaria Delicada">🌸 Confeitaria Delicada</option>
                          <option value="Cafeteria Moderna">🔲 Cafeteria Moderna</option>
                          <option value="Brunch Ilustrado">🥪 Brunch Ilustrado</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs relative select-all border border-slate-800">
                      <p className="leading-relaxed ">{promptOutput}</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(promptOutput);
                          alert("Prompt copiado! Cole esse prompt na sua ferramenta de preferência (Midjourney / DALL-E) para gerar o menu ideal.");
                        }}
                        className="absolute right-2.5 bottom-2.5 px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
                      >
                        <Copy className="w-3 h-3" /> Copiar Prompt
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Info className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    <strong>Como subir a imagem gerada?</strong> Assim que o seu gerador de IA concluir a imagem, salve-a no computador/celular. Depois, acerte a aba <strong>"Controlar TVs"</strong>, clique em <strong>"Subir IA Image"</strong> na TV desejada e sincronize o arquivo!
                  </p>
                </div>
              </div>

              {/* Lado Direito: Templates Modelos Prontos out-of-the-box */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-3">Modelos Gráficos Prontos Incorporados</h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Não quer esperar a IA gerar fotos? Você pode aplicar instantaneamente nossos designs vetoriais criados sob medida para quadros de padarias e cafeterias. Escolha qualquer TV e alterne seu visual clicando em "Configurar Menu".
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {PRESET_TEMPLATES.map((tpl) => (
                    <div key={tpl.id} className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50 relative group shadow-sm hover:shadow transition-all">
                      <div className="h-28 bg-slate-900 flex items-center justify-center relative p-1 overflow-hidden">
                        <div className="w-full h-full scale-[0.55] select-none pointer-events-none" dangerouslySetInnerHTML={{ __html: tpl.svgMarkup }} />
                      </div>
                      <div className="p-3 bg-white">
                        <span className="text-[8px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">{tpl.category}</span>
                        <h4 className="font-bold text-[11px] text-slate-800 mt-1 truncate">{tpl.name}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB: PROMOÇÕES CUSTOMIZADAS E ENVIOS MANUAIS */}
          {activeTab === "promotions" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Esquerda: Painel de Envio de Mídia (7 colunas no desktop) */}
              <div className="xl:col-span-7 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                    <Upload className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Sintonizar Nova Promoção / Imagem Manual</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Suba qualquer cartaz, papel de parede ou arte do Canva</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Área de Seleção de Arquivo */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-2">1. Selecione ou Arraste o arquivo de imagem (16:9 ideal)</label>
                      <div 
                        onClick={() => document.getElementById("promo-upload-input")?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-50/55 cursor-pointer transition-all group"
                      >
                        <input 
                          type="file" 
                          id="promo-upload-input" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handlePromoFileSelect} 
                        />
                        {promoFileBase64 ? (
                          <div className="w-full relative">
                            <img src={promoFileBase64} alt="Preview da Promoção" className="h-40 w-full object-contain rounded bg-slate-900 border border-slate-200" />
                            <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
                              {promoFileName || "Imagem Carregada"}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center group overflow-hidden">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110">
                              <Upload className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-xs text-slate-700 tracking-wide">Clique para selecionar imagem</h4>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-xs uppercase tracking-wider text-center leading-relaxed">Suporta JPG, PNG ou GIF. Redimensionada automaticamente para excelente resolução sem sobrecarregar a TV.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selecionar TVs de Destino */}
                    <div>
                      <div className="flex justify-between items-center mb-2.5">
                        <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">2. Selecione as TVs de Destino da Promoção</label>
                        <div className="flex gap-2 text-[10px] font-bold">
                          <button 
                            type="button" 
                            onClick={() => setSelectedPromoScreens(screens.map(s => s.id))}
                            className="text-blue-600 hover:underline uppercase tracking-wider"
                          >
                            Marcar Todas
                          </button>
                          <span className="text-slate-300">|</span>
                          <button 
                            type="button" 
                            onClick={() => setSelectedPromoScreens([])}
                            className="text-slate-500 hover:underline uppercase tracking-wider"
                          >
                            Desmarcar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[190px] overflow-y-auto pr-1">
                        {screens.map((sc, index) => {
                          const isChecked = selectedPromoScreens.includes(sc.id);
                          return (
                            <label 
                              key={sc.id} 
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all ${isChecked ? "bg-emerald-500/10 border-emerald-500/30 text-slate-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                            >
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedPromoScreens(selectedPromoScreens.filter(id => id !== sc.id));
                                  } else {
                                    setSelectedPromoScreens([...selectedPromoScreens, sc.id]);
                                  }
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 border-slate-300"
                              />
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-[11px] uppercase tracking-wide truncate">#0{index + 1} {sc.name}</h5>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest truncate">{sc.location || "Área Principal"}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botão de Disparo */}
                    <div className="pt-3 border-t border-slate-100 flex justify-end gap-3.5">
                      {promoFileBase64 && (
                        <button 
                          onClick={() => {
                            setPromoFileBase64(null);
                            setPromoFileName("");
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wider transition-all"
                        >
                          Limpar Imagem
                        </button>
                      )}
                      
                      <button 
                        onClick={handlePublishPromotion}
                        disabled={!promoFileBase64 || selectedPromoScreens.length === 0}
                        className={`px-5 py-2.5 font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all ${(!promoFileBase64 || selectedPromoScreens.length === 0) ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                      >
                        <Megaphone className="w-4 h-4" /> Publicar Promoção Agora
                      </button>
                    </div>

                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold mb-1">Dica de Gestor de Sucesso</h5>
                    <p>
                      Mídias criadas com ferramentas externas (como o <strong>Canva</strong>) têm uma taxa de visualização fantástica! Ao preparar banners para a TV da sua padaria ou confeitaria, prefira salvar na resolução ideal de <strong>1920x1080 (Proporção 16:9 de TVs)</strong> para preencher toda a tela e garantir legibilidade máxima.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direita: Promoções Oficiais Prontas e Campanhas Rápidas */}
              <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Campanhas e Templates de Envio Rápido</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Selecione e transmita cartazes profissionais instantâneos</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Precisa colocar uma informação com velocidade na TV? Selecione um dos modelos desenhados sob medida abaixo para transmitir com facilidade nas TVs que você marcou:
                  </p>

                  <div className="space-y-4">
                    {PROMPT_PROMO_PRESETS.map((pPreset) => (
                      <div 
                        key={pPreset.id} 
                        className="group border border-slate-200 hover:border-blue-300 rounded-xl overflow-hidden bg-slate-50 flex items-center hover:shadow transition-all p-3 gap-4"
                      >
                        <div className="w-20 h-14 bg-slate-900 shrink-0 rounded overflow-hidden flex items-center justify-center p-0.5 shadow-sm border border-slate-200">
                          {pPreset.previewSvg ? (
                            <div className="w-full h-full scale-[0.6] opacity-90 select-none pointer-events-none" dangerouslySetInnerHTML={{ __html: pPreset.previewSvg }} />
                          ) : (
                            <div className="text-[8px] text-slate-600 font-mono">Template</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{pPreset.category}</span>
                          <h4 className="font-bold text-[11px] text-slate-800 mt-1 truncate">{pPreset.title}</h4>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest leading-none mt-0.5">{pPreset.subtitle}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            setPromoFileBase64(pPreset.dataUrl);
                            setPromoFileName(pPreset.title);
                            showToast(`Template "${pPreset.title}" carregado para sintonização rápida!`, "success");
                          }}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] rounded uppercase tracking-wider shrink-0 transition-all shadow-sm"
                        >
                          Usar Arte
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 leading-relaxed text-center font-mono">
                    Sincronologia Vitrion Digital Display™ • Atendimento Instantâneo
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB: BANCO DE IMAGENS E GALERIA EM NUVEM */}
          {activeTab === "gallery" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
              
              {/* Esquerda: Enviar para o Banco de Dados */}
              <div className="xl:col-span-4 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                    <Plus className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Novo Registro no Banco</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Cadastrar nova mídia em nuvem no sistema</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Input de Nome */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1.5">Nome da Imagem / Campanha</label>
                      <input 
                        type="text"
                        value={galleryFileName}
                        onChange={(e) => setGalleryFileName(e.target.value)}
                        placeholder="Ex: Cartaz de Promoção de Doces"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Upload de arquivo */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1.5">Selecione o Arquivo</label>
                      <div 
                        onClick={() => document.getElementById("gallery-upload-input")?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-50/50 cursor-pointer transition-all group"
                      >
                        <input 
                          type="file" 
                          id="gallery-upload-input" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleGalleryFileSelect} 
                        />
                        {galleryFileBase64 ? (
                          <div className="w-full relative">
                            <img src={galleryFileBase64} alt="Preview da Imagem" className="h-32 w-full object-contain rounded bg-slate-950 border border-slate-200" />
                            <div className="absolute top-2 right-2 bg-slate-950/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]">
                              Pronto para o Banco
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                              <Upload className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-[11px] text-slate-700">Selecione Imagem</h4>
                            <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">JPG, PNG ou GIF (Máx 12MB)</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botão de Gravar */}
                    <button
                      onClick={handleSaveToGallery}
                      disabled={!galleryFileBase64 || uploadingToGallery}
                      className={`w-full py-2.5 font-bold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${(!galleryFileBase64 || uploadingToGallery) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow"}`}
                    >
                      {uploadingToGallery ? "Salvando..." : <><Plus className="w-4 h-4" /> Cadastrar no Banco de Dados</>}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-300 rounded-xl border border-slate-800 shadow-sm p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-white">Como Funciona o Banco</h4>
                  </div>
                  <ul className="text-[11px] space-y-2 text-slate-400 list-disc list-inside leading-relaxed">
                    <li>As imagens cadastradas ficam salvas na nuvem com <strong>alta segurança</strong>.</li>
                    <li>O banco permite transmissão instantânea em 1-clique para qualquer SmartTV.</li>
                    <li>Não há limite de mídias cadastradas, permitindo preparar campanhas rotativas com antecedência.</li>
                  </ul>
                </div>
              </div>

              {/* Direita: Galeria de Imagens Sincronizada (8 colunas) */}
              <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Imagens Armazenadas no Banco ({customImages.length})</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Sua central organizada de mídias, banners e anúncios permanentes</p>
                  </div>
                </div>

                {customImages.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="font-bold text-sm text-slate-700">Seu Banco de Dados está Vazio</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Cadastre suas fotos de produtos, anúncios do Canva ou banners de promoções ao lado para começar a controlar as SmartTVs.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {customImages.map((img) => (
                      <div key={img.id} className="group border border-slate-100 hover:border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow transition-all bg-white flex flex-col justify-between">
                        {/* Imagem de Capa */}
                        <div className="relative aspect-video bg-slate-950 overflow-hidden group-hover:scale-[1.01] transition-transform">
                          <img 
                            src={img.base64} 
                            alt={img.name} 
                            className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" 
                          />
                          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[8px] font-mono px-2 py-0.5 rounded uppercase">
                            {new Date(img.createdAt).toLocaleDateString("pt-BR")}
                          </div>
                        </div>

                        {/* Detalhes e Ações */}
                        <div className="p-3.5 space-y-3">
                          <div className="min-h-[38px]">
                            <h4 className="font-bold text-xs text-slate-800 truncate" title={img.name}>{img.name}</h4>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5 font-semibold">Tamanho: Sincronizado</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            <button 
                              onClick={() => {
                                setTargetBroadcastingImage(img);
                                setBroadcastingScreens(screens.map(s => s.id)); // Default: Transmitir para todas
                              }}
                              className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] rounded uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5"
                              title="Transmitir para as TVs desejadas"
                            >
                              <Megaphone className="w-3 h-3" /> Transmitir
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja apagar permanentemente a imagem "${img.name}" do banco de dados?`)) {
                                  handleDeleteFromGallery(img.id, img.name);
                                }
                              }}
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[9px] rounded uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                              title="Remover do Banco de Dados"
                            >
                              <Trash2 className="w-3 h-3" /> Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: PASSO A PASSO COMO CONECTAR NO AMAZON FIRE TV */}
          {activeTab === "how-to" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 max-w-4xl mx-auto space-y-6">
              
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <Tv className="w-6 h-6 text-blue-600 animate-pulse" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 tracking-tight">Como Sintonizar as TVs no Amazon Fire TV</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Guia de Implantação Física do Vitrion Digital Display</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center pt-2">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-mono flex items-center justify-center font-bold text-sm mb-3">1</div>
                  <h4 className="font-bold text-xs uppercase mb-1">Abrir o Silk Browser</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">No menu de aplicativos do seu Amazon Fire TV, localize e abra o navegador oficial <strong>Amazon Silk</strong>.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-mono flex items-center justify-center font-bold text-sm mb-3">2</div>
                  <h4 className="font-bold text-xs uppercase mb-1">Digitar o Link Exclusivo</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Cada TV tem seu link próprio (Ex: <code>?screen=tela-1</code>). Digite o link da TV correspondente que você gerou no painel.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-mono flex items-center justify-center font-bold text-sm mb-3">3</div>
                  <h4 className="font-bold text-xs uppercase mb-1">Ativar Tela Cheia</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Pressione para cima no controle do Fire TV ao carregar a página e clique no ícone "Full Screen" do monitor. Pronto!</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-950 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Sliders className="w-4 h-4 text-amber-700" />
                  <span>Sincronia Sem Re-fidelidade de IP</span>
                </div>
                <p>
                  O Vitrion Digital Display diferencia-se dos softwares legados porque não precisa de cabos de rede ou que as TVs estejam conectadas no mesmo IP Wifi! Desde que o Amazon Fire TV tenha acesso à internet, você pode fazer as alterações nos preços do cardápio ou subir novas mídias de IA diretamente da sua casa, e as TVs na Padaria atualizarão o catálogo sozinhas via nuvem!
                </p>
              </div>

              {/* Endereço de Exibição das TVs de Teste */}
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-3">Links Prontos para Testar as TVs da Padaria:</h4>
                <div className="space-y-2 font-mono text-xs">
                  {screens.map((sc, index) => {
                    const displayUrl = `${window.location.origin}${window.location.pathname}?screen=${sc.id}`;
                    return (
                      <div key={sc.id} className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 hover:border-blue-500 transition-all">
                        <div className="truncate max-w-sm md:max-w-md">
                          <span className="font-bold text-blue-600">TV 0{index + 1}:</span> {sc.name}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(displayUrl);
                              showToast("URL exclusivo da TV copiado para a área de transferência!", "success");
                            }}
                            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold px-2 py-1 text-[10px] rounded uppercase select-none flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copiar Link
                          </button>
                          <a 
                            href={displayUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-slate-900 text-white hover:bg-slate-800 font-bold px-2.5 py-1 text-[10px] rounded uppercase flex items-center gap-1"
                          >
                            Abrir <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: GESTÃO MULTI-CLIENTE E ASSINATURAS SAAS */}
          {activeTab === "clients" && isSuperAdmin && (
            <div className="space-y-6">
              
              {/* Painel de Indicadores de Vendas e Negócio */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total de Clientes</p>
                    <p className="text-xl font-bold text-slate-800">{clients.length}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Mensalidade Recorrente (MRR)</p>
                    <p className="text-xl font-bold text-slate-800">
                      R$ {clients.reduce((acc, c) => acc + (c.monthlyFee || 0), 0).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Mensalidades Expiradas</p>
                    <p className="text-xl font-bold text-slate-800">
                      {clients.filter(c => {
                        const exp = new Date(c.expirationDate);
                        exp.setHours(23,59,59,999);
                        return new Date() > exp;
                      }).length}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="p-3 bg-rose-100 text-rose-700 rounded-lg">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Contas Suspensas</p>
                    <p className="text-xl font-bold text-slate-800">
                      {clients.filter(c => c.status === "suspended").length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Corpo Principal da Gestão de Clientes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Lado Esquerdo: Lista de Clientes Ativos/Inativos */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <h3 className="font-bold text-xs uppercase text-slate-700">Portfólio de Assinantes</h3>
                    
                    {/* Barra de Busca de Clientes */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Buscar por Loja ou Email..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
                      />
                    </div>
                  </div>

                  {/* Tabela de Clientes */}
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <th className="p-3.5">Nome do Cliente / Loja</th>
                          <th className="p-3.5">Email de Acesso</th>
                          <th className="p-3.5 text-center">Mensalidade</th>
                          <th className="p-3.5 text-center">Vencimento</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {clients
                          .filter(c => 
                            c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
                            c.ownerEmail.toLowerCase().includes(clientSearchTerm.toLowerCase())
                          )
                          .map((client) => {
                            const expDate = new Date(client.expirationDate);
                            expDate.setHours(23,59,59,999);
                            const isExpired = new Date() > expDate;
                            const isSuspended = client.status === "suspended";
                            return (
                              <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3.5">
                                  <div className="font-bold text-slate-800">{client.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{client.phone || "Sem Telefone"}</div>
                                </td>
                                <td className="p-3.5 text-slate-600 font-mono text-[11px]">{client.ownerEmail}</td>
                                <td className="p-3.5 text-center font-bold text-slate-700">R$ {client.monthlyFee?.toFixed(2).replace(".", ",")}</td>
                                <td className="p-3.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isExpired 
                                      ? "bg-red-100 text-red-800" 
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {new Date(client.expirationDate).toLocaleDateString("pt-BR")}
                                  </span>
                                </td>
                                <td className="p-3.5 text-center">
                                  <button
                                    onClick={() => toggleClientStatus(client)}
                                    title="Clique para Ativar ou Suspender"
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase transition-all ${
                                      isSuspended
                                        ? "bg-red-100 text-red-800 hover:bg-red-200"
                                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    }`}
                                  >
                                    {isSuspended ? "● Suspenso" : "● Ativo"}
                                  </button>
                                </td>
                                <td className="p-3.5 text-right whitespace-nowrap">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingClient(client);
                                        setNewClientName(client.name);
                                        setNewClientEmail(client.ownerEmail);
                                        setNewClientPhone(client.phone || "");
                                        setNewClientFee(String(client.monthlyFee || "99.90"));
                                        setNewClientExpiration(client.expirationDate);
                                      }}
                                      className="p-1 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded transition-all"
                                      title="Editar Informações"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClient(client.id, client.name)}
                                      className="p-1 px-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent rounded transition-all"
                                      title="Excluir do Sistema"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        {clients.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center p-8 text-slate-400">
                              Nenhum cliente cadastrado ainda. Use o formulário lateral para cadastrar sua primeira venda!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Lado Direito: Formulário de Adicionar / Editar */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700">
                      {editingClient ? "📝 Atualizar Registro" : "➕ Novo Cliente SaaS"}
                    </h3>
                    <p className="text-[10px] text-slate-400">Configure as credenciais e data de cobrança mensal.</p>
                  </div>

                  <form onSubmit={handleSaveClient} className="space-y-3 text-xs font-semibold">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Nome Fantasia (Loja / Estabelecimento)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Padaria Bella Vista"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 font-sans"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Email Principal do Cliente</label>
                      <input 
                        type="email" 
                        required
                        placeholder="Ex: contato@bellavista.com.br"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 font-mono"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-sans">Este email vincula a TV do cliente à sua conta para garantir segurança.</p>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Telefone / WhatsApp</label>
                      <input 
                        type="text" 
                        placeholder="Ex: (11) 99888-7766"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 font-mono font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-sans">
                      <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Mensalidade (R$)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          placeholder="99.90"
                          value={newClientFee}
                          onChange={(e) => setNewClientFee(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Próximo Vencimento</label>
                        <input 
                          type="date" 
                          required
                          value={newClientExpiration}
                          onChange={(e) => setNewClientExpiration(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 font-sans">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs uppercase tracking-wider rounded-lg shadow transition-all"
                      >
                        {editingClient ? "Confirmar Edição" : "Registrar Cliente"}
                      </button>
                      {editingClient && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClient(null);
                            setNewClientName("");
                            setNewClientEmail("");
                            setNewClientPhone("");
                            setNewClientFee("99.90");
                            setNewClientExpiration("");
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 text-xs uppercase border border-slate-300 rounded-lg transition-all"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Rodapé status de Armazenamento fictício e copyright de engine */}
        <footer className="h-10 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex gap-6">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 
              Nuvem Firestore ID: <span className="font-mono text-slate-700 font-bold">strategic-garden-rrwfn</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 
              Sincronizador Múltiplo: <span className="font-bold text-slate-700">7 Telas de Signage Conectadas</span>
            </span>
          </div>
          <div>Vitrion Digital Display Controller • © 2026</div>
        </footer>

      </main>

      {/* ==============================================
          MODAL ESTILIZADO 1: CONFIGURAR TELA E ANEXOS
          ============================================== */}
      {editingScreen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-w-lg w-full">
            <div className="bg-slate-900 p-4 font-bold text-white flex justify-between items-center text-sm uppercase tracking-wider">
              <span>{editingScreen.name}</span>
              <button onClick={() => setEditingScreen(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Identificação da TV</label>
                <input 
                  type="text"
                  value={editingScreen.name}
                  onChange={(e) => setEditingScreen({ ...editingScreen, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Localização Física na Padaria</label>
                <input 
                  type="text"
                  value={editingScreen.location}
                  onChange={(e) => setEditingScreen({ ...editingScreen, location: e.target.value })}
                  placeholder="Ex: Balcão Principal, Geladeira"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              {/* Escolha do Modo de Exibição */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1.5">Modo de Exibição do Painel</label>
                <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingScreen({ ...editingScreen, displayMode: "single" })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      (editingScreen.displayMode || "single") === "single"
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    📺 Imagem Única
                  </button>
                  <button
                    type="button"
                    id="btn-mode-playlist"
                    onClick={() => {
                      const currentPlaylist = editingScreen.playlist && editingScreen.playlist.length > 0
                        ? editingScreen.playlist
                        : [
                            { id: "slot-1", image: "chalk-bakery", duration: 10, enabled: true },
                            { id: "slot-2", image: "cozy-coffee", duration: 10, enabled: false },
                            { id: "slot-3", image: "", duration: 10, enabled: false },
                            { id: "slot-4", image: "", duration: 10, enabled: false }
                          ];
                      setEditingScreen({ 
                        ...editingScreen, 
                        displayMode: "playlist",
                        playlist: currentPlaylist 
                      });
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      editingScreen.displayMode === "playlist"
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    🔄 Rotação (Carrossel)
                  </button>
                </div>
              </div>

              {/* RENDER MODO SINGLE */}
              {(editingScreen.displayMode || "single") === "single" ? (
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Escolher Template Gráfico Padrão</label>
                  <select 
                    value={editingScreen.currentImage.startsWith("data:") ? "custom" : editingScreen.currentImage}
                    onChange={(e) => {
                      const selVal = e.target.value;
                      if (selVal !== "custom") {
                        setEditingScreen({ ...editingScreen, currentImage: selVal });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 font-semibold"
                  >
                    <option value="chalk-bakery">🥖 Quadro Negro - Pães Artesanais (Rústico)</option>
                    <option value="pastel-sweet">🍰 Doce Charme - Confeitaria (Blush)</option>
                    <option value="cozy-coffee">☕ Cafeteria Premium - Bebidas (Stone Dark)</option>
                    <option value="modern-brunch">🥪 Brunch Moderno - Sanduíches (Teal Minimal)</option>
                    <option value="custom" disabled>🖼️ Imagem de IA Carregada pelo Usuário</option>
                  </select>
                </div>
              ) : (
                /* RENDER MODO PLAYLIST (ROTATION CAROUSEL) */
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[350px] overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Carrossel de Imagens</h4>
                    <span className="text-[9px] font-bold text-blue-600 px-2 py-0.5 bg-blue-100 rounded-full">Até 4 Mídias</span>
                  </div>
                  
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const playlist = editingScreen.playlist || [];
                    const slotItem = playlist[idx] || { id: `slot-${idx + 1}`, image: "", duration: 10, enabled: false };
                    const isCustomUploaded = slotItem.image.startsWith("data:");

                    const handleUpdateSlot = (updates: Partial<PlaylistItem>) => {
                      const list = [...playlist];
                      while (list.length <= idx) {
                        list.push({ id: `slot-${list.length + 1}`, image: "", duration: 10, enabled: false });
                      }
                      list[idx] = { ...list[idx], ...updates };
                      setEditingScreen({ ...editingScreen, playlist: list });
                    };

                    return (
                      <div key={idx} className="flex flex-col gap-2 p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm" id={`playlist-slot-${idx}`}>
                        <div className="flex items-center justify-between gap-2">
                          {/* Toggle Switch de Canal Ligado */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input 
                              type="checkbox"
                              checked={slotItem.enabled}
                              onChange={(e) => handleUpdateSlot({ enabled: e.target.checked })}
                              className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                              id={`slot-check-${idx}`}
                            />
                            <label htmlFor={`slot-check-${idx}`} className="text-[10px] uppercase font-bold text-slate-700 cursor-pointer select-none">
                              Slot 0{idx + 1}
                            </label>
                          </div>

                          {/* Seletor de Imagem (Preset ou Galeria de IA) */}
                          <div className="flex-1 min-w-0">
                            <select 
                              disabled={!slotItem.enabled}
                              value={isCustomUploaded ? "custom-upload" : slotItem.image}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val !== "custom-upload") {
                                  handleUpdateSlot({ image: val });
                                }
                              }}
                              className={`w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] outline-none font-semibold ${
                                !slotItem.enabled ? "opacity-40" : ""
                              }`}
                            >
                              <option value="">🚫 Vazio / Sem Imagem</option>
                              <optgroup label="Modelos Oficiais do Menu">
                                <option value="chalk-bakery">🥖 Quadro Negro (Rústico)</option>
                                <option value="pastel-sweet">🍰 Doce Charme (Blush)</option>
                                <option value="cozy-coffee">☕ Cafeteria Premium (Stone Dark)</option>
                                <option value="modern-brunch">🥪 Brunch Moderno (Teal)</option>
                                <option value="promo-combo">🍔 Combo - Café com Pão de Queijo</option>
                                <option value="promo-pix">💳 PIX - Chave e QR Code</option>
                              </optgroup>
                              {customImages.length > 0 && (
                                <optgroup label="Sua Galeria Central de IA">
                                  {customImages.map((img) => (
                                    <option key={img.id} value={img.base64}>
                                      🖼️ IA: {img.name}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {isCustomUploaded && (
                                <option value="custom-upload">📸 Imagem Carregada Manualmente</option>
                              )}
                            </select>
                          </div>

                          {/* Upload manual individual */}
                          <div className="shrink-0 flex items-center">
                            <input 
                              type="file" 
                              accept="image/*"
                              disabled={!slotItem.enabled}
                              onChange={(e) => handlePlaylistSlotFileSelect(e, idx)}
                              className="hidden" 
                              id={`playlist-image-uploader-${idx}`}
                            />
                            <label 
                              htmlFor={`playlist-image-uploader-${idx}`}
                              className={`p-1 px-1.5 border border-slate-200 rounded cursor-pointer bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 ${
                                !slotItem.enabled ? "opacity-30 pointer-events-none" : ""
                              }`}
                              title="Subir foto específica do computador para este slot"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </label>
                          </div>
                        </div>

                        {/* Tempo manual configurado de exibição */}
                        {slotItem.enabled && (
                          <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-slate-100">
                            <span className="text-[9px] uppercase font-bold text-slate-400 shrink-0">Tempo</span>
                            <input 
                              type="range"
                              min="3"
                              max="120"
                              value={slotItem.duration || 10}
                              onChange={(e) => handleUpdateSlot({ duration: parseInt(e.target.value) })}
                              className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <input 
                              type="number"
                              min="3"
                              max="120"
                              value={slotItem.duration || 10}
                              onChange={(e) => handleUpdateSlot({ duration: parseInt(e.target.value) || 10 })}
                              className="w-12 bg-slate-100 text-slate-700 text-center font-bold font-mono py-0.5 rounded text-[10px] border border-slate-200 outline-none"
                            />
                            <span className="text-[9px] text-slate-500 shrink-0 select-none">seg.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Seletores de Overlay de Preços */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Overlay Dinâmico de Preços</h4>
                    <p className="text-[10px] text-slate-500 leading-none">Exibir lista de itens cadastrados por cima do menu ?</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={editingScreen.overlayPrices}
                    onChange={(e) => setEditingScreen({ ...editingScreen, overlayPrices: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                {editingScreen.overlayPrices && (
                  <div className="pt-2 border-t border-slate-200/50">
                    <label className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Filtrar Setor do Cardápio para esta Tela</label>
                    <select 
                      value={editingScreen.selectedCategory}
                      onChange={(e) => setEditingScreen({ ...editingScreen, selectedCategory: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none"
                    >
                      <option value="Todas">📋 Exibir Todos de Qualquer Setor</option>
                      <option value="Padaria">🥖 Somente Itens de Padaria</option>
                      <option value="Doce">🍰 Somente Itens de Doces</option>
                      <option value="Café">☕ Somente Itens de Cafeteria</option>
                      <option value="Lanches">🍔 Somente Itens de Brunch/Refeições</option>
                    </select>
                  </div>
                )}
              </div>

            </div>

            <div className="bg-slate-50 p-4 flex gap-2 justify-end border-t border-slate-100">
              <button 
                onClick={() => setEditingScreen(null)} 
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleUpdateScreenConfig(editingScreen)} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg uppercase tracking-wider"
              >
                Sincronizar TV Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DELEÇÃO DE TV */}
      {isDeletingScreen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full">
            <h4 className="text-sm font-bold text-slate-900 uppercase">Confirmar Desconexão</h4>
            <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed">Você está prestes a remover o registro de sinalização desta TV. A TV com este ID exibirá uma tela de alerta e parará de sincronizar.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsDeletingScreen(null)} className="px-3.5 py-1.5 bg-slate-100 font-bold text-xs text-slate-700 rounded-lg">Cancelar</button>
              <button onClick={handleDeleteScreen} className="px-3.5 py-1.5 bg-red-600 font-bold text-xs text-white rounded-lg">Confirmar Remoção</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TRANSMITIR IMAGEM DO BANCO DE DADOS EM SELEÇÃO ADAPTÁVEL */}
      {targetBroadcastingImage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-w-md w-full">
            <div className="bg-slate-900 p-4 font-bold text-white flex justify-between items-center text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-400" />
                <span>Transmitir: {targetBroadcastingImage.name}</span>
              </div>
              <button onClick={() => setTargetBroadcastingImage(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                <img src={targetBroadcastingImage.base64} alt="Preview" className="w-full h-full object-contain" />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-2">Selecione quais TVs devem Exibir esta Mídia</label>
                <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                  {screens.map((screen) => {
                    const isChecked = broadcastingScreens.includes(screen.id);
                    return (
                      <label 
                        key={screen.id} 
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${isChecked ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 hover:bg-slate-100 border-slate-200/60"}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setBroadcastingScreens(broadcastingScreens.filter(id => id !== screen.id));
                              } else {
                                setBroadcastingScreens([...broadcastingScreens, screen.id]);
                              }
                            }}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">{screen.name}</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">{screen.location}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded uppercase">
                          {screen.id}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex gap-2 justify-end border-t border-slate-100">
              <button 
                onClick={() => setTargetBroadcastingImage(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                onClick={handleBroadcastGalleryImage}
                disabled={broadcastingScreens.length === 0}
                className={`px-4 py-2 font-bold text-xs rounded-lg uppercase tracking-wider transition-all ${broadcastingScreens.length === 0 ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"}`}
              >
                Transmitir Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE NOTIFICAÇÕES FLUTUANTE EXCLUSIVO */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-white flex items-start gap-3 animate-fade-in animate-duration-300">
          <div className={`mt-0.5 p-1 rounded-full ${toast.type === "success" ? "bg-emerald-500/10 text-emerald-400" : toast.type === "error" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
            {toast.type === "success" ? (
              <Check className="w-4 h-4" />
            ) : toast.type === "error" ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-xs uppercase tracking-wider">{toast.type === "success" ? "Sucesso" : toast.type === "error" ? "Erro" : "Aviso"}</h5>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
