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
  AlertCircle 
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
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { db, auth } from "./firebase";
import { handleFirestoreError, OperationType } from "./firebaseError";
import { PRESET_TEMPLATES, MenuTemplate } from "./templates";

// Definindo as Interfaces principais
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
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
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

  // Escuta em tempo real o documento da TV no Firestore
  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, "screens", screenId);
    
    const unsubscribeScreen = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setScreen({ id: docSnap.id, ...docSnap.data() } as ScreenData);
        setError(null);
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
    };
  }, [screenId]);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans gap-6">
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-60" />
          <VitrionLogo className="w-16 h-16 relative z-10 animate-pulse" />
        </div>
        <p className="text-sm font-semibold tracking-widest text-slate-400 animate-pulse">VITRION DIGITAL DISPLAY • INSTALANDO CANAIS DO FIRE TV...</p>
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
  const presetTemplate = PRESET_TEMPLATES.find(t => t.id === screen?.currentImage);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative flex items-center justify-center font-sans select-none">
      
      {/* 1. LAYER DE BACKGROUND: Imagem Real-Time (Preset SVG ou Base64 personalizada do usuário) */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {presetTemplate ? (
          <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: presetTemplate.svgMarkup }}
          />
        ) : screen?.currentImage ? (
          <img 
            src={screen.currentImage} 
            alt="Fornada Display" 
            className="w-full h-full object-cover"
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
// VIEW 2: PAINEL ADMINISTRATIVO (DASHBOARD)
// ==========================================
function AdminDashboardView() {
  const [activeTab, setActiveTab] = useState<"screens" | "products" | "assets" | "how-to">("screens");
  const [screens, setScreens] = useState<ScreenData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [user, setUser] = useState<any>(null);
  
  // Estados para modais de edição
  const [editingScreen, setEditingScreen] = useState<ScreenData | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [isDeletingScreen, setIsDeletingScreen] = useState<string | null>(null);

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
        // Loga de forma anônima e transparente como administrador de testes para imediata usabilidade
        signInAnonymously(auth)
          .then((cred) => {
            if (cred.user) {
              setUser(cred.user);
            }
          })
          .catch((err) => {
            console.warn("Autenticação anônima do Firebase indisponível ou restrita. Usando sessão administrativa local padrão.", err);
            setUser({
              uid: "admin_local",
              isAnonymous: true,
              email: "admin@vitrion.com.br",
              emailVerified: true
            });
          });
      }
    });
    return unsubscribe;
  }, []);

  // 2. Carrega Dados do Firestore em Tempo Real
  useEffect(() => {
    const unsubscribeScreens = onSnapshot(collection(db, "screens"), (snapshot) => {
      const screenItems: ScreenData[] = [];
      snapshot.forEach((doc) => {
        screenItems.push({ id: doc.id, ...doc.data() } as ScreenData);
      });
      // Ordena por id
      screenItems.sort((a, b) => a.id.localeCompare(b.id));
      setScreens(screenItems);
    }, (error) => {
      console.error("Erro na escuta das telas", error);
    });

    const unsubscribeProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const productItems: ProductData[] = [];
      snapshot.forEach((doc) => {
        productItems.push({ id: doc.id, ...doc.data() } as ProductData);
      });
      setProducts(productItems);
    }, (error) => {
      console.error("Erro na escuta dos produtos", error);
    });

    return () => {
      unsubscribeScreens();
      unsubscribeProducts();
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
      alert("Sucesso! O sistema foi redefinido e povoado com 7 TVs prontas e um cardápio teste de padaria rústica.");
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, "populate-initial");
    }
  };

  // 4. CADASTRA / ATUALIZA PRODUTOS
  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;
    
    try {
      const pId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
      const payload: ProductData = {
        id: pId,
        name: newProdName,
        price: parseFloat(parseFloat(newProdPrice.replace(",", ".")).toFixed(2)),
        category: newProdCategory,
        available: editingProduct ? editingProduct.available : true
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
    try {
      await updateDoc(doc(db, "screens", updated.id), {
        name: updated.name,
        location: updated.location,
        overlayPrices: updated.overlayPrices,
        selectedCategory: updated.selectedCategory,
        currentImage: updated.currentImage,
        lastSync: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      });
      setEditingScreen(null);
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `screens/${updated.id}`);
    }
  };

  // Adiciona nova TV se desejar (até 10 ou ilimitado)
  const handleAddNewScreen = async () => {
    const nextId = `tela-${screens.length + 1}`;
    const name = `SmartTV 0${screens.length + 1}`;
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
        selectedCategory: "Todas"
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

  // 6. TRATAMENTO SENSACIONAL DE ARQUIVO PARA BASE64 (UP-LOAD DAS IMAGENS DA IA)
  const handleUploadImageFile = (e: ChangeEvent<HTMLInputElement>, screenId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("A imagem selecionada excede o limite recomendado para desempenho (máx: 8MB). Reduza as dimensões da imagem exportada pela Inteligência Artificial.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, "screens", screenId), {
          currentImage: base64String,
          lastSync: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        });
        alert(`Sucesso! A nova arte de menu gerada por IA foi sincronizada com a TV: ${screenId}`);
      } catch (err: unknown) {
        handleFirestoreError(err, OperationType.WRITE, `screens/${screenId}`);
      }
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
        </nav>

        {/* Rodapé do Perfil Admin */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700 uppercase">
              {auth.currentUser?.isAnonymous ? "TS" : auth.currentUser?.email?.slice(0, 2) || "ADM"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-xs font-bold truncate">Padaria Cozinha Central</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Acesso Master</p>
            </div>
          </div>
          <button 
            onClick={handleInitializeDefaults}
            className="w-full mt-3 py-1.5 px-3 bg-slate-800 hover:bg-red-950 text-red-300 border border-red-900/30 rounded text-[10px] uppercase tracking-wider font-bold transition-all"
          >
            Redefinir Dados Padrão (Demo)
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
              {activeTab === "assets" && "Biblioteca de Imagens de Inteligência Artificial"}
              {activeTab === "how-to" && "Como Conectar o Amazon Fire TV"}
            </h2>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Sincronizador Ativo
            </span>
          </div>
          
          <div className="flex items-center gap-3">
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
                    const presetImg = PRESET_TEMPLATES.find(t => t.id === sc.currentImage);
                    const isCustomUploaded = sc.currentImage.startsWith("data:");
                    const displayUrl = `${window.location.origin}${window.location.pathname}?screen=${sc.id}`;

                    return (
                      <div key={sc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between group relative hover:shadow-md transition-all">
                        {/* Imagem de Preview Mockup 16:9 */}
                        <div className="h-32 bg-slate-900 relative flex items-center justify-center overflow-hidden border-b border-slate-100">
                          {presetImg ? (
                            <div className="w-full h-full scale-[0.6] opacity-90 select-none pointer-events-none" dangerouslySetInnerHTML={{ __html: presetImg.svgMarkup }} />
                          ) : isCustomUploaded ? (
                            <img src={sc.currentImage} alt="Preview custom" className="w-full h-full object-cover" />
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
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500">Overlay Preços:</span>
                                <span className={`font-bold ${sc.overlayPrices ? "text-blue-600" : "text-amber-600"}`}>
                                  {sc.overlayPrices ? `Sim (${sc.selectedCategory || 'Todas'})` : 'Desativado'}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500">Mídia Ativa:</span>
                                <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                                  {presetImg ? presetImg.name : isCustomUploaded ? "Imagem IA Carregada" : "Padrão"}
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
                                  alert("Link copiado! Cole este endereço exclusivo no navegador do seu Fire TV para exibir esta tela.");
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
                                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[9px] rounded uppercase tracking-wider flex items-center gap-1"
                                title="Carregar nova imagem de inteligência artificial"
                              >
                                <Upload className="w-3 h-3" /> Subir IA Image
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
                              alert("URL exclusivo da TV copiado!");
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

              {/* Seletor de Mídia Preset Incorporada */}
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

    </div>
  );
}
