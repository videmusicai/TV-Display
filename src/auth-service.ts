import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from './firebase'; // Importa a instância de autenticação do nosso firebase.ts

const provider = new GoogleAuthProvider();

/**
 * Inicia o processo de login com Google usando um popup.
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    // O usuário logou com sucesso! Você pode acessar as informações do usuário aqui.
    const user = result.user;
    console.log("Usuário logado com Google:", user.displayName, user.email);
    return user;
  } catch (error: any) {
    // Lidar com erros de autenticação
    console.error("Erro no login com Google:", error.code, error.message);
    throw error;
  }
};

/**
 * Realiza o logout do usuário atual.
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    console.log("Usuário desconectado.");
  } catch (error: any) {
    console.error("Erro ao desconectar:", error.code, error.message);
    throw error;
  }
};

/**
 * Observa mudanças no estado de autenticação do usuário.
 * @param callback - Função a ser chamada quando o estado muda (recebe o objeto user ou null).
 */
export const observeAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
