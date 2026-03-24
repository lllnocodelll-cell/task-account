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
