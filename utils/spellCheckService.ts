/**
 * Serviço de Correção Ortográfica e Gramatical com IA (Google Gemini)
 * Especializado em português do Brasil (pt-BR) e comunicação contábil/fiscal.
 */

export interface SpellCheckResult {
  success: boolean;
  correctedText: string;
  hasChanges: boolean;
  error?: string;
  missingApiKey?: boolean;
}

const SYSTEM_INSTRUCTION = `Você é um assistente de revisão ortográfica, gramatical e de pontuação de alto nível para o português do Brasil (pt-BR), especializado em atendimento ao cliente e rotinas de escritórios de contabilidade e BPO fiscal/financeiro.

Suas diretrizes estritas:
1. Corrija erros ortográficos, acentuação, crases, pontuação e concordância verbal/nominal.
2. Preserve e padronize corretamente nomes de tributos, guias, declarações e termos fiscais/contábeis (ex: DARF, DAS, SEFAZ, SPED, DCTF, CNAE, Simples Nacional, Lucro Presumido, Lucro Real, pró-labore, alíquota, retenção, eSocial, DFe, etc.).
3. Mantenha integralmente a mensagem, a intenção, os links, emojis e a formatação (quebras de linha) do autor original. Não adicione novos tópicos nem retire informações.
4. Mantenha o tom profissional e cordial de atendimento corporativo.
5. Retorne ESTRITAMENTE o texto final corrigido, sem aspas adicionais, sem preâmbulos, sem cumprimentos adicionais e sem justificativas das correções.`;

/**
 * Obtém a chave da API do Gemini a partir do .env.local ou do localStorage
 */
export function getGeminiApiKey(): string {
  // 1. Variáveis de ambiente Vite
  const envKey = 
    import.meta.env.VITE_GEMINI_API_KEY || 
    import.meta.env.GEMINI_API_KEY || 
    (typeof process !== 'undefined' ? (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) : '');

  if (envKey && envKey.trim() && !envKey.includes('sua_chave_aqui')) {
    return envKey.trim();
  }

  // 2. Fallback no LocalStorage
  if (typeof window !== 'undefined') {
    const localKey = 
      localStorage.getItem('task_account_gemini_api_key') || 
      localStorage.getItem('gemini_api_key') || 
      localStorage.getItem('VITE_GEMINI_API_KEY');

    if (localKey && localKey.trim()) {
      return localKey.trim();
    }
  }

  return '';
}

/**
 * Salva uma chave da API do Gemini no LocalStorage
 */
export function saveGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('task_account_gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('task_account_gemini_api_key');
    }
  }
}

/**
 * Verifica se há uma chave de API configurada
 */
export function hasGeminiApiKey(): boolean {
  return !!getGeminiApiKey();
}

/**
 * Executa a revisão ortográfica e gramatical do texto
 */
export async function correctSpelling(originalText: string): Promise<SpellCheckResult> {
  const text = originalText.trim();
  if (!text) {
    return {
      success: true,
      correctedText: originalText,
      hasChanges: false
    };
  }

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return {
      success: false,
      correctedText: originalText,
      hasChanges: false,
      missingApiKey: true,
      error: 'Chave da API do Google Gemini não configurada. Insira sua chave para ativar a revisão automática.'
    };
  }

  // Modelos suportados na API Gemini
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${SYSTEM_INSTRUCTION}\n\nTexto a ser revisado:\n"""\n${text}\n"""` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Tentativa com modelo ${model} retornou status ${response.status}:`, errorData);

        // Se a chave for explicitamente inválida
        if (response.status === 400 || response.status === 403) {
          const errMsg = errorData?.error?.message || 'Chave da API do Gemini inválida ou sem permissão.';
          return {
            success: false,
            correctedText: originalText,
            hasChanges: false,
            missingApiKey: true,
            error: `Erro na chave da API do Gemini: ${errMsg}`
          };
        }

        continue;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        throw new Error('Nenhum texto retornado pela IA.');
      }

      // Limpeza de eventuais aspas de delimitação retornadas pela IA
      let cleanedText = candidateText.trim();
      if (cleanedText.startsWith('"""') && cleanedText.endsWith('"""')) {
        cleanedText = cleanedText.slice(3, -3).trim();
      }

      const hasChanges = cleanedText !== text;

      return {
        success: true,
        correctedText: cleanedText,
        hasChanges
      };
    } catch (err: any) {
      console.error(`Erro ao consultar modelo ${model}:`, err);
    }
  }

  return {
    success: false,
    correctedText: originalText,
    hasChanges: false,
    error: 'Não foi possível conectar ao serviço de correção ortográfica. Verifique sua conexão e tente novamente.'
  };
}
