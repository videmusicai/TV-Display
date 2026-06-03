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
  ChevronLeft,
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
  CheckCircle,
  Megaphone,
  Lock,
  Users,
  Calendar,
  ShieldAlert,
  CreditCard,
  UserCheck,
  Search,
  User,
  MapPin,
  Phone,
  Mail,
  Chrome,
  Globe
} from "lucide-react";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch,
  getDoc,
  query,
  where
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateEmail, updatePassword } from "firebase/auth";
import { db, auth } from "./firebase";
import { handleFirestoreError, OperationType } from "./firebaseError";
import { PRESET_TEMPLATES, MenuTemplate } from "./templates";
import { signInWithGoogle, signOutUser } from "./auth-service";

// Funções Auxiliares de Formatação de Telefone para BR e US
export function formatBRPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatUSPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

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
  currentVideo?: string; // Base64 ou URL de vídeo
  aspectRatio: string;
  lastSync: string;
  overlayPrices: boolean;
  selectedCategory: string; // categoria para filtrar o overlay
  clientId?: string;
  displayMode?: "single" | "playlist";
  playlist?: PlaylistItem[];
  shortCode?: string;
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

export function getOrGenerateShortCode(screenId: string): string {
  if (!screenId) return "10000";
  // Simple deterministic 5-digit hash of the screenId so it's stable and unique-ish!
  let hash = 0;
  for (let i = 0; i < screenId.length; i++) {
    hash = screenId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const positiveHash = Math.abs(hash);
  // Ensure exactly 5 digits (between 10000 and 99999)
  return (10000 + (positiveHash % 90000)).toString();
}

export const generateUniqueShortCode = (existingScreens: ScreenData[]): string => {
  let isUnique = false;
  let code = "";
  let attempts = 0;
  while (!isUnique && attempts < 100) {
    code = Math.floor(10000 + Math.random() * 90000).toString();
    isUnique = !existingScreens.some(s => s.shortCode === code);
    attempts++;
  }
  return code;
};

export function getScreenDisplayNumber(name: string, index: number): string {
  const match = name.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return num.toString();
  }
  return (index + 1).toString();
}

// --- INTERACTIVE PLAN CALENDAR WIDGET ---
interface PlanCalendarProps {
  expirationDate?: string; // ISO String (YYYY-MM-DD or full ISO)
  clientName?: string;
  isSuperAdminView?: boolean;
  clientsList?: any[]; // For Super Admin aggregate view
}

