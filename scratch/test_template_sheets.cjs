const XLSX = require('xlsx');

// 1. Aba Clientes
const clientsHeaders = [
    'codigo', 'tipo_pessoa', 'documento', 'razao_social', 'nome_fantasia',
    'estabelecimento', 'segmento', 'status', 'data_abertura', 'data_inicio_escritorio',
    'socio_nome', 'socio_cpf', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'
];
const clientsRows = [
    clientsHeaders,
    ['1001', 'PJ', '12.345.678/0001-90', 'Padaria Estrela do Sul Ltda', 'Padaria Estrela', 'Matriz', 'Comércio', 'Ativo', '15/03/2020', '01/01/2024', 'Carlos Silva', '123.456.789-00', '01310-100', 'Av Paulista', '1000', '', 'Bela Vista', 'São Paulo', 'SP'],
    ['1002', 'PJ', '98.765.432/0001-10', 'Moderna Tech Ltda', 'Moderna Tech', 'Matriz', 'Serviços', 'Ativo', '10/08/2021', '15/02/2024', 'Ana Paula', '987.654.321-11', '20040-002', 'Av Rio Branco', '500', '', 'Centro', 'Rio de Janeiro', 'RJ']
];

const wb = XLSX.utils.book_new();
const wsClients = XLSX.utils.aoa_to_sheet(clientsRows);
XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes');

// 2. Regime Tributario
const wsRegime = XLSX.utils.aoa_to_sheet([
    ['documento_cliente', 'regime', 'data_inicio', 'data_fim', 'observacao'],
    ['12.345.678/0001-90', 'Simples', '01/01/2024', '', 'Anexos I e II'],
    ['98.765.432/0001-10', 'Lucro Presumido', '01/01/2024', '', 'Serviços 32%']
]);
XLSX.utils.book_append_sheet(wb, wsRegime, 'Regime_Tributario');

// 3. Contatos
const wsCont = XLSX.utils.aoa_to_sheet([
    ['documento_cliente', 'nome', 'email', 'telefone_celular', 'telefone_fixo', 'principal'],
    ['12.345.678/0001-90', 'Carlos Diretor', 'carlos@padaria.com', '(11) 98765-4321', '', 'Sim'],
    ['12.345.678/0001-90', 'Mariana Financeiro', 'financeiro@padaria.com', '(11) 97777-8888', '', 'Não']
]);
XLSX.utils.book_append_sheet(wb, wsCont, 'Contatos');

// 4. Inscrições
const wsInsc = XLSX.utils.aoa_to_sheet([
    ['documento_cliente', 'tipo', 'numero', 'observacao'],
    ['12.345.678/0001-90', 'Estadual', '123.456.789.000', 'Ativa'],
    ['12.345.678/0001-90', 'Municipal', '987654', 'CCM']
]);
XLSX.utils.book_append_sheet(wb, wsInsc, 'Inscrições');

// 5. Atividades CNAE
const wsCnae = XLSX.utils.aoa_to_sheet([
    ['documento_cliente', 'cnae_codigo', 'descricao', 'tipo_ordem'],
    ['12.345.678/0001-90', '47.11-3-02', 'Comércio varejista', 'Principal']
]);
XLSX.utils.book_append_sheet(wb, wsCnae, 'Atividades_CNAE');

// 6. Acessos
const wsAcc = XLSX.utils.aoa_to_sheet([
    ['documento_cliente', 'nome_acesso', 'usuario', 'senha', 'setor', 'url_acesso'],
    ['12.345.678/0001-90', 'Posto Fiscal', '12345', 'Senha@123', 'Fiscal', 'https://pfe.fazenda.sp.gov.br']
]);
XLSX.utils.book_append_sheet(wb, wsAcc, 'Acessos_Portais');

// 7. Licenças
const wsLic = XLSX.utils.aoa_to_sheet([
    ['documento_cliente', 'nome_licenca', 'numero', 'vencimento', 'link_acesso'],
    ['12.345.678/0001-90', 'AVCB', '2024-991', '15/12/2026', '']
]);
XLSX.utils.book_append_sheet(wb, wsLic, 'Licenças_Alvarás');

// 8. Legislações
const wsLeg = XLSX.utils.aoa_to_sheet([
    ['documento_cliente', 'descricao', 'status', 'link_acesso'],
    ['12.345.678/0001-90', 'LC 123/2006', 'Vigente', '']
]);
XLSX.utils.book_append_sheet(wb, wsLeg, 'Legislações');

// 9. Séries DF-e
const wsDfe = XLSX.utils.aoa_to_sheet([
    ['documento_cliente', 'tipo_dfe', 'serie', 'emissor', 'usuario', 'senha', 'login_url'],
    ['12.345.678/0001-90', 'NF-e', '1', 'Próprio', '', '', '']
]);
XLSX.utils.book_append_sheet(wb, wsDfe, 'Séries_DFe');

XLSX.writeFile(wb, 'scratch/test_model.xlsx');
console.log('Arquivo modelo test_model.xlsx gerado com sucesso! Abas:', wb.SheetNames);
