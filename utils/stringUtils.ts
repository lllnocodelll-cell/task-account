/**
 * Converte uma string para Title Case (primeira letra maiúscula),
 * mantendo preposições de nomes brasileiros em minúsculo e tratando siglas.
 */
export const toTitleCase = (str: string): string => {
  if (!str) return '';

  // Preposições comuns em nomes de órgãos e empresas no Brasil
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'com', 'em'];
  
  // Siglas que devem permanecer em maiúsculo (opcional, adicione conforme necessário)
  const acronyms = ['S/A', 'LTDA', 'MEI', 'ME', 'EPP', 'CNPJ', 'CPF', 'UF'];

  return str
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map((word, index) => {
      // Se for a primeira palavra, sempre capitalize
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      
      // Se for uma preposição, mantenha minúsculo
      if (prepositions.includes(word)) return word;
      
      // Se for uma sigla conhecida ou o caso de Ltda/SA que o usuário pode preferir padrão
      // Aqui vamos manter Ltda como Ltda pois fica mais agradável no Title Case
      
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Função específica para formatar dados retornados pela BrasilAPI (CNPJ)
 */
export const formatCNPJData = (data: any) => {
  const result = { ...data };
  
  const fieldsToFormat = [
    'razao_social', 
    'nome_fantasia', 
    'logradouro', 
    'bairro', 
    'municipio', 
    'complemento',
    'admin_partner_name' // Caso exista
  ];

  fieldsToFormat.forEach(field => {
    if (result[field]) {
      result[field] = toTitleCase(result[field]);
    }
  });

  return result;
};

/**
 * Converte marcações simples de formatação (Markdown-like) para tags HTML seguras.
 * - **negrito** -> <strong>negrito</strong>
 * - *itálico* -> <em>itálico</em>
 * - _sublinhado_ -> <u>sublinhado</u>
 * - ~tachado~ -> <del>tachado</del>
 * - Quebras de linha -> <br />
 * Escapa caracteres HTML perigosos para evitar XSS.
 */
export const formatMessageText = (text: string): string => {
  if (!text) return '';

  // 1. Escapar caracteres HTML para evitar XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 2. Aplicar formatações básicas
  // Negrito: **texto**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Itálico: *texto* (usando regex que não interfira no negrito)
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Sublinhado: _texto_
  escaped = escaped.replace(/_(.*?)_/g, '<u>$1</u>');
  // Tachado: ~texto~
  escaped = escaped.replace(/~(.*?)~/g, '<del>$1</del>');
  
  // 3. Substituir quebras de linha por <br />
  escaped = escaped.replace(/\n/g, '<br />');

  return escaped;
};

/**
 * Remove marcações simples de formatação (Markdown-like) do texto.
 * Utilizado para visualizações resumidas onde tags HTML não são desejáveis.
 */
export const stripFormatting = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~(.*?)~/g, '$1');
};

/**
 * Formata CPF (XXX.XXX.XXX-XX) ou CNPJ Alfanumérico/Numérico (XX.XXX.XXX/XXXX-XX).
 * Suporta o novo padrão alfanumérico da Receita Federal (letras e números).
 */
export const formatCnpjCpf = (value: string): string => {
  if (!value) return '';
  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const hasLetters = /[A-Z]/.test(clean);
  
  // Se tiver letras ou mais de 11 dígitos, formata como CNPJ
  if (hasLetters || clean.length > 11) {
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}.${clean.slice(2)}`;
    }
    if (clean.length > 5) {
      formatted = `${formatted.slice(0, 6)}.${formatted.slice(6)}`;
    }
    if (clean.length > 8) {
      formatted = `${formatted.slice(0, 10)}/${formatted.slice(10)}`;
    }
    if (clean.length > 12) {
      formatted = `${formatted.slice(0, 15)}-${formatted.slice(15, 17)}`;
    }
    return formatted.slice(0, 18);
  }

  // Se for apenas dígitos e até 11 caracteres, formata como CPF
  let formatted = clean;
  if (clean.length > 3) {
    formatted = `${clean.slice(0, 3)}.${clean.slice(3)}`;
  }
  if (clean.length > 6) {
    formatted = `${formatted.slice(0, 7)}.${formatted.slice(7)}`;
  }
  if (clean.length > 9) {
    formatted = `${formatted.slice(0, 11)}-${formatted.slice(11, 13)}`;
  }
  return formatted.slice(0, 14);
};


