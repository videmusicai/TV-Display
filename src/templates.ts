/**
 * Vitrion Digital Display - Presets de Templates de Menu Board (Estilo Digital Signage)
 * Projetados com alta densidade visual e alinhados com o tema de Padaria.
 */

export interface MenuTemplate {
  id: string;
  name: string;
  category: string;
  backgroundColor: string;
  accentColor: string;
  svgMarkup: string;
}

export const PRESET_TEMPLATES: MenuTemplate[] = [
  {
    id: "chalk-bakery",
    name: "Quadro Negro - Pães Artesanais",
    category: "Padaria",
    backgroundColor: "#1e293b",
    accentColor: "#f59e0b",
    svgMarkup: `<svg viewBox="0 0 1024 576" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="576" fill="#0f172a" />
      <rect x="20" y="20" width="984" height="536" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="10,5" opacity="0.15" />
      <rect x="25" y="25" width="974" height="526" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.4" />
      
      <!-- Desenhos de trigo sutil / decorações rústicas -->
      <path d="M 50 120 C 60 90, 80 90, 90 120 M 60 110 C 70 80, 90 80, 100 110" stroke="#f59e0b" stroke-width="1.5" fill="none" opacity="0.3" />
      <path d="M 974 120 C 964 90, 944 90, 934 120" stroke="#f59e0b" stroke-width="1.5" fill="none" opacity="0.3" />
      
      <!-- Cabeçalho -->
      <text x="512" y="90" text-anchor="middle" fill="#f8fafc" font-family="'Georgia', serif" font-size="38" font-weight="950" letter-spacing="4">PADARIA ARTESANAL</text>
      <text x="512" y="125" text-anchor="middle" fill="#f59e0b" font-family="'Courier New', monospace" font-size="14" font-weight="bold" letter-spacing="6">FORNADAS REALIZADAS DE HORA EM HORA</text>
      
      <!-- Divisória -->
      <line x1="200" y1="145" x2="824" y2="145" stroke="#f59e0b" stroke-width="2" opacity="0.5" />
      <circle cx="512" cy="145" r="5" fill="#f59e0b" />
      
      <!-- Rodapé informativo -->
      <rect x="150" y="495" width="724" height="40" rx="20" fill="#1e293b" opacity="0.8" />
      <text x="512" y="520" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12" font-weight="600">Peça também pelo nosso aplicativo de delivery • Produtos frescos diariamente</text>
    </svg>`
  },
  {
    id: "pastel-sweet",
    name: "Doce Charme - Confeitaria & Tortas",
    category: "Doce",
    backgroundColor: "#fdf2f8",
    accentColor: "#db2777",
    svgMarkup: `<svg viewBox="0 0 1024 576" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="576" fill="#fdf2f8" />
      <!-- Círculos decorativos sutil de fundo -->
      <circle cx="950" cy="50" r="150" fill="#fbcfe8" opacity="0.2" />
      <circle cx="50" cy="500" r="200" fill="#fbcfe8" opacity="0.15" />
      
      <rect x="30" y="30" width="964" height="516" fill="none" stroke="#db2777" stroke-width="2" rx="10" opacity="0.2" />
      
      <!-- Título Confeitaria -->
      <text x="512" y="100" text-anchor="middle" fill="#db2777" font-family="'Georgia', serif" font-size="42" font-style="italic" font-weight="bold">Delícias da Confeitaria</text>
      <text x="512" y="135" text-anchor="middle" fill="#be185d" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="3">FINEST SWEETS &amp; GOURMET CAKES</text>
      
      <line x1="300" y1="155" x2="724" y2="155" stroke="#db2777" stroke-width="1.5" opacity="0.4" />
      
      <!-- Detalhes de fita bonita -->
      <path d="M 462 155 L 512 170 L 562 155" fill="none" stroke="#db2777" stroke-width="2" opacity="0.5" />
    </svg>`
  },
  {
    id: "cozy-coffee",
    name: "Bistrô Premium - Bebidas & Cafés",
    category: "Café",
    backgroundColor: "#0c0a09",
    accentColor: "#a8a29e",
    svgMarkup: `<svg viewBox="0 0 1024 576" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="576" fill="#1c1917" />
      <rect x="30" y="30" width="964" height="516" fill="none" stroke="#78716c" stroke-width="1" opacity="0.5" />
      
      <text x="100" y="100" fill="#f5f5f4" font-family="sans-serif" font-size="42" font-weight="900" letter-spacing="1">CAFÉS &amp; BEBIDAS</text>
      <text x="100" y="130" fill="#e7e5e4" font-family="sans-serif" font-size="14" font-weight="500" opacity="0.6">THE COFFEE EXPERIENCE • SELECIONADOS À MÃO</text>
      
      <line x1="100" y1="150" x2="924" y2="150" stroke="#78716c" stroke-width="3" opacity="0.7" />
      
      <!-- Ilustração xícara café vapor sutil -->
      <path d="M 850 450 C 850 490, 890 490, 890 450 L 910 450 C 910 440, 910 430, 890 430 L 850 430" fill="none" stroke="#78716c" stroke-width="3" opacity="0.5"/>
      <path d="M 870 415 C 870 405, 878 405, 878 395" fill="none" stroke="#78716c" stroke-width="2" opacity="0.4"/>
      <path d="M 880 415 C 880 405, 888 405, 888 395" fill="none" stroke="#78716c" stroke-width="2" opacity="0.4"/>
    </svg>`
  },
  {
    id: "modern-brunch",
    name: "Brunch Moderno - Sanduíches & Almoço",
    category: "Lanches",
    backgroundColor: "#ffffff",
    accentColor: "#0f172a",
    svgMarkup: `<svg viewBox="0 0 1024 576" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="576" fill="#f8fafc" />
      
      <!-- Faixa da esquerda moderna -->
      <rect x="0" y="0" width="300" height="576" fill="#f1f5f9" />
      <line x1="300" y1="0" x2="300" y2="576" stroke="#e2e8f0" stroke-width="2" />
      
      <text x="50" y="120" fill="#0f172a" font-family="sans-serif" font-size="34" font-weight="950">REFEIÇÕES</text>
      <text x="50" y="155" fill="#eab308" font-family="sans-serif" font-size="16" font-weight="800">BRUNCH &amp; ALMOÇO</text>
      <text x="50" y="190" fill="#64748b" font-family="sans-serif" font-size="11" font-weight="500" width="200">
        Pratos rápidos executados em minutos com alto sabor
      </text>
      
      <rect x="50" y="235" width="200" height="1" fill="#cbd5e1" />
      <text x="50" y="270" fill="#475569" font-family="sans-serif" font-size="11" font-weight="bold">HORÁRIO: 11h às 15h</text>
      
      <!-- Detalhes do Grid -->
      <rect x="340" y="40" width="644" height="496" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
    </svg>`
  }
];
