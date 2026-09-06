const XLSX = require('xlsx');

// 1. Testar quebra de cabeçalho na aba Clientes (ex: renomeou 'documento' para 'cnpj_incorreto')
const wbCorrupted = XLSX.utils.book_new();
const corruptedHeaders = ['codigo', 'tipo_pessoa', 'cnpj_incorreto', 'razao_social'];
const wsClients = XLSX.utils.aoa_to_sheet([
    corruptedHeaders,
    ['101', 'PJ', '12345678000190', 'Empresa Teste']
]);
XLSX.utils.book_append_sheet(wbCorrupted, wsClients, 'Clientes');

// Obter cabeçalhos
const rows = XLSX.utils.sheet_to_json(wsClients, { header: 1 });
const headers = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
const hasDoc = headers.some(h => ['documento', 'cnpj', 'cpf'].includes(h));

console.log('Teste 1 - Validação de ausência da coluna documento:', hasDoc === false ? 'PASSOU (Detectou erro de estrutura!)' : 'FALHOU');

// 2. Testar quebra de cabeçalho na aba secundária (ex: removeu 'documento_cliente' em Contatos)
const wsCont = XLSX.utils.aoa_to_sheet([
    ['nome_sem_vinculo', 'email'],
    ['Carlos', 'carlos@email.com']
]);
const contHeaders = (XLSX.utils.sheet_to_json(wsCont, { header: 1 })[0] || []).map(h => String(h || '').trim().toLowerCase());
const hasDocCliente = contHeaders.some(h => ['documento_cliente', 'documento', 'cnpj', 'cpf'].includes(h));
console.log('Teste 2 - Validação de ausência de documento_cliente em Contatos:', hasDocCliente === false ? 'PASSOU (Detectou erro de estrutura!)' : 'FALHOU');