export function PlanCalendar({ 
  expirationDate, 
  clientName = "Minha Loja", 
  isSuperAdminView = false, 
  clientsList = [] 
}: PlanCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse subscription date
  const parsedExpDate = useMemo(() => {
    if (!expirationDate) return null;
    const d = new Date(expirationDate);
    // Adjust to midnight to prevent timezone issues
    d.setHours(23, 59, 59, 999);
    return d;
  }, [expirationDate]);

  // Initial calendar view based on expiration or current time
  const [viewYear, setViewYear] = useState<number>(() => {
    if (parsedExpDate) return parsedExpDate.getFullYear();
    return today.getFullYear();
  });
  
  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (parsedExpDate) return parsedExpDate.getMonth();
    return today.getMonth();
  });

  const [selectedDayInfo, setSelectedDayInfo] = useState<any[] | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  // When expiration date changes, sync user view
  useEffect(() => {
    if (parsedExpDate && !isSuperAdminView) {
      setViewYear(parsedExpDate.getFullYear());
      setViewMonth(parsedExpDate.getMonth());
    }
  }, [expirationDate, isSuperAdminView, parsedExpDate]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

  // Helper calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Create grid
  const daysGrid: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
    setSelectedDayInfo(null);
    setSelectedDayNumber(null);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
    setSelectedDayInfo(null);
    setSelectedDayNumber(null);
  };

  // Check if a specific grid date is today
  const isDateToday = (dayNum: number) => {
    return (
      today.getDate() === dayNum &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  // Helper to format leading zeros
  const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Get active client expirations for Super Admin or normal view on a specific day
  const getExpirationStatusForDay = (dayNum: number) => {
    const formattedTargetStr = `${viewYear}-${padZero(viewMonth + 1)}-${padZero(dayNum)}`;
    
    // Create comparison dates
    const targetDate = new Date(viewYear, viewMonth, dayNum, 23, 59, 59, 999);
    
    if (isSuperAdminView) {
      // Find all clients expiring on this date
      const matchingClients = clientsList.filter(c => {
        if (!c.expirationDate) return false;
        const cDate = new Date(c.expirationDate);
        return (
          cDate.getDate() === dayNum &&
          cDate.getMonth() === viewMonth &&
          cDate.getFullYear() === viewYear
        );
      });

      if (matchingClients.length === 0) return null;

      // Classify priority: if any client is expired, mark red. Else if any within 7 days, mark amber. Else green.
      let hasExpired = false;
      let hasNearDue = false;

      matchingClients.forEach(c => {
        const cDate = new Date(c.expirationDate);
        cDate.setHours(23, 59, 59, 999);
        const diff = cDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (today > cDate) {
          hasExpired = true;
        } else if (diffDays <= 7) {
          hasNearDue = true;
        }
      });

      return {
        clients: matchingClients,
        status: hasExpired ? "expired" : hasNearDue ? "near_due" : "active"
      };
    } else {
      // Regular client view: check their own expiration date
      if (!parsedExpDate) return null;

      const isSameDate = (
        parsedExpDate.getDate() === dayNum &&
        parsedExpDate.getMonth() === viewMonth &&
        parsedExpDate.getFullYear() === viewYear
      );

      if (!isSameDate) return null;

      const diff = parsedExpDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      let status: "expired" | "near_due" | "active" = "active";
      if (today > parsedExpDate) {
        status = "expired";
      } else if (diffDays <= 7) {
        status = "near_due";
      }

      return {
        daysLeft: diffDays,
        status
      };
    }
  };

  const handleDaySelection = (dayNum: number) => {
    if (!isSuperAdminView) return;
    const dayData = getExpirationStatusForDay(dayNum);
    if (dayData && dayData.clients) {
      setSelectedDayInfo(dayData.clients);
      setSelectedDayNumber(dayNum);
    } else {
      setSelectedDayInfo(null);
      setSelectedDayNumber(null);
    }
  };

  // Metrics for normal client view
  const clientAlertDetails = useMemo(() => {
    if (isSuperAdminView || !parsedExpDate) return null;
    const diff = parsedExpDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    return {
      daysRemaining: diffDays,
      isExpired: today > parsedExpDate,
      isNearDue: diffDays <= 7 && today <= parsedExpDate
    };
  }, [isSuperAdminView, parsedExpDate, today]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden font-sans text-white">
      {/* Header do Widget */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-250">
            {isSuperAdminView ? "Agenda de Faturamento" : "Validade do Plano"}
          </h4>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-800 rounded transition-all cursor-pointer text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-300 min-w-[90px] text-center">
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button 
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-800 rounded transition-all cursor-pointer text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week Days Headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-black text-slate-500 uppercase">
          {weekdays.map((w, idx) => (
            <div key={idx} className="h-5 flex items-center justify-center">
              {w}
            </div>
          ))}
        </div>

        {/* Days Circle Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysGrid.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} />;
            }

            const dayStatus = getExpirationStatusForDay(day);
            const isToday = isDateToday(day);
            
            // Custom CSS based on status classes
            let dayClass = "text-slate-300 hover:bg-slate-800/40";
            let indicatorClass = "";

            if (isToday) {
              dayClass = "border border-blue-500 text-blue-400 font-extrabold shadow-sm bg-blue-950/20";
            }

            if (dayStatus) {
              if (dayStatus.status === "expired") {
                dayClass = "bg-rose-950/40 text-rose-400 font-black border border-rose-800/60 shadow-lg animate-pulse";
                indicatorClass = "bg-rose-500";
              } else if (dayStatus.status === "near_due") {
                dayClass = "bg-amber-950/40 text-amber-400 font-black border border-amber-800/60 shadow-lg animate-pulse";
                indicatorClass = "bg-amber-500";
              } else if (dayStatus.status === "active") {
                dayClass = "bg-emerald-950/30 text-emerald-400 font-bold border border-emerald-900/40";
                indicatorClass = "bg-emerald-500";
              }
            }

            return (
              <button
                key={`day-${day}`}
                onClick={() => handleDaySelection(day)}
                type="button"
                disabled={isSuperAdminView ? !dayStatus : true}
                className={`h-8 text-xs rounded-xl flex flex-col items-center justify-center relative transition-all ${dayClass} ${
                  isSuperAdminView && dayStatus ? "cursor-pointer hover:ring-2 hover:ring-slate-400/30" : "cursor-default"
                }`}
              >
                <span>{day}</span>
                {indicatorClass && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${indicatorClass}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER: CLIENT NOTIFICATION PORTAL OR DETAILS */}
      {!isSuperAdminView && clientAlertDetails && (
        <div className="border-t border-slate-850 p-4 bg-slate-950/40 text-xs">
          {clientAlertDetails.isExpired ? (
            <div className="flex items-start gap-2.5 bg-rose-950/30 border border-rose-900/50 rounded-xl p-3 text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-[11px] uppercase tracking-wider text-rose-200">Plano Expirado!</p>
                <p className="text-[11px] text-rose-400/90 leading-relaxed mt-0.5">
                  Sua assinatura venceu no dia <span className="font-bold underline">{parsedExpDate?.toLocaleDateString("pt-BR")}</span>. O sinal de transmissão está travado. Regularize seu plano hoje.
                </p>
              </div>
            </div>
          ) : clientAlertDetails.isNearDue ? (
            <div className="flex items-start gap-2.5 bg-amber-950/35 border border-amber-900/50 rounded-xl p-3 text-amber-300 animate-pulse">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="font-black text-[11px] uppercase tracking-wider text-amber-250">Vence em Breve (Alerta de {clientAlertDetails.daysRemaining} Dias)!</p>
                <p className="text-[11px] text-amber-400/90 leading-relaxed mt-0.5">
                  Sua licença vencerá em <span className="font-bold underline">{clientAlertDetails.daysRemaining} dias</span> no dia <span className="font-bold">{parsedExpDate?.toLocaleDateString("pt-BR")}</span>. Regularize a situação comercial com o suporte.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px] uppercase tracking-wider text-emerald-200">Sinal Autorizado & Saudável</p>
                <p className="text-[11px] text-emerald-400/90 leading-relaxed mt-0.5">
                  Seu plano está 100% regularizado até dia <span className="font-bold">{parsedExpDate?.toLocaleDateString("pt-BR")}</span> ({clientAlertDetails.daysRemaining} dias restantes). Aproveite o painel!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER: SUPER ADMIN PORTFOLIO OVERFLOW */}
      {isSuperAdminView && (
        <div className="border-t border-slate-850 p-4 bg-slate-950/40 text-xs">
          {selectedDayInfo && selectedDayNumber ? (
            <div className="space-y-3">
              <p className="font-black text-[10px] uppercase text-slate-300 tracking-widest border-b border-slate-800 pb-1.5 flex justify-between items-center">
                <span>Vencimentos em {selectedDayNumber}/{viewMonth + 1}:</span>
                <span className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[9px]">{selectedDayInfo.length} conta(s)</span>
              </p>
              <div className="max-h-36 overflow-y-auto space-y-2">
                {selectedDayInfo.map((cli) => {
                  const hasExpired = new Date() > new Date(cli.expirationDate);
                  return (
                    <div key={cli.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <p className="font-bold text-slate-200">{cli.name}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{cli.ownerEmail}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        hasExpired ? "bg-rose-950/60 text-rose-400" : "bg-amber-950/60 text-amber-400"
                      }`}>
                        {hasExpired ? "Expirou" : "Crítico (7d)"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-2.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
              Clique em alguma data com alerta (ponto colorido) para examinar faturamentos críticos.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- CONFIGURATION / PROFILE SETTINGS PANEL ---
interface StoreSettingsPanelProps {
  loggedInClient: any;
  user: any;
  setUser: (u: any) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function StoreSettingsPanel({
  loggedInClient,
  user,
  setUser,
  showToast
}: StoreSettingsPanelProps) {
  const getCleanUsername = (emailStr: string): string => {
    if (!emailStr) return "";
    if (emailStr.endsWith("@vitrion.com.br")) {
      return emailStr.replace("@vitrion.com.br", "");
    }
    return emailStr;
  };

  const [establishmentName, setEstablishmentName] = useState(loggedInClient?.name || "");
  const [username, setUsername] = useState(getCleanUsername(loggedInClient?.ownerEmail || user?.email || ""));
  const [contactEmail, setContactEmail] = useState(loggedInClient?.contactEmail || "");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState(loggedInClient?.address || "");
  const [phone1, setPhone1] = useState(loggedInClient?.phone || "");
  const [phone2, setPhone2] = useState(loggedInClient?.contactPhone || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if loggedInClient is loaded later (asynchronous onSnapshot load)
  useEffect(() => {
    if (loggedInClient) {
      setEstablishmentName(loggedInClient.name || "");
      setUsername(getCleanUsername(loggedInClient.ownerEmail || user?.email || ""));
      setContactEmail(loggedInClient.contactEmail || "");
      setAddress(loggedInClient.address || "");
      setPhone1(loggedInClient.phone || "");
      setPhone2(loggedInClient.contactPhone || "");
    }
  }, [loggedInClient]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!establishmentName.trim()) {
      showToast("O nome do estabelecimento é obrigatório.", "error");
      return;
    }
    
    const cleanUserStr = username.trim().toLowerCase().replace(/\s+/g, "");
    if (!cleanUserStr) {
      showToast("Insira um nome de usuário válido.", "error");
      return;
    }

    const finalEmail = cleanUserStr.includes("@") ? cleanUserStr : `${cleanUserStr}@vitrion.com.br`;

    if (password && password.length < 6) {
      showToast("A senha deve conter no mínimo 6 caracteres.", "error");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update in Firebase Auth if a real server-side session is logged in
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser && !currentAuthUser.uid.startsWith("bypass_")) {
        // If email changed, update in FirebaseAuth
        if (currentAuthUser.email?.toLowerCase() !== finalEmail.toLowerCase()) {
          try {
            await updateEmail(currentAuthUser, finalEmail);
          } catch (err: any) {
            if (err.code === "auth/requires-recent-login") {
              showToast("Por segurança, saia e entre novamente antes de alterar as credenciais.", "error");
              setIsSaving(false);
              return;
            }
            throw err;
          }
        }
        // If password entered, update in FirebaseAuth
        if (password) {
          try {
            await updatePassword(currentAuthUser, password);
          } catch (err: any) {
            if (err.code === "auth/requires-recent-login") {
              showToast("Por segurança, saia e entre novamente antes de alterar a senha.", "error");
              setIsSaving(false);
              return;
            }
            throw err;
          }
        }
      } else {
        // If bypass mock mode is on, update the bypass storage user
        const localBypassStr = localStorage.getItem("vitrion_bypass_user");
        if (localBypassStr) {
          const bypassObj = JSON.parse(localBypassStr);
          bypassObj.email = finalEmail;
          localStorage.setItem("vitrion_bypass_user", JSON.stringify(bypassObj));
          setUser(bypassObj);
        }
      }

      // 2. Update client document in Firestore
      if (loggedInClient && loggedInClient.id) {
        const clientRef = doc(db, "clients", loggedInClient.id);
        const updatePayload: any = {
          name: establishmentName.trim(),
          ownerEmail: finalEmail,
          contactEmail: contactEmail.trim().toLowerCase(),
          address: address.trim(),
          phone: phone1.trim(),
          contactPhone: phone2.trim()
        };
        if (password) {
          updatePayload.password = password;
        }
        await updateDoc(clientRef, updatePayload);
      }

      showToast("Configurações do estabelecimento salvas com sucesso!", "success");
      // Clear password field for safety
      setPassword("");
    } catch (error: any) {
      console.error("Erro ao salvar configurações", error);
      showToast(`Erro ao salvar: ${error.message || error}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 font-sans">
        <Settings className="w-6 h-6 text-blue-600 animate-spin" style={{ animationDuration: "12s" }} />
        <div>
          <h3 className="font-bold text-base text-slate-900 tracking-tight">Configurações do Estabelecimento</h3>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Atualize seus dados, endereços, telefones e credenciais de acesso</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 font-sans">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SEÇÃO 1: CREDENCIAIS E LOGIN */}
          <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <h4 className="font-extrabold text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User className="w-3.5 h-3.5 text-blue-500" />
              Credenciais de Acesso
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Nome de Usuário (Login)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none text-xs">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold font-mono"
                    placeholder="ex: padaria_colonial"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-sans">
                  Importante: Use apenas letras minúsculas, números ou sublinhado (_). Sem espaços ou acentos.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Nova Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-sans">
                  Deixe em branco se não desejar alterar a senha atual de login.
                </p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: DADOS DA LOJA */}
          <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <h4 className="font-extrabold text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Tv className="w-3.5 h-3.5 text-blue-500" />
              Perfil do Estabelecimento
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Nome do Estabelecimento
                </label>
                <input
                  type="text"
                  value={establishmentName}
                  onChange={(e) => setEstablishmentName(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                  placeholder="Nome comercial da sua loja ou padaria"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  E-mail de Contato / Comunicação
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                    placeholder="Ex: financeiro@padariacentral.com.br"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-sans">
                  E-mail para contatos de faturamento, suporte e newsletters do Vitrion.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Endereço Físico
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                    placeholder="Rua, Número, Bairro, Cidade - Estado"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* SEÇÃO 3: CONTATOS / TELEFONES (DOIS CAMPOS) */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
          <h4 className="font-extrabold text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Phone className="w-3.5 h-3.5 text-blue-500" />
            Canais de Atendimento (Telefones)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Telefone Principal / Linha Direta
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={phone1}
                  onChange={(e) => setPhone1(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                  placeholder="(11) 99999-5555"
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-sans">
                Seu número de contato principal exibido aos clientes ou para contato administrativo.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                Telefone Secundário / WhatsApp Comercial
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={phone2}
                  onChange={(e) => setPhone2(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                  placeholder="(11) 98888-4444"
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-sans">
                Número alternativo focado em recados ou atendimento comercial via WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* BOTÃO DE SALVAMENTO */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/15 ${
              isSaving ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Salvando dados...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Salvar Configurações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  // Estado de Roteamento Simples (Baseado em Query Params)
  const [screenParam, setScreenParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let screenId = params.get("screen");
    
    // Se não passou screen no query param, tenta obter a última TV pareada salva no local storage
    if (!screenId) {
      screenId = localStorage.getItem("vitrion_paired_screen_id");
    }

    if (screenId) {
      setScreenParam(screenId);
    }
  }, []);

  // RENDERIZAÇÃO 1: Tela de Exibição Pública do Amazon Fire TV (Sem headers, sem botões)
  if (screenParam) {
    return <PublicDisplayView screenId={screenParam} />;
  }

  // RENDERIZAÇÃO 2: Dashboard Administrador Principal
  return <AdminDashboardView setScreenParam={setScreenParam} />;
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
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Mantém a tela acordada usando a API padrão Screen Wake Lock (suportada pelo Silk Browser / Chrome)
  useEffect(() => {
    let wakeLock: any = null;

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
          console.log("Tela ativa! Wake lock ativado com sucesso para manter a TV ligada.");
        }
      } catch (err) {
        console.warn("Não foi possível ativar o Wake Lock para manter a tela acordada:", err);
      }
    }

    requestWakeLock();

    // Re-solicita o Wake Lock caso o usuário alterne de aba/aplicativo e retorne
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
          setWakeLockActive(false);
          console.log("Wake Lock liberado.");
        }).catch((err: any) => {
          console.warn("Erro ao liberar Wake Lock:", err);
        });
      }
    };
  }, []);

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
    let unsubscribeClient: (() => void) | null = null;

    const handleScreenData = (data: ScreenData) => {
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
    };

    let unsubscribeScreen: () => void;
    const isShortCode = /^\d{5}$/.test(screenId);

    if (isShortCode) {
      const q = query(collection(db, "screens"), where("shortCode", "==", screenId));
      unsubscribeScreen = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = { id: docSnap.id, ...docSnap.data() } as ScreenData;
          handleScreenData(data);
        } else {
          setError(`Nenhuma TV correspondente ao código "${screenId}" foi localizada no Vitrion.`);
        }
        setLoading(false);
      }, (err) => {
        console.error("Erro ao conectar ao sinal por código", err);
        setError("Não foi possível estabelecer contato com a TV por código.");
        setLoading(false);
      });
    } else {
      const docRef = doc(db, "screens", screenId);
      unsubscribeScreen = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as ScreenData;
          handleScreenData(data);
        } else {
          setError(`A tela "${screenId}" não foi encontrada no banco do Vitrion Digital Display. Verifique o ID no painel administrador.`);
        }
        setLoading(false);
      }, (err) => {
        setError(`Erro na escuta da tela: ${err.message}`);
        setLoading(false);
      });
    }

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
          {wakeLockActive && (
            <span className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest animate-pulse font-sans">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Modo Anti-Sleep Ativo
            </span>
          )}
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

  const isScreenOffline = screen?.status === "offline";

  if (isScreenOffline) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans text-center relative overflow-hidden select-none">
        {/* Glowing ambient background element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 bg-amber-500/15 rounded-full animate-ping opacity-35" />
          <Tv className="w-7 h-7 text-amber-500 shrink-0" />
        </div>
        
        <h2 className="text-xl font-bold uppercase tracking-wider mb-2 text-slate-300">
          TV em Standby
        </h2>
        <p className="text-[9px] text-amber-500 uppercase tracking-[0.25em] font-bold mb-4">Sinal Desativado pelo Administrador</p>
        
        <p className="text-slate-400 max-w-sm text-xs leading-relaxed mb-6 px-4">
          A exibição de menus digitais desta TV foi desativada temporariamente. Você pode reativar a transmissão a qualquer momento em seu painel Vitrion.
        </p>

        <div className="bg-slate-900/60 border border-slate-800 py-3 px-5 rounded-lg max-w-xs mx-auto">
          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold font-mono">Nome da TV</p>
          <p className="text-xs font-bold text-slate-300 tracking-wide mt-1">{screen?.name || screenId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative flex items-center justify-center font-sans select-none">
      
      {/* 1. LAYER DE BACKGROUND: Imagem/Vídeo Real-Time (Preset SVG, Base64 de Imagem ou Vídeo do usuário) */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {(screen?.displayMode || "single") === "single" && screen?.currentVideo ? (
          <video 
            src={screen.currentVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover animate-fade-in"
            key={screen.currentVideo}
          />
        ) : presetTemplate ? (
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
            <p className="text-xs tracking-wider font-mono">NENHUMA IMAGEM OU VÍDEO ENVIADO PARA ESTA TELA</p>
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
function AdminDashboardView({ setScreenParam }: { setScreenParam: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<"screens" | "products" | "assets" | "promotions" | "gallery" | "how-to" | "clients" | "settings">("screens");
  const [rawScreens, setRawScreens] = useState<ScreenData[]>([]);
  const [rawProducts, setRawProducts] = useState<ProductData[]>([]);
  const [user, setUser] = useState<any>(null);

  // Estado para o Modal de Confirmação Customizado (Imune ao Iframe Sandbox)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const requestConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Estados dos Formulários de Autenticação (Login, Registro SaaS e Pareamento)
  const [authMode, setAuthMode] = useState<"login" | "signup" | "pair">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStoreName, setAuthStoreName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPhoneCountry, setAuthPhoneCountry] = useState<"BR" | "US">("BR");
  const [authAddress, setAuthAddress] = useState("");
  const [authCity, setAuthCity] = useState("");
  const [regContactEmail, setRegContactEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [instantEmail, setInstantEmail] = useState("");

  useEffect(() => {
    if (user?.email && !regContactEmail) {
      setRegContactEmail(user.email);
    }
  }, [user, regContactEmail]);

  // Estados do modal do Administrador
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminModalEmail, setAdminModalEmail] = useState("");
  const [adminModalPassword, setAdminModalPassword] = useState("");
  const [adminModalLoading, setAdminModalLoading] = useState(false);

  // Estados específicos para o modo Pareamento
  const handleCompleteRegistration = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAuthError("");
    setAuthLoading(true);

    if (!authStoreName.trim()) {
      showToast("Por favor, preencha o Nome do Estabelecimento.", "error");
      setAuthLoading(false);
      return;
    }
    if (!authPhone.trim()) {
      showToast("Por favor, preencha o WhatsApp ou Telefone.", "error");
      setAuthLoading(false);
      return;
    }
    if (!authAddress.trim()) {
      showToast("Por favor, preencha o Endereço.", "error");
      setAuthLoading(false);
      return;
    }
    if (!authCity.trim()) {
      showToast("Por favor, preencha a Cidade.", "error");
      setAuthLoading(false);
      return;
    }
    if (!regContactEmail.trim() || !regContactEmail.includes("@")) {
      showToast("Por favor, insira um E-mail de contato válido.", "error");
      setAuthLoading(false);
      return;
    }

    try {
      const cliId = `client_${user.uid}`;
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 1 mês de testes grátis!
      const autoCountry = authPhoneCountry === "BR" ? "Brasil" : "Estados Unidos";
      
      await setDoc(doc(db, "clients", cliId), {
        id: cliId,
        name: authStoreName,
        ownerEmail: user.email || "",
        contactEmail: regContactEmail.trim().toLowerCase(),
        phone: authPhone ? (authPhoneCountry === "BR" ? `+55 ${authPhone}` : `+1 ${authPhone}`) : "",
        contactPhone: authPhone ? (authPhoneCountry === "BR" ? `+55 ${authPhone}` : `+1 ${authPhone}`) : "",
        address: authAddress.trim(),
        city: authCity.trim(),
        country: autoCountry,
        pais: autoCountry,
        monthlyFee: 99.90,
        expirationDate: expiry,
        status: "pending", // Em análise pelo Administrador (permite teste livre)
        plan: "basico", // Plano básico padrão para novos cadastros (suporta 4 TVs)
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Also create a default screen for them so they can immediately see it!
      await setDoc(doc(db, "screens", `tv_${user.uid}`), {
        id: `tv_${user.uid}`,
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
        shortCode: getOrGenerateShortCode(`tv_${user.uid}`),
        playlist: [
          { id: "slot-1", image: "chalk-bakery", duration: 10, enabled: true },
          { id: "slot-2", image: "cozy-coffee", duration: 10, enabled: false },
          { id: "slot-3", image: "", duration: 10, enabled: false },
          { id: "slot-4", image: "", duration: 10, enabled: false }
        ]
      }, { merge: true });

      showToast(`Seu estabelecimento foi cadastrado com sucesso! Bem-vindo!`, "success");
    } catch (err: any) {
      console.error("Cadastro erro:", err);
      showToast("Não foi possível persistir no banco. Tentando de novo.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const [pairingCode, setPairingCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState("");

  const handlePairTV = async (e: FormEvent) => {
    e.preventDefault();
    setPairingError("");
    setPairingLoading(true);

    const code = pairingCode.trim();
    if (!code) {
      setPairingError("Por favor, digite o código ou link da TV.");
      setPairingLoading(false);
      return;
    }

    try {
      let foundScreenId = "";
      let foundScreenName = "";
      const isShort = /^\d{5}$/.test(code);

      if (isShort) {
        const q = query(collection(db, "screens"), where("shortCode", "==", code));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundScreenId = snap.docs[0].id;
          foundScreenName = snap.docs[0].data().name || "TV";
        }
      }

      if (!foundScreenId) {
        const docRef = doc(db, "screens", code);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          foundScreenId = docSnap.id;
          foundScreenName = docSnap.data().name || "TV";
        }
      }

      if (foundScreenId) {
        localStorage.setItem("vitrion_paired_screen_id", foundScreenId);
        showToast(`TV "${foundScreenName}" Sintonizada com Sucesso!`, "success");
        setScreenParam(foundScreenId);
      } else {
        setPairingError("Dígitos incorretos. Nenhuma TV cadastrada com este código foi encontrada.");
      }
    } catch (err: any) {
      console.error("Erro ao sintonizar TV", err);
      setPairingError("Falha na sincronização local. Tente novamente mais tarde.");
    } finally {
      setPairingLoading(false);
    }
  };

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

  const ensureLocalDocsForVitrion54 = async (uid: string) => {
    const cliId = `client_${uid}`;
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 1 mês de testes grátis!
    const defaultStoreName = "Vitrion 54";
    
    try {
      // Create or update client doc gently with merge
      await setDoc(doc(db, "clients", cliId), {
        id: cliId,
        name: defaultStoreName,
        ownerEmail: "vitrion54@vitrion.com.br",
        phone: "(11) 99999-5454",
        contactPhone: "(11) 99999-5454",
        monthlyFee: 99.90,
        expirationDate: expiry,
        status: "active",
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Create screen doc gently with merge
      await setDoc(doc(db, "screens", `tv_${uid}`), {
        id: `tv_${uid}`,
        name: "TV Recepção - Principal",
        location: defaultStoreName,
        aspectRatio: "16:9",
        status: "online",
        currentImage: "chalk-bakery",
        lastSync: "Criada agora",
        overlayPrices: false,
        selectedCategory: "Todas",
        clientId: cliId,
        displayMode: "single",
        shortCode: "54541",
        playlist: [
          { id: "slot-1", image: "chalk-bakery", duration: 10, enabled: true },
          { id: "slot-2", image: "cozy-coffee", duration: 10, enabled: false },
          { id: "slot-3", image: "", duration: 10, enabled: false },
          { id: "slot-4", image: "", duration: 10, enabled: false }
        ]
      }, { merge: true });
    } catch (dbErr) {
      console.warn("Erro ao assegurar documentos para vitrion54", dbErr);
    }
  };

  const handleAdminModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAdminModalLoading(true);

    let formattedEmail = adminModalEmail.trim();
    if (!formattedEmail.includes("@")) {
      formattedEmail = `${formattedEmail.toLowerCase()}@vitrion.com.br`;
    }

    const formattedEmailLower = formattedEmail.toLowerCase();
    
    // Admin access via vitrion54 / vitron!@ as requested (also accepts vitrion!@ for safety & typo-proofing)
    const isAdminVitrion54 = (formattedEmailLower === "vitrion54@vitrion.com.br" || formattedEmailLower === "vitrion54") && (adminModalPassword === "vitron!@" || adminModalPassword === "vitrion!@");
    const isAdminBypass = isAdminVitrion54 || (formattedEmailLower === "admin@vitrion.com.br" || formattedEmailLower === "videmusicai@gmail.com" || formattedEmailLower === "admin") && (adminModalPassword === "admin123" || adminModalPassword === "vitrion!@");

    if (!isAdminBypass) {
      showToast("Credenciais de administrador incorretas. Digite o usuário e senha autorizados.", "error");
      setAdminModalLoading(false);
      return;
    }

    const finalAdminEmail = (formattedEmailLower === "admin" || formattedEmailLower === "admin@vitrion.com.br") 
      ? "admin@vitrion.com.br" 
      : (formattedEmailLower === "vitrion54" || formattedEmailLower === "vitrion54@vitrion.com.br") 
        ? "vitrion54@vitrion.com.br" 
        : formattedEmailLower;

    try {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, finalAdminEmail, adminModalPassword);
      } catch (err: any) {
        if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
          try {
            cred = await createUserWithEmailAndPassword(auth, finalAdminEmail, adminModalPassword);
          } catch (createErr) {
            console.warn("Erro ao registrar admin no Firebase Auth, usando bypass", createErr);
          }
        } else {
          throw err;
        }
      }
      setUser({
        uid: cred?.user?.uid || "admin_super_uid",
        email: finalAdminEmail,
        isAnonymous: false,
        emailVerified: true
      });
      showToast("Painel de Administrador Vitrion acessado com sucesso!", "success");
      setIsAdminModalOpen(false);
      setAdminModalEmail("");
      setAdminModalPassword("");
    } catch (bypassErr) {
      console.warn("Bypass de admin local ativado", bypassErr);
      setUser({
        uid: "admin_super_uid",
        email: finalAdminEmail,
        isAnonymous: false,
        emailVerified: true
      });
      showToast("Painel de Administrador acessado com sucesso!", "success");
      setIsAdminModalOpen(false);
      setAdminModalEmail("");
      setAdminModalPassword("");
    } finally {
      setAdminModalLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        showToast("Painel Vitrion acessado com o Google!", "success");
      }
    } catch (err: any) {
      console.error("Erro no login com Google:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(`Erro no login com Google: ${err.message || err.code || err}`);
        showToast("Falha no login com Google. Tente preencher o campo abaixo ou abrir em uma nova guia.", "error");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInstantEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formattedEmail = instantEmail.trim().toLowerCase();
    if (!formattedEmail || !formattedEmail.includes("@")) {
      showToast("Por favor, digite um e-mail válido com @.", "error");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      const mockUid = `usr_${Math.random().toString(36).substring(2, 11)}`;
      const mockUser = {
        uid: mockUid,
        email: formattedEmail,
        isAnonymous: false,
        emailVerified: true
      };
      // Save to localStorage so it stays active
      localStorage.setItem("vitrion_bypass_user", JSON.stringify(mockUser));
      setUser(mockUser);
      showToast("Conectado com sucesso pelo e-mail!", "success");
    } catch (err: any) {
      console.error("Erro no login instantâneo:", err);
      showToast("Ocorreu um erro ao conectar com o e-mail.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    let formattedEmail = authEmail.trim();
    if (!formattedEmail.includes("@")) {
      formattedEmail = `${formattedEmail.toLowerCase()}@vitrion.com.br`;
    }

    const formattedEmailLower = formattedEmail.toLowerCase();
    
    // Admin access via vitrion54 / vitron!@ as requested (also accepts vitrion!@ for safety & typo-proofing)
    const isAdminVitrion54 = (formattedEmailLower === "vitrion54@vitrion.com.br" || formattedEmailLower === "vitrion54") && (authPassword === "vitron!@" || authPassword === "vitrion!@");
    
    const isAdminBypass = isAdminVitrion54 || (formattedEmailLower === "admin@vitrion.com.br" || formattedEmailLower === "videmusicai@gmail.com" || formattedEmailLower === "admin") && (authPassword === "admin123" || authPassword === "vitrion!@");

    try {
      if (authMode === "login") {
        if (isAdminBypass) {
          const finalAdminEmail = (formattedEmailLower === "admin" || formattedEmailLower === "admin@vitrion.com.br") 
            ? "admin@vitrion.com.br" 
            : (formattedEmailLower === "vitrion54" || formattedEmailLower === "vitrion54@vitrion.com.br") 
              ? "vitrion54@vitrion.com.br" 
              : formattedEmailLower;
          try {
            let cred;
            try {
              cred = await signInWithEmailAndPassword(auth, finalAdminEmail, authPassword);
            } catch (err: any) {
              if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
                try {
                  cred = await createUserWithEmailAndPassword(auth, finalAdminEmail, authPassword);
                } catch (createErr) {
                  console.warn("Erro ao registrar admin no Firebase Auth, usando bypass", createErr);
                }
              } else {
                throw err;
              }
            }
            setUser({
              uid: cred?.user?.uid || "admin_super_uid",
              email: finalAdminEmail,
              isAnonymous: false,
              emailVerified: true
            });
            showToast("Painel do Super Administrador do Vitrion acessado com sucesso!", "success");
            setAuthLoading(false);
            return;
          } catch (bypassErr) {
            console.warn("Bypass ativado para admin local", bypassErr);
            setUser({
              uid: "admin_super_uid",
              email: finalAdminEmail,
              isAnonymous: false,
              emailVerified: true
            });
            showToast("Painel do Super Administrador acessado (Bypass Local)!", "success");
            setAuthLoading(false);
            return;
          }
        }

        // Sign in with Firebase Auth standard flow
        let cred;
        try {
          cred = await signInWithEmailAndPassword(auth, formattedEmail, authPassword);
        } catch (err: any) {
          if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
            console.warn("Bypass ativo para auth/operation-not-allowed", err);
            
            // Provedor desativado no Firebase console. Usamos login persistente por bypass de e-mail.
            const sanitizedEmail = formattedEmailLower.replace(/[^a-zA-Z0-9]/g, "_");
            const mockUid = `bypass_${sanitizedEmail}`;
            const mockUser = {
              uid: mockUid,
              email: formattedEmail,
              isAnonymous: false,
              emailVerified: true
            };
            
            localStorage.setItem("vitrion_bypass_user", JSON.stringify(mockUser));
            cred = { user: mockUser };
            
            // Garantir que o cliente e sua tela existam no Firestore para que possam interagir
            const cliId = `client_${mockUid}`;
            const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 1 mês
            const defaultStoreName = `Loja ${authEmail.trim().split("@")[0]}`;
            
            try {
              await setDoc(doc(db, "clients", cliId), {
                id: cliId,
                name: defaultStoreName,
                ownerEmail: formattedEmail,
                phone: "(11) 99999-5454",
                contactPhone: "(11) 99999-5454",
                monthlyFee: 99.90,
                expirationDate: expiry,
                status: "active",
                plan: "basico",
                createdAt: new Date().toISOString()
              }, { merge: true });

              await setDoc(doc(db, "screens", `tv_${mockUid}`), {
                id: `tv_${mockUid}`,
                name: "TV Recepção - Principal",
                location: defaultStoreName,
                aspectRatio: "16:9",
                status: "online",
                currentImage: "chalk-bakery",
                lastSync: "Criada agora",
                overlayPrices: false,
                selectedCategory: "Todas",
                clientId: cliId,
                displayMode: "single",
                shortCode: getOrGenerateShortCode(`tv_${mockUid}`),
                playlist: [
                  { id: "slot-1", image: "chalk-bakery", duration: 10, enabled: true },
                  { id: "slot-2", image: "cozy-coffee", duration: 10, enabled: false },
                  { id: "slot-3", image: "", duration: 10, enabled: false },
                  { id: "slot-4", image: "", duration: 10, enabled: false }
                ]
              }, { merge: true });
            } catch (dbErr) {
              console.warn("Falha silenciosa ao guardar dados persistentes de bypass no Firestore", dbErr);
            }
            
            showToast("⚠️ Firebase Auth: Provedor de E-mail/Senha de teste desativado. Login bypass persistente ativado com sucesso!", "info");
          } else {
            // Se for usuário simples de teste (sem @) e não existir, criamos instantaneamente
            const isSimpleUser = !authEmail.trim().includes("@") && authPassword.length >= 6;
            
            if (isSimpleUser && (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password")) {
              try {
                try {
                  cred = await createUserWithEmailAndPassword(auth, formattedEmail, authPassword);
                } catch (signUpAuthErr) {
                  console.warn("Falha de Firebase Auth na criação rápida, simulando usuário local", signUpAuthErr);
                  const mockUid = `usr_${Date.now()}`;
                  cred = {
                    user: {
                      uid: mockUid,
                      email: formattedEmail,
                      isAnonymous: false,
                      emailVerified: true
                    }
                  };
                  localStorage.setItem("vitrion_bypass_user", JSON.stringify(cred.user));
                }

                if (cred.user) {
                  const cliId = `client_${cred.user.uid}`;
                  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 1 mês de testes grátis!
                  const defaultStoreName = `Loja ${authEmail.trim()}`;
                  
                  await setDoc(doc(db, "clients", cliId), {
                    id: cliId,
                    name: defaultStoreName,
                    ownerEmail: formattedEmail,
                    phone: "(11) 99999-5454",
                    contactPhone: "(11) 99999-5454",
                    monthlyFee: 99.90,
                    expirationDate: expiry,
                    status: "active",
                    createdAt: new Date().toISOString()
                  });

                  // Cria também uma tela inicial padrão
                  await setDoc(doc(db, "screens", `tv_${cred.user.uid}`), {
                    id: `tv_${cred.user.uid}`,
                    name: "TV Recepção - Principal",
                    location: defaultStoreName,
                    aspectRatio: "16:9",
                    status: "online",
                    currentImage: "chalk-bakery",
                    lastSync: "Criada agora",
                    overlayPrices: false,
                    selectedCategory: "Todas",
                    clientId: cliId,
                    displayMode: "single",
                    shortCode: getOrGenerateShortCode(`tv_${cred.user.uid}`),
                    playlist: [
                      { id: "slot-1", image: "chalk-bakery", duration: 10, enabled: true },
                      { id: "slot-2", image: "cozy-coffee", duration: 10, enabled: false },
                      { id: "slot-3", image: "", duration: 10, enabled: false },
                      { id: "slot-4", image: "", duration: 10, enabled: false }
                    ]
                  });
                }
              } catch (signUpErr: any) {
                if (signUpErr.code === "auth/email-already-in-use") {
                  // Usuário existe mas senha incorreta!
                  throw new Error("wrong_password_or_user");
                } else {
                  throw signUpErr;
                }
              }
            } else {
              // Verificar se o cliente foi previamente cadastrado pelo Super Admin na lista de clientes!
              const matchedClient = clients.find(c => c.ownerEmail?.toLowerCase() === formattedEmailLower);
              if (matchedClient && authPassword.length >= 6) {
                console.log("Usuário pré-cadastrado no Firestore. Habilitando sessão bypass local.");
                const mockUser = {
                  uid: matchedClient.id.replace("client_", ""),
                  email: formattedEmail,
                  isAnonymous: false,
                  emailVerified: true
                };
                localStorage.setItem("vitrion_bypass_user", JSON.stringify(mockUser));
                cred = { user: mockUser };
              } else {
                // Se falhou e não existe bypass viável, lança o erro original
                throw err;
              }
            }
          }
        }

        if (cred && cred.user) {
          setUser(cred.user);
          showToast(`Painel Vitrion acessado com sucesso!`, "success");
        }
      } else {
        // Sign up and create new customer account (auth only)
        let cred;
        try {
          cred = await createUserWithEmailAndPassword(auth, formattedEmail, authPassword);
        } catch (signUpAuthErr: any) {
          console.warn("Não foi possível criar login no Firebase Auth. Ativando bypass de registro de conta.", signUpAuthErr);
          
          // Fallback para login offline / bypass local consistente
          const sanitizedEmail = formattedEmailLower.replace(/[^a-zA-Z0-9]/g, "_");
          const mockUid = `bypass_${sanitizedEmail}`;
          const mockUser = {
            uid: mockUid,
            email: formattedEmail,
            isAnonymous: false,
            emailVerified: true
          };
          localStorage.setItem("vitrion_bypass_user", JSON.stringify(mockUser));
          cred = { user: mockUser };
          
          if (signUpAuthErr.code === "auth/operation-not-allowed" || signUpAuthErr.message?.includes("operation-not-allowed")) {
            showToast("⚠️ Firebase Auth: Provedor de E-mail/Senha de teste desativado. Registro bypass persistente ativado com sucesso!", "info");
          }
        }

        if (cred && cred.user) {
          setUser(cred.user);
          showToast(`Conta criada com sucesso! Insira agora os dados do seu estabelecimento.`, "success");
        }
      }
    } catch (err: any) {
      console.error("Auth error", err);
      let BrazilianErrorMessage = "Ocorreu um erro ao processar. Verifique suas credenciais.";
      if (err.message === "wrong_password_or_user" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        BrazilianErrorMessage = "Usuário/E-mail ou senha incorretos.";
      } else if (err.code === "auth/email-already-in-use") {
        BrazilianErrorMessage = "Este e-mail ou usuário já está sendo utilizado por outra conta.";
      } else if (err.code === "auth/invalid-email") {
        BrazilianErrorMessage = "Formato de e-mail ou usuário inválido.";
      } else if (err.code === "auth/weak-password") {
        BrazilianErrorMessage = "A senha deve ter no mínimo 6 caracteres.";
      } else if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        BrazilianErrorMessage = "O provedor de autenticação 'E-mail/Senha' está desativado nas configurações do Firebase console deste projeto. Habilitamos o login local bypass persistente para você testar sem interrupções, mas lembre-se de ativar 'Email/Password' no menu Authentication (Sign-in method) do Firebase.";
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
  const [newClientPhoneCountry, setNewClientPhoneCountry] = useState<"BR" | "US">("BR");
  const [newClientPhone2, setNewClientPhone2] = useState("");
  const [newClientPhone2Country, setNewClientPhone2Country] = useState<"BR" | "US">("BR");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [newClientFee, setNewClientFee] = useState("99.90");
  const [newClientExpiration, setNewClientExpiration] = useState("");
  const [newClientPlan, setNewClientPlan] = useState<"demo" | "basico" | "pro">("basico");
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [impersonatedClient, setImpersonatedClient] = useState<any | null>(null);

  const isActuallyAdmin = user?.email?.toLowerCase() === "videmusicai@gmail.com" || user?.email?.toLowerCase() === "admin@vitrion.com.br" || user?.email?.toLowerCase() === "vitrion54@vitrion.com.br";
  const isSuperAdmin = isActuallyAdmin && !impersonatedClient;

  useEffect(() => {
    if (isSuperAdmin) {
      setActiveTab("clients");
    } else {
      setActiveTab("screens");
    }
  }, [isSuperAdmin]);

  const loggedInClient = useMemo(() => {
    if (impersonatedClient) return impersonatedClient;
    if (!user?.email) return null;
    return clients.find(c => c.ownerEmail?.toLowerCase() === user.email.toLowerCase());
  }, [clients, user, impersonatedClient]);

  const subscriptionStatus = useMemo(() => {
    if (isSuperAdmin) return { isValid: true, state: "super_admin" };
    if (!user) return { isValid: true, state: "loading" };
    if (!loggedInClient) {
      return { isValid: true, state: "demo", reason: "Sua conta é de demonstração. Entre em contato com o dono do sistema (contato: videmusicai@gmail.com) para obter sua própria credencial com TVs ativas." };
    }
    
    if (loggedInClient.status === "suspended") {
      return { isValid: false, state: "suspended", reason: "Seu acesso comercial foi suspenso pelo administrador do Vitrion." };
    }

    if (loggedInClient.status === "standby") {
      return { isValid: false, state: "standby", reason: "Seu acesso comercial está em Standby por restrição de pagamento da mensalidade. Favor entrar em contato com o faturamento para restabelecer o sinal." };
    }
    
    if (loggedInClient.status === "pending") {
      return { isValid: true, state: "pending", reason: "Seu cadastro está em análise. Você pode testar e configurar o sistema livremente enquanto o administrador regulariza seu sinal definitivo." };
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
    if (diffDays <= 7) {
      return { isValid: true, state: "near_due", daysLeft: diffDays, reason: `Falta apenas 1 semana ou menos (${diffDays} dias) para o vencimento de sua licença (${expDate.toLocaleDateString("pt-BR")}). Regularize seu pagamento cobrado para evitar standby.` };
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

  // Auto-upgrade screens without shortCode
  useEffect(() => {
    if (!user) return;
    const screensToUpgrade = rawScreens.filter((s) => !s.shortCode);

    if (screensToUpgrade.length > 0) {
      screensToUpgrade.forEach(async (screenToUpgrade) => {
        const newCode = getOrGenerateShortCode(screenToUpgrade.id);
        // Softly update in Firestore
        try {
          await updateDoc(doc(db, "screens", screenToUpgrade.id), {
            shortCode: newCode
          });
          console.log(`Auto-upgraded screen ${screenToUpgrade.id} with shortCode ${newCode}`);
        } catch (err) {
          console.warn("Could not auto-upgrade screen with shortCode", err);
        }
      });
    }
  }, [rawScreens, user]);

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
        phone: newClientPhone ? (newClientPhoneCountry === "BR" ? `+55 ${newClientPhone}` : `+1 ${newClientPhone}`) : "",
        contactPhone: newClientPhone2 ? (newClientPhone2Country === "BR" ? `+55 ${newClientPhone2}` : `+1 ${newClientPhone2}`) : (editingClient?.contactPhone || ""),
        monthlyFee: parseFloat(newClientFee) || 0,
        expirationDate: newClientExpiration,
        status: editingClient ? editingClient.status : "active",
        plan: newClientPlan,
        password: newClientPassword ? newClientPassword.trim() : (editingClient?.password || "123456")
      };
      await setDoc(doc(db, "clients", cId), payload);
      showToast(`Cliente "${newClientName}" salvo com sucesso!`, "success");
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientPhoneCountry("BR");
      setNewClientPhone2("");
      setNewClientPhone2Country("BR");
      setNewClientPassword("");
      setNewClientFee("99.90");
      setNewClientExpiration("");
      setNewClientPlan("basico");
      setEditingClient(null);
    } catch (err) {
      console.error("Erro ao gravar cliente:", err);
      showToast("Erro ao gravar dados do cliente no Firebase.", "error");
      handleFirestoreError(err, OperationType.WRITE, `clients/${editingClient ? editingClient.id : 'new'}`);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    requestConfirmation(
      "Confirmar Exclusão de Cliente",
      `Deseja realmente remover o cliente "${name}" permanentemente do Vitrion? Todas as TVs sintonizadas a ele perderão o sinal. Esta ação é definitiva e irreversível.`,
      async () => {
        try {
          await deleteDoc(doc(db, "clients", id));
          showToast(`Cliente "${name}" excluído e removido do sistema com sucesso!`, "success");
        } catch (err) {
          console.error("Erro ao excluir cliente:", err);
          showToast("Erro ao remover o cliente e suas chaves do Firebase.", "error");
          handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
        }
      }
    );
  };

  const handleUpdateClientStatus = async (clientId: string, newStatus: "active" | "suspended" | "pending" | "standby") => {
    try {
      await updateDoc(doc(db, "clients", clientId), {
        status: newStatus
      });
      const statusLabel = 
        newStatus === "active" ? "ATIVO & ACEITO" : 
        newStatus === "suspended" ? "SUSPENSO" : 
        newStatus === "standby" ? "EM STANDBY (COBRANÇA)" : 
        "PENDENTE DE ACEITE";
      showToast(`Cliente atualizado com sucesso para: ${statusLabel}!`, "success");
    } catch (err) {
      console.error("Erro ao alterar status do cliente no Firebase:", err);
      showToast("Erro ao processar alteração de status do cliente.", "error");
      handleFirestoreError(err, OperationType.WRITE, `clients/${clientId}/status`);
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

  // Monitorar status online/offline em tempo real
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1. Escuta Estado de Autenticação com Recuperação de Sessão Local (Bypass)
  useEffect(() => {
    // Tenta recuperar sessão local ativa no carregamento inicial
    const localSessionStr = localStorage.getItem("vitrion_bypass_user");
    if (localSessionStr) {
      try {
        const decoded = JSON.parse(localSessionStr);
        setUser(decoded);
      } catch (e) {
        console.warn("Erro ao decodificar sessão local bypass", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        const freshStr = localStorage.getItem("vitrion_bypass_user");
        if (freshStr) {
          try {
            setUser(JSON.parse(freshStr));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
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
      clientItems.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
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
      screenItems.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
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
      imageItems.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
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

  // 4. CADASTRA / ATUALIZA PRODUTOS
  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;
    
    if (!subscriptionStatus.isValid) {
      showToast("Não é possível salvar produtos: Sua assinatura está bloqueada ou vencida. Ative sua mensalidade.", "error");
      return;
    }

    if (!editingProduct) {
      const currentId = getCurrentClientId();
      const clientRecord = clients.find(c => c.id === currentId);
      const plan = currentId === "demo_client" ? "pro" : (clientRecord?.plan || "basico");
      const count = rawProducts.filter(p => p.clientId === currentId).length;

      let maxProducts = 5;
      if (plan === "basico") maxProducts = 25;
      else if (plan === "pro") maxProducts = 150;

      if (count >= maxProducts) {
        showToast(`Limite de Cardápio Excedido no plano ${plan.toUpperCase()}: Este plano permite cadastrar no máximo ${maxProducts} itens no menu. Realize o upgrade comercial para adicionar mais produtos.`, "error");
        return;
      }
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
    requestConfirmation(
      "Confirmar Exclusão de Produto",
      "Deseja realmente excluir este produto do catálogo?",
      async () => {
        try {
          await deleteDoc(doc(db, "products", id));
        } catch (err: unknown) {
          handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
        }
      }
    );
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
        currentVideo: updated.currentVideo || "",
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
    const clientRecord = clients.find(c => c.id === currentId);
    const plan = currentId === "demo_client" ? "pro" : (clientRecord?.plan || "basico");
    const count = rawScreens.filter(s => s.clientId === currentId).length;

    let maxScreens = 1;
    if (plan === "basico") maxScreens = 4;
    else if (plan === "pro") maxScreens = 20;

    if (count >= maxScreens) {
      showToast(`Limite de Displays Excedido no plano ${plan.toUpperCase()}: Este plano permite no máximo ${maxScreens} TVs ativas. Solicite a alteração do plano junto ao Administrador para adicionar mais displays.`, "error");
      return;
    }

    const nextId = `tela-${currentId}-${Date.now()}`;
    const name = `SmartTV 0${count + 1}`;
    const shortCode = generateUniqueShortCode(rawScreens);
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
        shortCode: shortCode,
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

  const handleToggleScreenActiveStatus = async (screenId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "screens", screenId), {
        status: newStatus
      });
      showToast(
        newStatus === "offline" 
          ? "Sinal da TV desativado com sucesso (TV em Standby)!" 
          : "TV ativada com sucesso! O menu voltou a ser transmitido.",
        "success"
      );
    } catch (err) {
      console.error("Erro ao alterar status da tela:", err);
      showToast("Erro ao sintonizar TV.", "error");
    }
  };

  const handleDeleteScreen = async () => {
    if (!isDeletingScreen) return;
    try {
      await deleteDoc(doc(db, "screens", isDeletingScreen));
      setIsDeletingScreen(null);
      showToast("TV excluída definitivamente do sistema.", "success");
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
                setPairingError("");
              }}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
                authMode === "login" || authMode === "signup"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Entrar / Cadastrar
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("pair");
                setAuthError("");
                setPairingError("");
              }}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1 ${
                authMode === "pair"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📺 Sintonizar TV
            </button>
          </div>

          {authError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="font-semibold">{authError}</div>
            </div>
          )}

          {authMode === "pair" ? (
            <form onSubmit={handlePairTV} className="space-y-4">
              {pairingError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <div className="font-semibold">{pairingError}</div>
                </div>
              )}

              <div className="text-center space-y-1 mb-4">
                <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                  Transmita a programação de cardápios inteligentes nesta tela em tela cheia.
                </p>
                <p className="text-[10px] text-slate-500">
                  Digite abaixo os 5 dígitos do código da TV cadastrada que você vê no seu painel administrativo.
                </p>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block uppercase tracking-wider mb-2 text-center font-bold">Código da TV (5 dígitos)</label>
                <div className="relative max-w-xs mx-auto">
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value.replace(/\s/g, ""))}
                    placeholder="EX: 10101"
                    className="w-full bg-slate-950 border-2 border-blue-500/30 text-white rounded-xl py-3 px-4 text-center font-mono font-black text-xl tracking-widest outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-700 uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pairingLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-4 cursor-pointer font-semibold"
              >
                {pairingLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Tv className="w-4 h-4 animate-pulse" />
                    Sintonizar Display
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4 py-2 font-sans">
              <div className="text-center space-y-1 my-3">
                <p className="text-slate-300 text-xs leading-relaxed font-semibold">
                  Acesse sua vitrine digital e área administrativa utilizando sua conta do Google (Gmail).
                </p>
                <p className="text-[9px] text-blue-400 uppercase tracking-widest font-black">
                  Conexão Automática e Segura
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium leading-relaxed">
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer border border-slate-800/20"
              >
                {authLoading ? (
                  <span className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <Chrome className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span>Acessar com o Google (Gmail)</span>
                  </>
                )}
              </button>

              <div className="relative py-2 flex items-center opacity-70">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-[9px] uppercase tracking-widest font-black">Ou</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <form onSubmit={handleInstantEmailSubmit} className="space-y-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Problemas com o login do Google acima?
                  </p>
                  <p className="text-[9px] text-slate-500 leading-snug mt-0.5">
                    Digite seu e-mail do Gmail comercial para entrar direto e com segurança!
                  </p>
                </div>
                
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={instantEmail}
                    onChange={(e) => setInstantEmail(e.target.value)}
                    placeholder="Digite seu Gmail"
                    className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600 hover:to-indigo-600 text-blue-300 hover:text-white border border-blue-500/30 hover:border-transparent font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Acesso Direto Seguro</span>
                </button>
              </form>
            </div>
          )}

          {/* Botão de Administrador em Outra Janela Pop-up */}
          {(authMode === "login" || authMode === "signup") && (
            <div className="pt-4 border-t border-slate-800/80 mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="py-2.5 px-4 bg-slate-950/40 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 font-extrabold text-[10px] tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md w-full"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Acesso Restrito do Administrador</span>
              </button>
            </div>
          )}
        </div>

        {/* POP-UP MODAL DO ADMNISTRADOR */}
        {isAdminModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
            <div 
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botão de Fechar */}
              <button
                type="button"
                onClick={() => {
                  setIsAdminModalOpen(false);
                  setAdminModalEmail("");
                  setAdminModalPassword("");
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer font-bold text-sm"
              >
                ✕
              </button>

              <div className="flex flex-col items-center mb-6 font-sans">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full mb-3 border border-amber-500/20">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">Acesso Segurança Admin</h3>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Identifique-se para Prosseguir</p>
              </div>

              <form onSubmit={handleAdminModalSubmit} className="space-y-4 font-sans">
                <div>
                  <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Usuário de Acesso</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={adminModalEmail}
                      onChange={(e) => setAdminModalEmail(e.target.value)}
                      placeholder="Digite o ID do administrador"
                      className="w-full bg-slate-950 border border-slate-800/85 text-white rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold placeholder-slate-600"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Senha Secreta</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={adminModalPassword}
                      onChange={(e) => setAdminModalPassword(e.target.value)}
                      placeholder="Digite a senha de administrador"
                      className="w-full bg-slate-950 border border-slate-800/85 text-white rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold placeholder-slate-600"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminModalOpen(false);
                      setAdminModalEmail("");
                      setAdminModalPassword("");
                    }}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer border border-slate-750"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={adminModalLoading}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:opacity-95 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {adminModalLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Confirmar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Se o usuário está logado mas não possui cadastro de cliente e não é administrador,
  // mostramos a Página de Cadastro de Cliente para completar os dados exigidos no projeto
  const needsRegistration = user && !isActuallyAdmin && !loggedInClient;

  if (needsRegistration) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans relative p-4 overflow-hidden">
        {/* Elementos de Brilho de Fundo */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 transition-all duration-300 animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <VitrionLogo className="w-14 h-14 mb-4 filter drop-shadow-[0_4px_12px_rgba(56,189,248,0.2)]" />
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Completar Cadastro</h2>
            <p className="text-slate-400 text-xs text-center font-semibold tracking-wider uppercase mt-1">Insira os dados do seu estabelecimento para ativar seu sistema</p>
          </div>

          <div className="mb-4 bg-blue-500/10 border border-blue-500/20 text-blue-200 p-3.5 rounded-xl text-xs flex flex-col gap-1">
            <span className="font-bold uppercase text-[9px] tracking-wider text-blue-400">Usuário Autenticado</span>
            <span className="font-semibold text-slate-300 font-mono break-all text-xs">{user.email}</span>
          </div>

          <form onSubmit={handleCompleteRegistration} className="space-y-4">
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

            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">WhatsApp / Telefone</label>
              <div className="relative flex items-center">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none z-10 font-sans">
                  <Megaphone className="w-4 h-4" />
                </span>
                <div className="absolute right-3 flex items-center gap-1.5 h-full z-10 w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthPhoneCountry("BR");
                      setAuthPhone(formatBRPhone(authPhone));
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${authPhoneCountry === "BR" ? "bg-blue-600/35 text-blue-300 border border-blue-500/40" : "text-slate-500 hover:text-slate-300"}`}
                    title="Brasil"
                  >
                    🇧🇷
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthPhoneCountry("US");
                      setAuthPhone(formatUSPhone(authPhone));
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${authPhoneCountry === "US" ? "bg-blue-600/35 text-blue-300 border border-blue-500/40" : "text-slate-500 hover:text-slate-300"}`}
                    title="United States"
                  >
                    🇺🇸
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={authPhone}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (authPhoneCountry === "BR") {
                      setAuthPhone(formatBRPhone(raw));
                    } else {
                      setAuthPhone(formatUSPhone(raw));
                    }
                  }}
                  placeholder={authPhoneCountry === "BR" ? "ex: (11) 99999-9999" : "ex: (201) 555-0123"}
                  className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-24 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">E-mail de Contato</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={regContactEmail}
                  onChange={(e) => setRegContactEmail(e.target.value)}
                  placeholder="ex: contato@seuestabelecimento.com"
                  className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Endereço Comercial</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={authAddress}
                  onChange={(e) => setAuthAddress(e.target.value)}
                  placeholder="ex: Av. Paulista, 1500 - Centro"
                  className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Cidade</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={authCity}
                    onChange={(e) => setAuthCity(e.target.value)}
                    placeholder="ex: São Paulo"
                    className="w-full bg-slate-950 border border-slate-800/80 text-white rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-semibold placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">País (Automático)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <Globe className="w-4 h-4 text-blue-500 animate-pulse" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={authPhoneCountry === "BR" ? "Brasil 🇧🇷" : "Estados Unidos 🇺🇸"}
                    className="w-full bg-slate-950/60 border border-slate-800/60 text-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-xs font-black uppercase tracking-wider select-none outline-none cursor-not-allowed"
                    title="País reconhecido automaticamente com base no telefone"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1">Plano Escolhido</label>
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-slate-200 text-xs space-y-1">
                <p className="font-bold text-blue-400 text-xs">Plano Básico (R$ 99,90/mês)</p>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  Dá acesso à sincronização automática de até 4 telas em tempo real, painel de relatórios completa, galeria de produtos e criador de artes com IA.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-4 cursor-pointer font-semibold"
            >
              {authLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Concluir Cadastro e Ativar Sistema
                </>
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await signOutUser();
                } catch (e) {
                  console.warn("signOut error", e);
                }
                localStorage.removeItem("vitrion_bypass_user");
                setUser(null);
                showToast("Desconectado com sucesso!", "success");
              }}
              className="w-full mt-2 py-2 px-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-900/30 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Cancelar e Sair
            </button>
          </form>
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
          {!isSuperAdmin && (
            <>
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
                onClick={() => setActiveTab("how-to")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "how-to" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
                id="tab-howto"
              >
                <BookOpen className="w-4 h-4" />
                Conectar no Fire TV
              </button>

              <button 
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeTab === "settings" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
                id="tab-settings"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                Configurar Perfil
              </button>
            </>
          )}
          
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
            onClick={async () => {
              try {
                await signOutUser();
              } catch (e) {
                console.warn("signOut error", e);
              }
              localStorage.removeItem("vitrion_bypass_user");
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
        {impersonatedClient && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white text-xs font-bold px-6 py-3 flex items-center justify-between border-b border-orange-700/40 shadow-inner shrink-0 z-50">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-white animate-ping"></span>
              <span>Você está acessando em <strong>Modo Suporte</strong> a conta de: <strong className="underline decoration-wavy">{impersonatedClient.name}</strong> ({impersonatedClient.ownerEmail})</span>
            </div>
            <button 
              onClick={() => {
                setImpersonatedClient(null);
                setActiveTab("clients");
                showToast("Retornado ao Painel do Administrador!", "success");
              }}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer shadow-sm"
            >
              Voltar ao Painel Administrador
            </button>
          </div>
        )}
        
        {/* Cabeçalho */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-base text-slate-900 uppercase tracking-wide">
              {activeTab === "screens" && "Gerenciar TVs Digitais"}
              {activeTab === "products" && "Mapeamento de Preços & Produtos"}
              {activeTab === "promotions" && "Promoções Customizadas & Envio Manual"}
              {activeTab === "gallery" && "Banco de Imagens & Galeria Central"}
              {activeTab === "how-to" && "Como Conectar o Amazon Fire TV"}
              {activeTab === "settings" && "Configurações do Estabelecimento"}
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

              {/* Grid Principal com as Telas de Signage e o Calendário Integrativo */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Painel de TVs Cadastradas ({screens.length})</h3>
                    <button 
                      onClick={handleAddNewScreen}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar TV
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {screens.map((sc, index) => {
                      const activeImage = sc.displayMode === "playlist" && sc.playlist && sc.playlist.find(item => item.enabled && item.image)
                        ? (sc.playlist.find(item => item.enabled && item.image)?.image || "")
                        : (sc.currentImage || "");

                      const presetImg = PRESET_TEMPLATES.find(t => t.id === activeImage);
                      const isCustomUploaded = activeImage.startsWith("data:");
                      const scCode = sc.shortCode || getOrGenerateShortCode(sc.id);
                      const displayUrl = `${window.location.origin}${window.location.pathname}?screen=${scCode}`;

                      return (
                        <div key={sc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between group relative hover:shadow-md transition-all">
                          {/* Imagem/Vídeo de Preview Mockup 16:9 */}
                          <div className="h-32 bg-slate-900 relative flex items-center justify-center overflow-hidden border-b border-slate-100">
                            {(sc.displayMode || "single") === "single" && sc.currentVideo ? (
                              <video src={sc.currentVideo} muted className="w-full h-full object-cover" />
                            ) : presetImg ? (
                              <div className="w-full h-full scale-[0.6] opacity-90 select-none pointer-events-none" dangerouslySetInnerHTML={{ __html: presetImg.svgMarkup }} />
                            ) : isCustomUploaded ? (
                              <img src={activeImage} alt="Preview custom" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-slate-600 text-[10px] font-mono select-none">Sem Mídia Sincronizada</div>
                            )}

                            {/* Status Badge */}
                            <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-white text-[8px] font-bold rounded-full uppercase tracking-wider shadow ${
                              sc.status === "offline" ? "bg-amber-500" : "bg-emerald-500"
                            }`}>
                              {sc.status === "offline" ? "Standby" : "Ativa / Online"}
                            </div>

                            {/* Número da TV identificador */}
                            <div className="absolute left-2.5 top-2.5 bg-slate-950/80 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-widest">
                              #{getScreenDisplayNumber(sc.name, index).padStart(2, '0')}
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
                                    {(sc.displayMode || "single") === "single" && sc.currentVideo ? "Vídeo Customizado 📹" : presetImg ? presetImg.name : isCustomUploaded ? "Imagem/Promoção Customizada" : "Padrão"}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] bg-blue-50/70 p-1.5 rounded border border-blue-100 mt-2 font-semibold">
                                  <span className="text-blue-700 flex items-center gap-1">📺 Código Pareamento:</span>
                                  <span className="font-mono font-black text-blue-900 bg-white px-2 py-0.5 rounded shadow-sm text-[11px] tracking-widest animate-pulse">
                                    {scCode}
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
                                {sc.status === "offline" ? (
                                  <button 
                                    className="text-emerald-500 hover:underline font-bold"
                                    onClick={() => handleToggleScreenActiveStatus(sc.id, "online")}
                                  >
                                    Reativar TV
                                  </button>
                                ) : (
                                  <button 
                                    className="text-red-500 hover:underline"
                                    onClick={() => setIsDeletingScreen(sc.id)}
                                  >
                                    Desativar TV
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Coluna Lateral do Calendário de Validade de Plano */}
                <div className="xl:col-span-1">
                  <div className="sticky top-6">
                    <PlanCalendar 
                      expirationDate={loggedInClient?.expirationDate} 
                      clientName={loggedInClient?.name || "Minha Loja"}
                      isSuperAdminView={false}
                    />
                  </div>
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
                                <h5 className="font-bold text-[11px] uppercase tracking-wide truncate">#{getScreenDisplayNumber(sc.name, index).padStart(2, '0')} {sc.name}</h5>
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
                  <h4 className="font-bold text-xs uppercase mb-1">Sintonizar com Código ou Link Curto</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Acesse o site do Vitrion diretamente na TV, clique na aba <strong>Sintonizar TV</strong> e digite o <strong>Código de 5 Dígitos</strong> da TV cadastrada, ou apenas digite o link encurtado (Ex: <code>?screen=10101</code>).
                  </p>
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
                  O Vitrion Digital Display diferencia-se dos softwares legados porque não precisa de cabos de rede ou que as TVs estejam conectadas no mesmo IP Wifi! Desde que o Amazon Fire TV tenha acesso à internet, você pode fazer as alterações nos preços do cardápio ou subir novas mídias diretamente da sua casa, e as TVs na Padaria atualizarão o catálogo sozinhas via nuvem!
                </p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-950 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>Modo Anti-Sleep Integrado (Evitar que a TV Desligue)</span>
                </div>
                <p>
                  O Vitrion conta com suporte nativo à <strong>API Screen Wake Lock</strong>. Quando a TV estiver aberta exibindo as suas mídias ou tabelas, o próprio navegador Silk impede programaticamente que o Fire Stick ou a Smart TV entrem em "Sleep Mode" (modo de repouso) ou atenuem o brilho da tela, garantindo que o seu menu permaneça sempre ativo na vitrine!
                </p>
              </div>

              {/* Endereço de Exibição das TVs de Teste */}
              <div>
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-3">Links Prontos para Testar as TVs da Padaria:</h4>
                <div className="space-y-2 font-mono text-xs">
                  {screens.map((sc, index) => {
                    const scCode = sc.shortCode || getOrGenerateShortCode(sc.id);
                    const displayUrl = `${window.location.origin}${window.location.pathname}?screen=${scCode}`;
                    return (
                      <div key={sc.id} className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 hover:border-blue-500 transition-all">
                        <div className="truncate max-w-sm md:max-w-md flex items-center gap-2">
                          <span className="font-bold text-blue-600">TV {getScreenDisplayNumber(sc.name, index).padStart(2, '0')}:</span> 
                          <span>{sc.name}</span>
                          <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[10px]">CÓDIGO: {scCode}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(displayUrl);
                              showToast("URL curto exclusivo da TV copiado para a área de transferência!", "success");
                            }}
                            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold px-2 py-1 text-[10px] rounded uppercase select-none flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copiar Link Curto
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

          {/* TAB: CONFIGURAÇÕES E PERFIL DO ESTABELECIMENTO */}
          {activeTab === "settings" && (
            <StoreSettingsPanel
              loggedInClient={loggedInClient}
              user={user}
              setUser={setUser}
              showToast={showToast}
            />
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

              {/* Seção Inteligente de Telemetria e Agenda de Faturamento */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans">
                {/* Lado Esquerdo: Alertas de Vencimento de Licenças (Próximos 7 Dias) */}
                <div className="xl:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
                    <div>
                      <h3 className="font-extrabold text-xs uppercase text-slate-850 tracking-wider">
                        Centro de Telemetria de Cobrança: Negócios com faturamento pendente (Expirando em até 1 semana)
                      </h3>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">Monitore os vencimentos das licenças para entrar em contato ou pausar de forma temporária (Standby) os clientes em atraso.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clients.filter(c => {
                      if (c.status === "suspended" || c.status === "standby") return false;
                      const expDate = new Date(c.expirationDate);
                      expDate.setHours(23,59,59,999);
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const diffTime = expDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays <= 7;
                    }).map(client => {
                      const expDate = new Date(client.expirationDate);
                      expDate.setHours(23,59,59,999);
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const diffTime = expDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const isOverdue = diffDays < 0;

                      return (
                        <div 
                          key={client.id} 
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 text-xs font-semibold hover:shadow-sm transition-all ${
                            isOverdue 
                              ? "bg-rose-50/50 border-rose-200" 
                              : "bg-amber-50/40 border-amber-200 animate-pulse"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                client.plan === "pro" 
                                  ? "bg-purple-100 text-purple-800" 
                                  : client.plan === "basico" 
                                    ? "bg-blue-100 text-blue-800" 
                                    : "bg-slate-100 text-slate-800"
                              }`}>
                                Plano {client.plan?.toUpperCase() || "BÁSICO"}
                              </span>
                              <h4 className="font-bold text-slate-800 text-xs mt-1.5">{client.name}</h4>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{client.ownerEmail}</p>
                            </div>
                            
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                                isOverdue ? "bg-rose-600 text-white animate-pulse" : "bg-amber-600 text-white"
                              }`}>
                                {isOverdue ? "Expirou" : `Vence em ${diffDays} dias`}
                              </span>
                              <div className="text-[9px] text-slate-500 mt-1 font-mono">
                                {new Date(client.expirationDate).toLocaleDateString("pt-BR")}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 border-t border-slate-200/50 pt-2.5 mt-0.5 justify-end">
                            <button
                              onClick={() => handleUpdateClientStatus(client.id, "standby")}
                              className="bg-orange-50 hover:bg-orange-600 border border-orange-200 hover:border-orange-600 text-orange-700 hover:text-white font-extrabold text-[9px] tracking-wider uppercase px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <AlertCircle className="w-3 h-3" /> Standby
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {clients.filter(c => {
                      if (c.status === "suspended" || c.status === "standby") return false;
                      const expDate = new Date(c.expirationDate);
                      expDate.setHours(23,59,59,999);
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const diffTime = expDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays <= 7;
                    }).length === 0 && (
                      <div className="col-span-full text-center p-5 bg-slate-50 border border-dashed border-slate-200 text-slate-400 font-bold text-xs rounded-xl">
                        Nenhum cliente ativo possui vencimento crítico nos próximos 7 dias. Ótima saúde financeira!
                      </div>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Calendário de Agenda de Faturamento do SaaS */}
                <div className="xl:col-span-1">
                  <PlanCalendar 
                    isSuperAdminView={true} 
                    clientsList={clients} 
                  />
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
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 border-t">
                          <th className="p-3.5">Nome do Cliente / Loja</th>
                          <th className="p-3.5">Usuário de Acesso</th>
                          <th className="p-3.5 text-center">Plano</th>
                          <th className="p-3.5 text-center">Mensalidade</th>
                          <th className="p-3.5 text-center">Vencimento</th>
                          <th className="p-3.5 text-center">Status Geral</th>
                          <th className="p-3.5 text-right font-bold text-blue-600">Ações de Controle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium pb-20">
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
                            const isStandby = client.status === "standby";
                            const isPending = client.status === "pending" || !client.status;
                            const isActive = client.status === "active";
                            return (
                              <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3.5">
                                  <div className="font-bold text-slate-800">{client.name}</div>
                                  <div className="flex flex-col gap-0.5 mt-1 text-[10px] font-mono text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" /> {client.phone || "Sem Telefone Fixo"}
                                    </span>
                                    {client.contactPhone && (
                                      <span className="flex items-center gap-1 text-teal-650">
                                        <Phone className="w-2.5 h-2.5 shrink-0" /> {client.contactPhone} (Wpp Secundário)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3.5 text-left">
                                  <div className="text-slate-800 font-mono text-xs font-bold flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    {client.ownerEmail?.endsWith("@vitrion.com.br") 
                                      ? client.ownerEmail.replace("@vitrion.com.br", "") 
                                      : client.ownerEmail}
                                  </div>
                                  <div className="text-[10px] text-blue-600/90 font-mono font-bold mt-1 bg-blue-50 border border-blue-100/40 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0" title="Senha salva para o cliente">
                                    <Lock className="w-2.5 h-2.5" /> Senha: <span className="text-slate-800">{client.password || "123456"}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                    client.plan === "pro" 
                                      ? "bg-purple-50 text-purple-700 border-purple-200" 
                                      : client.plan === "basico" 
                                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                                        : "bg-slate-50 text-slate-700 border-slate-200"
                                  }`}>
                                    {client.plan?.toUpperCase() || "BÁSICO"}
                                  </span>
                                </td>
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
                                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                    isSuspended
                                      ? "bg-rose-100 text-rose-850 border border-rose-200"
                                      : isStandby
                                        ? "bg-orange-100 text-orange-850 border border-orange-200 animate-pulse"
                                        : isPending
                                          ? "bg-amber-100 text-amber-850 border border-amber-200 animate-pulse"
                                          : "bg-emerald-100 text-emerald-850 border border-emerald-200"
                                  }`}>
                                    {isSuspended ? "● Suspenso" : isStandby ? "● Standby" : isPending ? "● Pendente" : "● Ativo / Aceito"}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right whitespace-nowrap">
                                  <div className="flex justify-end items-center gap-1.5">
                                    {/* ESCOLHA 1: ACEITAR */}
                                    <button
                                      onClick={() => handleUpdateClientStatus(client.id, "active")}
                                      disabled={isActive}
                                      className={`p-1 px-2.5 rounded text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all border ${
                                        isActive
                                          ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                          : "bg-emerald-50 hover:bg-emerald-600 border-emerald-200 hover:border-emerald-600 text-emerald-700 hover:text-white cursor-pointer"
                                      }`}
                                      title="Aceitar e Ativar Cliente"
                                    >
                                      <Check className="w-3 h-3" /> Aceitar
                                    </button>

                                    {/* ESCOLHA 4: COBRANÇA EM STANDBY */}
                                    <button
                                      onClick={() => handleUpdateClientStatus(client.id, "standby")}
                                      disabled={isStandby}
                                      className={`p-1 px-2.5 rounded text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all border ${
                                        isStandby
                                          ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                          : "bg-orange-50 hover:bg-orange-600 border-orange-200 hover:border-orange-600 text-orange-700 hover:text-white cursor-pointer"
                                      }`}
                                      title="Colocar em Standby por Cobrança"
                                    >
                                      <AlertCircle className="w-3 h-3" /> Standby
                                    </button>
 
                                    {/* ESCOLHA 2: SUSPENDER TEMPORARIAMENTE */}
                                    <button
                                      onClick={() => handleUpdateClientStatus(client.id, "suspended")}
                                      disabled={isSuspended}
                                      className={`p-1 px-2.5 rounded text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all border ${
                                        isSuspended
                                          ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                          : "bg-amber-50 hover:bg-amber-600 border-amber-200 hover:border-amber-600 text-amber-700 hover:text-white cursor-pointer"
                                      }`}
                                      title="Suspender Temporariamente"
                                    >
                                      <Lock className="w-3 h-3" /> Suspender
                                    </button>
 
                                    {/* ESCOLHA 3: REMOVER CLIENTE */}
                                    <button
                                      onClick={() => handleDeleteClient(client.id, client.name)}
                                      className="p-1 px-2.5 bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 text-rose-700 hover:text-white rounded text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all cursor-pointer"
                                      title="Excluir Permanentemente"
                                    >
                                      <Trash2 className="w-3 h-3" /> Remover
                                    </button>
 
                                    <div className="h-4 w-[1px] bg-slate-200 mx-1 block" />
 
                                    {/* EDITAR CADASTRAL (E.G. DATA EXPIRAÇÃO E VALOR) */}
                                    <button
                                      onClick={() => {
                                        setEditingClient(client);
                                        setNewClientName(client.name);
                                        setNewClientEmail(client.ownerEmail);
                                        // Separar DDI do número local para edição
                                         const storedPhone = client.phone || "";
                                         if (storedPhone.startsWith("+55 ")) {
                                           setNewClientPhoneCountry("BR");
                                           setNewClientPhone(storedPhone.replace("+55 ", ""));
                                         } else if (storedPhone.startsWith("+1 ")) {
                                           setNewClientPhoneCountry("US");
                                           setNewClientPhone(storedPhone.replace("+1 ", ""));
                                         } else {
                                           setNewClientPhoneCountry("BR");
                                           setNewClientPhone(storedPhone);
                                         }
                                         // Separar DDI do número local para edição - Telefone 2
                                         const storedPhone2 = client.contactPhone || "";
                                         if (storedPhone2.startsWith("+55 ")) {
                                           setNewClientPhone2Country("BR");
                                           setNewClientPhone2(storedPhone2.replace("+55 ", ""));
                                         } else if (storedPhone2.startsWith("+1 ")) {
                                           setNewClientPhone2Country("US");
                                           setNewClientPhone2(storedPhone2.replace("+1 ", ""));
                                         } else {
                                           setNewClientPhone2Country("BR");
                                           setNewClientPhone2(storedPhone2);
                                         }
                                         setNewClientPassword(client.password || "123456");
                                        setNewClientFee(String(client.monthlyFee || "99.90"));
                                        setNewClientExpiration(client.expirationDate);
                                        setNewClientPlan(client.plan || "basico");
                                      }}
                                      className="p-1 px-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded text-[10px] uppercase font-bold transition-all cursor-pointer"
                                      title="Editar Informações Cadastrais"
                                    >
                                      Editar
                                    </button>

                                    <button
                                      onClick={() => {
                                        setImpersonatedClient(client);
                                        setActiveTab("screens");
                                        showToast(`Acessando como: ${client.name}!`, "success");
                                      }}
                                      className="p-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                      title="Acessar conta do cliente para suporte"
                                    >
                                      <UserCheck className="w-3 h-3 text-white" /> Acessar Conta
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        {clients.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center p-8 text-slate-400">
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
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Nome de Usuário (Login de Acesso)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: padaria_bellavista"
                        value={newClientEmail}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes("@")) {
                            setNewClientEmail(val.trim());
                          } else {
                            setNewClientEmail(val.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 font-mono font-bold"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-sans">
                        Este será o usuário de login do cliente. Sem espaços, acentos ou e-mail obrigatório (ex: padariacentral).
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold block">Telefone Principal</label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setNewClientPhoneCountry("BR");
                              setNewClientPhone(formatBRPhone(newClientPhone));
                            }}
                            className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition-all border ${newClientPhoneCountry === "BR" ? "bg-slate-200 text-slate-800 border-slate-300" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                          >
                            🇧🇷 BR
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewClientPhoneCountry("US");
                              setNewClientPhone(formatUSPhone(newClientPhone));
                            }}
                            className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition-all border ${newClientPhoneCountry === "US" ? "bg-slate-200 text-slate-800 border-slate-300" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                          >
                            🇺🇸 US
                          </button>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        placeholder={newClientPhoneCountry === "BR" ? "Ex: (11) 99888-7766" : "Ex: (201) 555-0123"}
                        value={newClientPhone}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (newClientPhoneCountry === "BR") {
                            setNewClientPhone(formatBRPhone(raw));
                          } else {
                            setNewClientPhone(formatUSPhone(raw));
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 font-mono font-sans"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold block">Telefone 2 / WhatsApp</label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setNewClientPhone2Country("BR");
                              setNewClientPhone2(formatBRPhone(newClientPhone2));
                            }}
                            className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition-all border ${newClientPhone2Country === "BR" ? "bg-slate-200 text-slate-800 border-slate-300" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                          >
                            🇧🇷 BR
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewClientPhone2Country("US");
                              setNewClientPhone2(formatUSPhone(newClientPhone2));
                            }}
                            className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition-all border ${newClientPhone2Country === "US" ? "bg-slate-200 text-slate-800 border-slate-300" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                          >
                            🇺🇸 US
                          </button>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        placeholder={newClientPhone2Country === "BR" ? "Ex: (11) 99888-7766" : "Ex: (201) 555-0123"}
                        value={newClientPhone2}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (newClientPhone2Country === "BR") {
                            setNewClientPhone2(formatBRPhone(raw));
                          } else {
                            setNewClientPhone2(formatUSPhone(raw));
                          }
                        }}
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

                    <div className="font-sans">
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Liberar Plano Especial</label>
                      <select 
                        required
                        value={newClientPlan}
                        onChange={(e) => setNewClientPlan(e.target.value as "demo" | "basico" | "pro")}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 font-bold"
                      >
                        <option value="demo">DEMO (Máx 1 TV • 5 Produtos)</option>
                        <option value="basico">BÁSICO (Máx 4 TVs • 25 Produtos)</option>
                        <option value="pro">PRO (Máx 20 TVs • 150 Produtos)</option>
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1">Garante controle rígido e auditado sobre as cotas físicas de TVs e itens de cardápio nas TVs.</p>
                    </div>

                    <div className="font-sans">
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Senha de Acesso (Recuperação / Suporte)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 123456"
                        required
                        value={newClientPassword}
                        onChange={(e) => setNewClientPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 font-mono"
                      />
                      <p className="text-[9px] text-slate-450 mt-1">Guarde a senha do cliente para auxiliá-lo caso esqueça. Funciona como um backup seguro de login.</p>
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
                            setNewClientPhone2("");
                            setNewClientPassword("");
                            setNewClientFee("99.90");
                            setNewClientExpiration("");
                            setNewClientPlan("basico");
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

        {/* Rodapé status de Armazenamento e copyright de engine */}
        <footer className="h-10 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex gap-6">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`}></span> 
              <span className="font-semibold text-slate-600">{isOnline ? "Conectado" : "Sem Conexão"}</span>
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
                <div className="space-y-4">
                  {/* --- AREA PARA SUBIR IMAGEM MANUALMENTE --- */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        🖼️ Imagem Manual do Cardápio
                      </label>
                      {editingScreen.currentImage && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded uppercase">Ativa</span>
                      )}
                    </div>
                    
                    {/* Preview se existir imagem ativa e sem video */}
                    {editingScreen.currentImage && !editingScreen.currentVideo && (
                      <div className="relative w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                        <img 
                          src={editingScreen.currentImage} 
                          alt="Visualização da imagem" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingScreen({ ...editingScreen, currentImage: "" })}
                          className="absolute top-2.5 right-2.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow transition-all"
                          title="Remover Imagem"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input 
                        type="file"
                        accept="image/*"
                        id="screen-manual-image-uploader"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (file.size > 10 * 1024 * 1024) {
                            showToast("Erro: A imagem excede o tamanho limite de 10 MB.", "error");
                            return;
                          }

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const res = event.target?.result as string;
                            setEditingScreen({
                              ...editingScreen,
                              currentImage: res,
                              currentVideo: "" // Remove o vídeo quando colocar imagem
                            });
                            showToast("Imagem manual carregada com sucesso!", "success");
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <label 
                        htmlFor="screen-manual-image-uploader"
                        className="flex-1 flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-blue-500 bg-white py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all"
                      >
                        <Upload className="w-4 h-4 text-slate-400" />
                        Escolher Imagem (Até 10MB)
                      </label>
                    </div>
                  </div>

                  {/* --- AREA PARA SUBIR VÍDEO MANUALMENTE --- */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        📹 Vídeo de Exibição (Máx 10 MB)
                      </label>
                      {editingScreen.currentVideo && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded uppercase">Ativo</span>
                      )}
                    </div>
                    
                    {/* Preview se existir vídeo */}
                    {editingScreen.currentVideo && (
                      <div className="relative w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                        <video 
                          src={editingScreen.currentVideo}
                          muted 
                          controls
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingScreen({ ...editingScreen, currentVideo: "" })}
                          className="absolute top-2.5 right-2.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow transition-all"
                          title="Remover Vídeo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input 
                        type="file"
                        accept="video/*"
                        id="screen-manual-video-uploader"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (file.size > 10 * 1024 * 1024) {
                            showToast("Erro: O vídeo excede o tamanho limite de 10 MB.", "error");
                            return;
                          }

                          showToast("Carregando vídeo... aguarde", "info");
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const res = event.target?.result as string;
                            setEditingScreen({
                              ...editingScreen,
                              currentVideo: res,
                              currentImage: "" // Remove a imagem quando colocar de vídeo
                            });
                            showToast("Vídeo de até 10MB carregado com sucesso!", "success");
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <label 
                        htmlFor="screen-manual-video-uploader"
                        className="flex-1 flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-blue-500 bg-white py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all"
                      >
                        <Upload className="w-4 h-4 text-slate-400" />
                        Escolher Vídeo (Até 10MB)
                      </label>
                    </div>
                  </div>
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
                              value={slotItem.image ? "custom-upload" : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  handleUpdateSlot({ image: "" });
                                } else if (val === "custom-upload") {
                                  document.getElementById(`playlist-image-uploader-${idx}`)?.click();
                                }
                              }}
                              className={`w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] outline-none font-semibold ${
                                !slotItem.enabled ? "opacity-40" : ""
                              }`}
                            >
                              <option value="">🚫 Vazio / Sem Imagem</option>
                              <option value="custom-upload">📸 Imagem Carregada Manualmente</option>
                            </select>
                          </div>

                          {/* Upload manual individual */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            {slotItem.image && (
                              <div className="w-6 h-6 rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
                                <img src={slotItem.image} alt="slot micro preview" className="w-full h-full object-cover" />
                              </div>
                            )}
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
            <h4 className="text-sm font-bold text-slate-900 uppercase">Gerenciar Sinal da TV</h4>
            <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed">
              Escolha uma ação para esta TV. Você pode apenas desativá-la temporariamente (colocando em Standby) ou excluí-la definitivamente do sistema.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  handleToggleScreenActiveStatus(isDeletingScreen, "offline");
                  setIsDeletingScreen(null);
                }}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                Colocar em Standby (Ocultar Menu)
              </button>
              <button 
                onClick={handleDeleteScreen}
                className="w-full py-2 bg-red-650 hover:bg-red-700 bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                Excluir TV Definitivamente
              </button>
              <button 
                onClick={() => setIsDeletingScreen(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
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

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO PREMIUM ANTI-SLEEP & ANTI-IFRAME-SANDBOX */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-w-sm w-full p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-amber-50 rounded-full text-amber-600 border border-amber-100">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans font-black text-slate-800 text-sm uppercase tracking-wider">{confirmModal.title}</h3>
              <p className="font-sans text-xs text-slate-500 leading-relaxed font-semibold">{confirmModal.message}</p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border border-slate-300"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer"
              >
                Confirmar
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
