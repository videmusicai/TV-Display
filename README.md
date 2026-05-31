# Vitrion Digital Display 📺✨

O **Vitrion Digital Display** é uma solução inteligente e moderna de gerenciamento de menus, preços e mídias promocionais (estilo *Digital Signage* / Menu Board) projetada especificamente para telas conectadas e televisores rodando o **Amazon Fire TV** (através de navegadores como o Amazon Silk).

---

## 🚀 Como Visualizar e Sincronizar este Projeto no GitHub

Para conectar este projeto ao seu próprio repositório do **GitHub** diretamente do Google AI Studio, siga estes passos simples:

1. **Abra o menu de configurações do AI Studio** (geralmente localizado no canto superior direito da tela do Google AI Studio).
2. Clique na opção **Exportar para o GitHub** (ou *Export to GitHub*).
3. Siga o fluxo de autorização da sua conta do GitHub para criar um novo repositório ou atualizar um existente com todo este código atualizado.
4. **Pronto!** O seu repositório estará configurado e pronto para ser integrado com plataformas como a **Vercel** para deploy contínuo em seu próprio domínio.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [React](https://react.dev/) + [Vite](https://vite.dev/) + [TypeScript](https://www.typescript.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Banco de Dados & Autenticação:** [Firebase Firestore & Auth](https://firebase.google.com/)
- **Hospedagem & Rotas:** Configurado para **Vercel** (`vercel.json` incluso)
- **Animações:** [Motion](https://motion.dev/)

---

## 🎨 Características do Projeto

- **Sincronização em Tempo Real:** Alterações de preços e mídias feitas no painel administrativo são refletidas instantaneamente nas TVs sintonizadas, sem necessidade de atualizar a página ou configurações locais de IP.
- **Logotipo Oficial Vetorial:** Logotipo moderno integrado utilizando SVGs de alta definição.
- **Design de Alta Densidade:** Layout limpo e otimizado para TVs comerciais e painéis promocionais.
- **Implantação Simples:** Totalmente compatível com navegadores de Smart TVs e o Amazon Fire TV.

---

## 📦 Como Executar Localmente

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### Passos para rodar o projeto:
1. Clone o repositório exportado do GitHub.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Abra o navegador na porta indicada (geralmente `http://localhost:3000`).

---

## 🌐 Deploy na Vercel

Este projeto já vem acompanhado de um arquivo de configuração `vercel.json` configurado para compatibilidade com Single Page Applications (SPA). Ao conectar o repositório criado no GitHub à Vercel, o deploy será feito automaticamente a cada alteração na sua branch principal.
