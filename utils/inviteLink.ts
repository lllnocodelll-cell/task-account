/**
 * Utilitário para geração e decodificação segura de links de Primeiro Acesso (Convites).
 */

export interface InvitePayload {
  memberId: string;
  email: string;
  name: string;
  role: 'operacional' | 'gestor' | 'cliente';
  orgId: string;
  orgName?: string;
  timestamp: number;
}

/**
 * Codifica o payload do convite para uso seguro na URL
 */
export function generateInviteLink(payload: Omit<InvitePayload, 'timestamp'>): string {
  const fullPayload: InvitePayload = {
    ...payload,
    timestamp: Date.now()
  };

  const jsonStr = JSON.stringify(fullPayload);
  // Converte para Base64 URL-safe compatível com browser
  const base64 = btoa(encodeURIComponent(jsonStr));
  const baseUrl = window.location.origin;

  return `${baseUrl}/?action=activate&invite=${base64}`;
}

/**
 * Decodifica e valida o payload recebido pela URL
 */
export function parseInviteToken(token: string): InvitePayload | null {
  try {
    const jsonStr = decodeURIComponent(atob(token));
    const data = JSON.parse(jsonStr) as InvitePayload;

    if (!data.email || !data.memberId || !data.orgId) {
      return null;
    }

    return data;
  } catch (err) {
    console.error('Erro ao decodificar token de convite:', err);
    return null;
  }
}
