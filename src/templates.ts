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
      
      <!-- Logomarca Vitrion Profissional -->
      <g transform="translate(487, 15)" opacity="0.95">
        <linearGradient id="logoBlueGradChalk" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
        <linearGradient id="logoOrangeGradChalk" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
        <path d="M 16 35 H 34" stroke="url(#logoBlueGradChalk)" stroke-width="2" stroke-linecap="round" />
        <rect x="23" y="30" width="4" height="5" rx="0.5" fill="url(#logoBlueGradChalk)" />
        <path d="M 31 10 H 9 C 6.7 10 5 11.7 5 14 V 26 C 5 28.3 6.7 30 9 30 H 36 C 38.3 30 40 28.3 40 26 V 16.5" stroke="url(#logoBlueGradChalk)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <path d="M 11.5 15 L 22 27 L 37.5 6" stroke="url(#logoOrangeGradChalk)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>
      
      <!-- Cabeçalho -->
      <text x="512" y="105" text-anchor="middle" fill="#f8fafc" font-family="'Georgia', serif" font-size="34" font-weight="950" letter-spacing="4">PADARIA ARTESANAL</text>
      <text x="512" y="138" text-anchor="middle" fill="#f59e0b" font-family="'Courier New', monospace" font-size="13" font-weight="bold" letter-spacing="6">FORNADAS REALIZADAS DE HORA EM HORA</text>
      
      <!-- Divisória -->
      <line x1="200" y1="155" x2="824" y2="155" stroke="#f59e0b" stroke-width="2" opacity="0.5" />
      <circle cx="512" cy="155" r="5" fill="#f59e0b" />
      
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
      
      <!-- Logomarca Vitrion Profissional -->
      <g transform="translate(487, 15)" opacity="0.95">
        <linearGradient id="logoBlueGradSweet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
        <linearGradient id="logoOrangeGradSweet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
        <path d="M 16 35 H 34" stroke="url(#logoBlueGradSweet)" stroke-width="2" stroke-linecap="round" />
        <rect x="23" y="30" width="4" height="5" rx="0.5" fill="url(#logoBlueGradSweet)" />
        <path d="M 31 10 H 9 C 6.7 10 5 11.7 5 14 V 26 C 5 28.3 6.7 30 9 30 H 36 C 38.3 30 40 28.3 40 26 V 16.5" stroke="url(#logoBlueGradSweet)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <path d="M 11.5 15 L 22 27 L 37.5 6" stroke="url(#logoOrangeGradSweet)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>
      
      <rect x="30" y="30" width="964" height="516" fill="none" stroke="#db2777" stroke-width="2" rx="10" opacity="0.2" />
      
      <!-- Título Confeitaria -->
      <text x="512" y="105" text-anchor="middle" fill="#db2777" font-family="'Georgia', serif" font-size="38" font-style="italic" font-weight="bold">Delícias da Confeitaria</text>
      <text x="512" y="138" text-anchor="middle" fill="#be185d" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="3">FINEST SWEETS &amp; GOURMET CAKES</text>
      
      <line x1="300" y1="155" x2="724" y2="155" stroke="#db2777" stroke-width="1.5" opacity="0.4" />
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
      
      <!-- Logomarca Vitrion Profissional -->
      <g transform="translate(880, 50)" opacity="0.9">
        <linearGradient id="logoBlueGradCozy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
        <linearGradient id="logoOrangeGradCozy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
        <path d="M 16 35 H 34" stroke="url(#logoBlueGradCozy)" stroke-width="2" stroke-linecap="round" />
        <rect x="23" y="30" width="4" height="5" rx="0.5" fill="url(#logoBlueGradCozy)" />
        <path d="M 31 10 H 9 C 6.7 10 5 11.7 5 14 V 26 C 5 28.3 6.7 30 9 30 H 36 C 38.3 30 40 28.3 40 26 V 16.5" stroke="url(#logoBlueGradCozy)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <path d="M 11.5 15 L 22 27 L 37.5 6" stroke="url(#logoOrangeGradCozy)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>

      <text x="100" y="100" fill="#f5f5f4" font-family="sans-serif" font-size="42" font-weight="900" letter-spacing="1">CAFÉS &amp; BEBIDAS</text>
      <text x="100" y="130" fill="#e7e5e4" font-family="sans-serif" font-size="14" font-weight="500" opacity="0.6">THE COFFEE EXPERIENCE • SELECIONADOS À MÃO</text>
      
      <line x1="100" y1="150" x2="924" y2="150" stroke="#78716c" stroke-width="3" opacity="0.7" />
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
      
      <!-- Logomarca Vitrion Profissional no Painel Lateral -->
      <g transform="translate(130, 30)" opacity="0.95">
        <linearGradient id="logoBlueGradBrunch" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
        <linearGradient id="logoOrangeGradBrunch" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
        <path d="M 16 35 H 34" stroke="url(#logoBlueGradBrunch)" stroke-width="2" stroke-linecap="round" />
        <rect x="23" y="30" width="4" height="5" rx="0.5" fill="url(#logoBlueGradBrunch)" />
        <path d="M 31 10 H 9 C 6.7 10 5 11.7 5 14 V 26 C 5 28.3 6.7 30 9 30 H 36 C 38.3 30 40 28.3 40 26 V 16.5" stroke="url(#logoBlueGradBrunch)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <path d="M 11.5 15 L 22 27 L 37.5 6" stroke="url(#logoOrangeGradBrunch)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>

      <text x="50" y="130" fill="#0f172a" font-family="sans-serif" font-size="34" font-weight="950">REFEIÇÕES</text>
      <text x="50" y="165" fill="#eab308" font-family="sans-serif" font-size="16" font-weight="800">BRUNCH &amp; ALMOÇO</text>
      <text x="50" y="200" fill="#64748b" font-family="sans-serif" font-size="11" font-weight="500" width="200">
        Pratos rápidos executados em minutos com alto sabor
      </text>
      
      <rect x="50" y="245" width="200" height="1" fill="#cbd5e1" />
      <text x="50" y="280" fill="#475569" font-family="sans-serif" font-size="11" font-weight="bold">HORÁRIO: 11h às 15h</text>
      
      <!-- Detalhes do Grid -->
      <rect x="340" y="40" width="644" height="496" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
    </svg>`
  }
];
