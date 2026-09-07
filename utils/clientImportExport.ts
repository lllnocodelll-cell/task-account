import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';
import { TAX_REGIME_LABELS } from '../types';

// Tipagem para Linha de Cliente importada
export interface ImportedClientRow {
    tempId: string;
    code?: string;
    person_type: 'juridica' | 'fisica' | 'estrangeiro';
    document: string;
    cleanDocument: string;
    company_name: string;
    trade_name?: string;
    establishment_type: 'matriz' | 'filial';
    segment?: string;
    status: 'Ativo' | 'Inativo';
    constitution_date?: string | null;
    entry_date?: string | null;
    admin_partner_name?: string;
    admin_partner_cpf?: string;
    admin_partner_birthdate?: string | null;
    zip_code?: string;
    street?: string;
    street_number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    // Status de validação
    validationStatus: 'valid' | 'duplicate' | 'error';
    validationMessage?: string;
    // Vínculos das 8 abas adicionais
    taxRegimes: ImportedTaxRegimeRow[];
    contacts: ImportedContactRow[];
    inscriptions: ImportedInscriptionRow[];
    activities: ImportedActivityRow[];
    accesses: ImportedAccessRow[];
    licenses: ImportedLicenseRow[];
    legislations: ImportedLegislationRow[];
    dfeSeries: ImportedDfeSeriesRow[];
}

export interface ImportedTaxRegimeRow {
    documento_cliente: string;
    regime: string;
    annexes?: string[];
    start_date?: string | null;
    end_date?: string | null;
    observation?: string;
}

export interface ImportedContactRow {
    documento_cliente: string;
    name: string;
    email?: string;
    phone_mobile?: string;
    phone_fixed?: string;
    is_main?: boolean;
}

export interface ImportedInscriptionRow {
    documento_cliente: string;
    type: string;
    custom_name?: string;
    number: string;
    observation?: string;
}

export interface ImportedActivityRow {
    documento_cliente: string;
    cnae_code: string;
    cnae_description?: string;
    order_type: 'Principal' | 'Secundária';
}

export interface ImportedAccessRow {
    documento_cliente: string;
    access_name: string;
    username?: string;
    password?: string;
    sector?: string;
    access_url?: string;
}

export interface ImportedLicenseRow {
    documento_cliente: string;
    license_name: string;
    license_number?: string;
    expiry_date?: string | null;
    access_url?: string;
}

export interface ImportedLegislationRow {
    documento_cliente: string;
    description: string;
    status?: string;
    access_url?: string;
}

export interface ImportedDfeSeriesRow {
    documento_cliente: string;
    dfe_type: string;
    series: string;
    issuer?: string;
    username?: string;
    password?: string;
    login_url?: string;
}

export interface WorkbookParseResult {
    totalRows: number;
    validCount: number;
    duplicateCount: number;
    errorCount: number;
    rows: ImportedClientRow[];
    secondaryStats: {
        taxRegimes: number;
        contacts: number;
        inscriptions: number;
        activities: number;
        accesses: number;
        licenses: number;
        legislations: number;
        dfeSeries: number;
    };
}

// Utilitário para limpar documentos (somente números e letras maiúsculas para CNPJ alfanumérico)
export const sanitizeDocument = (doc: any): string => {
    if (!doc) return '';
    return String(doc).replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
};

// Formatar CNPJ/CPF com pontuação padrão
export const formatDisplayDocument = (doc: string): string => {
    const clean = sanitizeDocument(doc);
    if (clean.length === 11) {
        return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (clean.length === 14) {
        return clean.replace(/([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([A-Z0-9]{2})/, '$1.$2.$3/$4-$5');
    }
    return doc.trim();
};

// Normalizar data (aceita DD/MM/AAAA, AAAA-MM-DD ou número de data serial do Excel)
export const parseExcelDate = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'number') {
        // Data serial do Excel
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    const str = String(val).trim();
    if (!str) return null;

    // Formato DD/MM/AAAA ou DD-MM-AAAA
    const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brMatch) {
        const [, d, m, y] = brMatch;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Formato AAAA-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }

    return null;
};

// Normalizar regime tributário para o valor aceito no banco
const normalizeTaxRegime = (val: string): string => {
    if (!val) return 'simples';
    const lower = val.toLowerCase().trim();
    if (lower.includes('iva') || lower.includes('dual')) return 'simples_iva';
    if (lower.includes('mei') || lower.includes('microempreendedor')) return 'mei';
    if (lower.includes('arbitrado')) return 'arbitrado';
    if (lower.includes('presumido') && lower.includes('imune')) return 'presumido_imune';
    if (lower.includes('presumido')) return 'presumido';
    if (lower.includes('real') && lower.includes('trimestral')) return 'real_trimestral';
    if (lower.includes('real') && lower.includes('anual')) return 'real_anual';
    if (lower.includes('real') && lower.includes('imune')) return 'real_imune';
    if (lower.includes('real')) return 'real_trimestral';
    if (lower.includes('irpf')) return 'irpf';
    return 'simples';
};

/**
 * Dispara o download da planilha modelo oficial estilizada (.xlsx)
 * Prioriza o arquivo formatado e estilizado disponível na aplicação.
 */
export const downloadClientTemplate = async () => {
    const filename = 'modelo_importacao_clientes_task_account.xlsx';
    try {
        const response = await fetch(`/${filename}`);
        if (response.ok) {
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            return;
        }
    } catch (err) {
        console.warn('Não foi possível carregar o modelo estático, gerando dinamicamente:', err);
    }

    const wb = XLSX.utils.book_new();

    // 1. Aba Clientes
    const clientsHeaders = [
        'codigo',
        'tipo_pessoa',
        'documento',
        'razao_social',
        'nome_fantasia',
        'estabelecimento',
        'segmento',
        'status',
        'data_abertura',
        'data_inicio_escritorio',
        'socio_nome',
        'socio_cpf',
        'socio_data_nascimento',
        'cep',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'estado'
    ];
    const clientsRows = [
        clientsHeaders,
        [
            '1001',
            'PJ',
            '12.345.678/0001-90',
            'Padaria Estrela do Sul Ltda',
            'Padaria Estrela',
            'Matriz',
            'Comércio',
            'Ativo',
            '15/03/2020',
            '01/01/2024',
            'Carlos Eduardo Silva',
            '123.456.789-00',
            '12/05/1980',
            '01310-100',
            'Avenida Paulista',
            '1000',
            'Sala 42',
            'Bela Vista',
            'São Paulo',
            'SP'
        ],
        [
            '1002',
            'PJ',
            '98.765.432/0001-10',
            'Tecnologia Moderna e Serviços Ltda',
            'Moderna Tech',
            'Matriz',
            'Serviços',
            'Ativo',
            '10/08/2021',
            '15/02/2024',
            'Ana Paula Souza',
            '987.654.321-11',
            '22/09/1985',
            '20040-002',
            'Avenida Rio Branco',
            '500',
            'Andar 8',
            'Centro',
            'Rio de Janeiro',
            'RJ'
        ]
    ];
    const wsClients = XLSX.utils.aoa_to_sheet(clientsRows);
    wsClients['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 35 }, { wch: 25 },
        { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 22 },
        { wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 25 }, { wch: 10 },
        { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 8 }
    ];
    XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes');

    // 2. Aba Regime_Tributario
    const regimeHeaders = ['documento_cliente', 'regime', 'anexos', 'data_inicio', 'data_fim', 'observacao'];
    const regimeRows = [
        regimeHeaders,
        ['12.345.678/0001-90', 'Simples', 'Anexo I, Anexo II', '01/01/2024', '', 'Enquadrado no Simples Nacional com Anexo I e II'],
        ['98.765.432/0001-10', 'Lucro Presumido', '', '01/01/2024', '', 'Alíquota de presunção 32% (Serviços)']
    ];
    const wsRegime = XLSX.utils.aoa_to_sheet(regimeRows);
    wsRegime['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsRegime, 'Regime_Tributario');

    // 3. Aba Contatos
    const contactsHeaders = ['documento_cliente', 'nome', 'email', 'telefone_celular', 'telefone_fixo', 'principal'];
    const contactsRows = [
        contactsHeaders,
        ['12.345.678/0001-90', 'Carlos Silva (Diretor)', 'carlos@padariaestrela.com.br', '(11) 98765-4321', '(11) 3214-5678', 'Sim'],
        ['12.345.678/0001-90', 'Mariana Financeiro', 'financeiro@padariaestrela.com.br', '(11) 97777-8888', '', 'Não'],
        ['98.765.432/0001-10', 'Ana Paula (CEO)', 'ana@modernatech.com.br', '(21) 99888-7766', '', 'Sim']
    ];
    const wsContacts = XLSX.utils.aoa_to_sheet(contactsRows);
    wsContacts['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsContacts, 'Contatos');

    // 4. Aba Inscrições
    const inscHeaders = ['documento_cliente', 'tipo', 'nome_inscricao', 'numero', 'observacao'];
    const inscRows = [
        inscHeaders,
        ['12.345.678/0001-90', 'Estadual', '', '123.456.789.000', 'Contribuinte ICMS normal'],
        ['12.345.678/0001-90', 'Municipal', '', '987654', 'CCM São Paulo'],
        ['12.345.678/0001-90', 'Outra', 'OAB', '123456', 'Registro na OAB/SP'],
        ['98.765.432/0001-10', 'Municipal', '', '654321', 'Inscrição de prestador de serviços']
    ];
    const wsInsc = XLSX.utils.aoa_to_sheet(inscRows);
    wsInsc['!cols'] = [{ wch: 22 }, { wch: 15 }, { wch: 22 }, { wch: 22 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsInsc, 'Inscrições');

    // 5. Aba Atividades_CNAE
    const cnaeHeaders = ['documento_cliente', 'cnae_codigo', 'descricao', 'tipo_ordem'];
    const cnaeRows = [
        cnaeHeaders,
        ['12.345.678/0001-90', '47.11-3-02', 'Comércio varejista de mercadorias em geral', 'Principal'],
        ['12.345.678/0001-90', '56.11-2-01', 'Restaurantes e similares', 'Secundária'],
        ['98.765.432/0001-10', '62.01-5-01', 'Desenvolvimento de programas de computador sob encomenda', 'Principal']
    ];
    const wsCnae = XLSX.utils.aoa_to_sheet(cnaeRows);
    wsCnae['!cols'] = [{ wch: 22 }, { wch: 15 }, { wch: 45 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsCnae, 'Atividades_CNAE');

    // 6. Aba Acessos_Portais
    const accessHeaders = ['documento_cliente', 'nome_acesso', 'usuario', 'senha', 'setor', 'url_acesso'];
    const accessRows = [
        accessHeaders,
        ['12.345.678/0001-90', 'Posto Fiscal Eletrônico (PFE)', '12345678', 'SenhaFiscal@2026', 'Fiscal', 'https://www.fazenda.sp.gov.br/pfe'],
        ['12.345.678/0001-90', 'Nota do Milhão SP', '12345678000190', 'SenhaNota@123', 'Fiscal', 'https://nfe.prefeitura.sp.gov.br'],
        ['98.765.432/0001-10', 'Nota Carioca', 'moderna_rio', 'Rio@2026', 'Fiscal', 'https://notacarioca.rio.gov.br']
    ];
    const wsAccess = XLSX.utils.aoa_to_sheet(accessRows);
    wsAccess['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsAccess, 'Acessos_Portais');

    // 7. Aba Licenças_Alvarás
    const licenseHeaders = ['documento_cliente', 'nome_licenca', 'numero', 'vencimento', 'link_acesso'];
    const licenseRows = [
        licenseHeaders,
        ['12.345.678/0001-90', 'AVCB Corpo de Bombeiros', '2024-99881', '15/12/2026', 'https://viafacil2.policiamilitar.sp.gov.br'],
        ['12.345.678/0001-90', 'Vigilância Sanitária (CMVS)', '10293847', '20/05/2027', 'https://covisa.prefeitura.sp.gov.br'],
        ['98.765.432/0001-10', 'Alvará de Funcionamento', 'ALV-2024-554', '31/12/2027', '']
    ];
    const wsLicense = XLSX.utils.aoa_to_sheet(licenseRows);
    wsLicense['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsLicense, 'Licenças_Alvarás');

    // 8. Aba Legislações
    const legHeaders = ['documento_cliente', 'descricao', 'status', 'link_acesso'];
    const legRows = [
        legHeaders,
        ['12.345.678/0001-90', 'Lei Complementar nº 123/2006 (Estatuto da Micro e Pequena Empresa)', 'Vigente', 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm'],
        ['12.345.678/0001-90', 'Decreto Estadual ICMS Reduzido Alimentos', 'Vigente', ''],
        ['98.765.432/0001-10', 'Lei Municipal ISS Tecnologia 2%', 'Vigente', '']
    ];
    const wsLeg = XLSX.utils.aoa_to_sheet(legRows);
    wsLeg['!cols'] = [{ wch: 22 }, { wch: 45 }, { wch: 15 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsLeg, 'Legislações');

    // 9. Aba Séries_DFe
    const dfeHeaders = ['documento_cliente', 'tipo_dfe', 'serie', 'emissor', 'usuario', 'senha', 'login_url'];
    const dfeRows = [
        dfeHeaders,
        ['12.345.678/0001-90', 'NF-e', '1', 'Emissor Próprio / ERP', '', '', ''],
        ['12.345.678/0001-90', 'NFS-e', '99', 'Prefeitura Municipal', 'fiscal_estrela', 'SenhaPrefeitura123', 'https://nfe.prefeitura.sp.gov.br'],
        ['98.765.432/0001-10', 'NFS-e', '1', 'Nota Carioca', 'moderna_rio', 'Rio@2026', 'https://notacarioca.rio.gov.br']
    ];
    const wsDfe = XLSX.utils.aoa_to_sheet(dfeRows);
    wsDfe['!cols'] = [{ wch: 22 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsDfe, 'Séries_DFe');

    // 10. Aba Tabelas_Apoio (Referência de Segmentos, DF-e, Regimes e Estabelecimentos)
    const DFE_MODELS = [
        ['NF-e', 'Mod: 55', 'Nota Fiscal Eletrônica'],
        ['NFS-e', 'Nacional / Municipal', 'Nota Fiscal de Serviço Eletrônica'],
        ['NFC-e', 'Mod: 65', 'Nota Fiscal de Consumidor Eletrônica'],
        ['CT-e', 'Mod: 57', 'Conhecimento de Transporte Eletrônico'],
        ['MDF-e', 'Mod: 58', 'Manifesto Eletrônico de Documentos Fiscais'],
        ['BP-e', 'Mod: 63', 'Bilhete de Passagem Eletrônico'],
        ['NF3-e', 'Mod: 66', 'Nota Fiscal de Energia Elétrica Eletrônica'],
        ['NFCom', 'Mod: 62', 'Nota Fiscal de Comunicação Eletrônica'],
        ['NFF', 'Simplificado', 'Nota Fiscal Fácil'],
        ['DC-e', 'Correios / Cargas', 'Declaração de Conteúdo Eletrônica'],
        ['NFAG', 'Mod: 75', 'Nota Fiscal de Água e Saneamento Eletrônica'],
        ['NF-e ABI', 'Mod: 77', 'Alienação de Bens Imóveis'],
        ['NFGas', 'Mod: 76', 'Nota Fiscal Eletrônica do Gás']
    ];

    const SEGMENTS_LIST = [
        'Academias e Esportes',
        'Agronegócio',
        'Automotivo',
        'Bares e Restaurantes',
        'Beleza e Estética',
        'Combustíveis',
        'Comércio',
        'Construção Civil',
        'E-commerce',
        'Educação',
        'Energia',
        'Entretenimento',
        'Eventos',
        'Facilities e Terceirização',
        'Farmácias e Drogarias',
        'Finanças',
        'Gráfica e Comunicação Visual',
        'Holding e Participações',
        'Hotelaria',
        'Imobiliário',
        'Indústria',
        'Locação de bens',
        'Logística',
        'Marketing e Publicidade',
        'Mercado Digital e Infoprodutos',
        'Mineração',
        'ONG',
        'Pet e Veterinária',
        'Petróleo e Gás',
        'Rádio e TV',
        'Reciclagem',
        'Saneamento Básico',
        'Saúde',
        'Seguros',
        'Serviços Profissionais',
        'Setor Público',
        'Silvicultura',
        'Tecnologia',
        'Telecomunicações e Provedores',
        'Transporte',
        'Turismo',
        'Outros'
    ];

    const REGIMES_LIST = [
        'Simples',
        'Simples IVA Dual',
        'Lucro Presumido',
        'Lucro Presumido Imune-Isento',
        'Lucro Real Trimestral',
        'Lucro Real Anual',
        'Lucro Real Imune-Isento',
        'Lucro Arbitrado',
        'MEI',
        'IRPF'
    ];

    const SIMPLES_ANNEXES = [
        'Anexo I - Comércio',
        'Anexo II - Indústria',
        'Anexo III - Serviços',
        'Anexo IV - Serviços',
        'Anexo V - Serviços'
    ];

    const maxRows = Math.max(SEGMENTS_LIST.length, DFE_MODELS.length, REGIMES_LIST.length, SIMPLES_ANNEXES.length);
    const apoioHeaders = [
        'Segmentos_Disponiveis',
        'Modelos_DFe_Sigla',
        'Modelo_Fiscal',
        'Descricao_DFe',
        'Regimes_Tributarios',
        'Anexos_Simples_Nacional',
        'Estabelecimentos'
    ];

    const apoioRows: any[][] = [apoioHeaders];
    for (let r = 0; r < maxRows; r++) {
        const seg = SEGMENTS_LIST[r] || '';
        const dfe = DFE_MODELS[r] || ['', '', ''];
        const reg = REGIMES_LIST[r] || '';
        const anx = SIMPLES_ANNEXES[r] || '';
        const est = r === 0 ? 'Matriz' : r === 1 ? 'Filial' : '';
        apoioRows.push([seg, dfe[0], dfe[1], dfe[2], reg, anx, est]);
    }

    const wsApoio = XLSX.utils.aoa_to_sheet(apoioRows);
    wsApoio['!cols'] = [
        { wch: 32 },
        { wch: 20 },
        { wch: 22 },
        { wch: 42 },
        { wch: 30 },
        { wch: 25 },
        { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsApoio, 'Tabelas_Apoio');

    // Salvar e disparar download
    XLSX.writeFile(wb, 'modelo_importacao_clientes_task_account.xlsx');
};

/**
 * Lê o arquivo Excel (.xlsx) e realiza a prévia e validação completa das 9 abas
 */
export const parseAndValidateClientWorkbook = async (
    file: File,
    existingClients: { id: string; document?: string; code?: string }[]
): Promise<WorkbookParseResult> => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });

    // Mapeamento dos documentos existentes na base de dados (para detecção de duplicidade)
    const existingDocMap = new Set<string>();
    existingClients.forEach(c => {
        if (c.document) {
            const clean = sanitizeDocument(c.document);
            if (clean) existingDocMap.add(clean);
        }
    });

    // 1. Processar Aba Clientes
    const clientsSheetName = wb.SheetNames.find(n => n.toLowerCase().trim() === 'clientes') || wb.SheetNames[0];
    const clientsSheet = wb.Sheets[clientsSheetName];
    if (!clientsSheet) {
        throw new Error('A planilha deve conter ao menos a aba "Clientes".');
    }

    // Obter e validar os cabeçalhos da aba Clientes
    const clientsHeaderRows = XLSX.utils.sheet_to_json(clientsSheet, { header: 1 }) as any[][];
    if (!clientsHeaderRows || clientsHeaderRows.length === 0 || !clientsHeaderRows[0]) {
        throw new Error('A aba "Clientes" está vazia ou não possui linha de cabeçalho.');
    }

    const clientHeaders = (clientsHeaderRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());

    // Validação de colunas obrigatórias na aba Clientes
    const hasDocumentCol = clientHeaders.some(h => ['documento', 'cnpj', 'cpf'].includes(h));
    if (!hasDocumentCol) {
        throw new Error(
            'Estrutura da planilha inválida: A coluna "documento" (CNPJ/CPF) não foi encontrada no cabeçalho da aba "Clientes". ' +
            'Verifique se o nome da coluna foi alterado ou excluído. Utilize o modelo padrão oficial sem renomear as colunas.'
        );
    }

    const hasRazaoCol = clientHeaders.some(h => ['razao_social', 'razão social', 'razao', 'nome'].includes(h));
    if (!hasRazaoCol) {
        throw new Error(
            'Estrutura da planilha inválida: A coluna "razao_social" não foi encontrada no cabeçalho da aba "Clientes". ' +
            'Verifique se o nome da coluna foi alterado ou excluído. Utilize o modelo padrão oficial sem renomear as colunas.'
        );
    }

    // Validação estrutural de colunas das abas secundárias
    const secondaryStructureRules: {
        sheetNames: string[];
        requiredCols: { key: string; label: string; aliases: string[] }[];
    }[] = [
        {
            sheetNames: ['Regime_Tributario', 'Regime Tributario', 'Regimes'],
            requiredCols: [
                { key: 'documento_cliente', label: 'documento_cliente', aliases: ['documento_cliente', 'documento', 'cnpj', 'cpf'] },
                { key: 'regime', label: 'regime', aliases: ['regime', 'regime_tributario'] }
            ]
        },
        {
            sheetNames: ['Contatos', 'Contato'],
            requiredCols: [
                { key: 'documento_cliente', label: 'documento_cliente', aliases: ['documento_cliente', 'documento', 'cnpj', 'cpf'] },
                { key: 'nome', label: 'nome', aliases: ['nome', 'contato', 'nome_contato'] }
            ]
        },
        {
            sheetNames: ['Inscrições', 'Inscricoes', 'Inscrição', 'Inscricao'],
            requiredCols: [
                { key: 'documento_cliente', label: 'documento_cliente', aliases: ['documento_cliente', 'documento', 'cnpj', 'cpf'] },
                { key: 'numero', label: 'numero', aliases: ['numero', 'número', 'inscricao', 'inscrição'] }
            ]
        },
        {
            sheetNames: ['Atividades_CNAE', 'Atividades', 'CNAE'],
            requiredCols: [
                { key: 'documento_cliente', label: 'documento_cliente', aliases: ['documento_cliente', 'documento', 'cnpj', 'cpf'] },
                { key: 'cnae_codigo', label: 'cnae_codigo', aliases: ['cnae_codigo', 'cnae', 'codigo_cnae', 'código cnae'] }
            ]
        },
        {
            sheetNames: ['Acessos_Portais', 'Acessos', 'Portais'],
            requiredCols: [
                { key: 'documento_cliente', label: 'documento_cliente', aliases: ['documento_cliente', 'documento', 'cnpj', 'cpf'] },
                { key: 'nome_acesso', label: 'nome_acesso', aliases: ['nome_acesso', 'portal', 'nome', 'acesso'] }
            ]
        },
        {
            sheetNames: ['Licenças_Alvarás', 'Licencas_Alvaras', 'Licencas', 'Licenças', 'Alvaras', 'Alvarás'],
            requiredCols: [
                { key: 'documento_cliente', label: 'documento_cliente', aliases: ['documento_cliente', 'documento', 'cnpj', 'cpf'] },
                { key: 'nome_licenca', label: 'nome_licenca', aliases: ['nome_licenca', 'licenca', 'licença', 'nome'] }
            ]
        },
        {
            sheetNames: ['Legislações', 'Legislacoes', 'Legislação', 'Legislacao'],
            requiredCols: [
                { key: 'documento_cliente', label: 'documento_cliente', aliases: ['documento_cliente', 'documento', 'cnpj', 'cpf'] },
                { key: 'descricao', label: 'descricao', aliases: ['descricao', 'descrição', 'legislacao', 'legislação', 'norma'] }
            ]
        },
        {
            sheetNames: ['Séries_DFe', 'Series_DFe', 'DFe', 'DF-e', 'Series_dfe'],
            requiredCols: [
                { key: 'documento_cliente', label: 'documento_cliente', aliases: ['documento_cliente', 'documento', 'cnpj', 'cpf'] },
                { key: 'tipo_dfe', label: 'tipo_dfe', aliases: ['tipo_dfe', 'tipo', 'tipo dfe'] },
                { key: 'serie', label: 'serie', aliases: ['serie', 'série'] }
            ]
        }
    ];

    for (const rule of secondaryStructureRules) {
        const matchedSheetName = wb.SheetNames.find(n =>
            rule.sheetNames.some(target => target.toLowerCase().trim() === n.toLowerCase().trim())
        );
        if (matchedSheetName) {
            const sheet = wb.Sheets[matchedSheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            if (rows && rows.length > 1) {
                const headers = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
                for (const req of rule.requiredCols) {
                    const found = headers.some(h => req.aliases.includes(h));
                    if (!found) {
                        throw new Error(
                            `Estrutura da planilha inválida na aba "${matchedSheetName}": A coluna obrigatória "${req.label}" não foi encontrada. ` +
                            `Certifique-se de não alterar nem renomear as colunas do modelo oficial.`
                        );
                    }
                }
            }
        }
    }

    const normalizeRowKeys = (row: any): Record<string, any> => {
        const normalized: Record<string, any> = {};
        if (!row || typeof row !== 'object') return normalized;
        for (const [key, val] of Object.entries(row)) {
            normalized[key.trim().toLowerCase()] = val;
        }
        return normalized;
    };

    const rawClients: any[] = (XLSX.utils.sheet_to_json(clientsSheet, { defval: '' }) as any[]).map(normalizeRowKeys);
    if (rawClients.length === 0) {
        throw new Error('A aba "Clientes" está vazia ou não contém registros de dados.');
    }

    // Set para verificar duplicidades dentro da própria planilha enviada
    const inSheetDocs = new Set<string>();
    const clientRows: ImportedClientRow[] = [];
    const clientMapByDoc = new Map<string, ImportedClientRow>();

    for (let index = 0; index < rawClients.length; index++) {
        const row = rawClients[index];
        const rawDoc = String(row['documento'] || row['Documento'] || row['cnpj'] || row['cpf'] || '').trim();
        const cleanDoc = sanitizeDocument(rawDoc);
        const razao = String(row['razao_social'] || row['Razão Social'] || row['razao'] || row['nome'] || '').trim();
        const rawCode = String(row['codigo'] || row['Código'] || row['code'] || '').trim();
        const rawType = String(row['tipo_pessoa'] || row['Tipo'] || '').toLowerCase();
        const rawEstablishment = String(row['estabelecimento'] || row['Estabelecimento'] || '').toLowerCase();
        const rawStatus = String(row['status'] || row['Status'] || '').trim();

        // Normalizações
        const personType: 'juridica' | 'fisica' | 'estrangeiro' =
            rawType.includes('fisica') || rawType === 'pf' ? 'fisica' :
            rawType.includes('estrangeiro') ? 'estrangeiro' : 'juridica';

        const establishmentType: 'matriz' | 'filial' =
            rawEstablishment.includes('filial') ? 'filial' : 'matriz';

        const status: 'Ativo' | 'Inativo' =
            rawStatus.toLowerCase() === 'inativo' ? 'Inativo' : 'Ativo';

        const clientItem: ImportedClientRow = {
            tempId: `client_temp_${index + 1}`,
            code: rawCode || undefined,
            person_type: personType,
            document: formatDisplayDocument(rawDoc),
            cleanDocument: cleanDoc,
            company_name: razao,
            trade_name: String(row['nome_fantasia'] || row['Nome Fantasia'] || row['fantasia'] || '').trim() || undefined,
            establishment_type: establishmentType,
            segment: String(row['segmento'] || row['Segmento'] || '').trim() || undefined,
            status: status,
            constitution_date: parseExcelDate(row['data_abertura'] || row['Data Abertura']),
            entry_date: parseExcelDate(row['data_inicio_escritorio'] || row['Data Início Escritório'] || row['data_inicio']),
            admin_partner_name: String(row['socio_nome'] || row['Sócio Nome'] || row['admin_partner_name'] || '').trim() || undefined,
            admin_partner_cpf: String(row['socio_cpf'] || '').trim() || undefined,
            admin_partner_birthdate: parseExcelDate(row['socio_data_nascimento'] || row['socio_nascimento'] || row['data_nascimento_socio'] || row['admin_partner_birthdate'] || row['nascimento_socio']),
            zip_code: String(row['cep'] || row['CEP'] || '').trim() || undefined,
            street: String(row['logradouro'] || row['Logradouro'] || row['rua'] || '').trim() || undefined,
            street_number: String(row['numero'] || row['Número'] || '').trim() || undefined,
            complement: String(row['complemento'] || row['Complemento'] || '').trim() || undefined,
            neighborhood: String(row['bairro'] || row['Bairro'] || '').trim() || undefined,
            city: String(row['cidade'] || row['Cidade'] || '').trim() || undefined,
            state: String(row['estado'] || row['Estado'] || row['uf'] || '').trim().toUpperCase() || undefined,
            validationStatus: 'valid',
            validationMessage: undefined,
            taxRegimes: [],
            contacts: [],
            inscriptions: [],
            activities: [],
            accesses: [],
            licenses: [],
            legislations: [],
            dfeSeries: []
        };

        // Regras de Validação
        if (!razao) {
            clientItem.validationStatus = 'error';
            clientItem.validationMessage = 'Razão Social não informada.';
        } else if (!cleanDoc) {
            clientItem.validationStatus = 'error';
            clientItem.validationMessage = 'Documento (CNPJ/CPF) não informado.';
        } else if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
            clientItem.validationStatus = 'error';
            clientItem.validationMessage = `Documento inválido (${cleanDoc.length} dígitos. Esperado 11 para CPF ou 14 para CNPJ).`;
        } else if (existingDocMap.has(cleanDoc)) {
            // ERRO DE DUPLICIDADE: Já existe cadastrado no sistema
            clientItem.validationStatus = 'duplicate';
            clientItem.validationMessage = 'Cliente com este CNPJ/CPF já cadastrado no escritório (Ignorado).';
        } else if (inSheetDocs.has(cleanDoc)) {
            // ERRO DE DUPLICIDADE: Duplicado dentro da própria planilha
            clientItem.validationStatus = 'duplicate';
            clientItem.validationMessage = 'CNPJ/CPF duplicado em múltiplas linhas da planilha (Ignorado).';
        }

        if (cleanDoc) {
            inSheetDocs.add(cleanDoc);
            clientMapByDoc.set(cleanDoc, clientItem);
        }

        clientRows.push(clientItem);
    }

    // Função utilitária para ler abas secundárias
    const readSecondarySheet = (sheetName: string): any[] => {
        // Tenta encontrar a sheet ignorando case e espaços
        const actualName = wb.SheetNames.find(n => n.toLowerCase().trim() === sheetName.toLowerCase().trim());
        if (!actualName) return [];
        return (XLSX.utils.sheet_to_json(wb.Sheets[actualName], { defval: '' }) as any[]).map(normalizeRowKeys);
    };

    let totalRegimes = 0;
    let totalContacts = 0;
    let totalInscriptions = 0;
    let totalActivities = 0;
    let totalAccesses = 0;
    let totalLicenses = 0;
    let totalLegislations = 0;
    let totalDfe = 0;

    // 2. Regime Tributário
    const rawRegimes = readSecondarySheet('Regime_Tributario');
    rawRegimes.forEach(r => {
        const doc = sanitizeDocument(r['documento_cliente'] || r['documento'] || r['cnpj'] || r['cpf']);
        if (!doc) return;
        const targetClient = clientMapByDoc.get(doc);
        if (targetClient) {
            const rawRegime = String(r['regime'] || r['Regime'] || 'Simples').trim();
            const rawAnnexes = String(r['anexos'] || r['Anexos'] || r['anexo'] || '').trim();
            const parsedAnnexes = rawAnnexes ? rawAnnexes.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
            targetClient.taxRegimes.push({
                documento_cliente: doc,
                regime: normalizeTaxRegime(rawRegime),
                annexes: parsedAnnexes,
                start_date: parseExcelDate(r['data_inicio'] || r['Data Início']),
                end_date: parseExcelDate(r['data_fim'] || r['Data Fim']),
                observation: String(r['observacao'] || r['Observação'] || '').trim() || undefined
            });
            totalRegimes++;
        }
    });

    // 3. Contatos
    const rawContacts = readSecondarySheet('Contatos');
    rawContacts.forEach(r => {
        const doc = sanitizeDocument(r['documento_cliente'] || r['documento'] || r['cnpj'] || r['cpf']);
        if (!doc) return;
        const targetClient = clientMapByDoc.get(doc);
        const name = String(r['nome'] || r['Nome'] || '').trim();
        if (targetClient && name) {
            const rawMain = String(r['principal'] || r['Principal'] || '').toLowerCase();
            targetClient.contacts.push({
                documento_cliente: doc,
                name,
                email: String(r['email'] || r['E-mail'] || '').trim() || undefined,
                phone_mobile: String(r['telefone_celular'] || r['Celular'] || r['telefone'] || '').trim() || undefined,
                phone_fixed: String(r['telefone_fixo'] || r['Fixo'] || '').trim() || undefined,
                is_main: rawMain === 'sim' || rawMain === 's' || rawMain === 'true' || targetClient.contacts.length === 0
            });
            totalContacts++;
        }
    });

    // 4. Inscrições
    const rawInscriptions = readSecondarySheet('Inscrições') || readSecondarySheet('Inscricoes');
    rawInscriptions.forEach(r => {
        const doc = sanitizeDocument(r['documento_cliente'] || r['documento'] || r['cnpj'] || r['cpf']);
        if (!doc) return;
        const targetClient = clientMapByDoc.get(doc);
        const number = String(r['numero'] || r['Número'] || r['inscricao'] || '').trim();
        if (targetClient && number) {
            const rawType = String(r['tipo'] || r['Tipo'] || 'Estadual').trim();
            const customName = String(r['nome_inscricao'] || r['custom_name'] || r['nome'] || '').trim();
            targetClient.inscriptions.push({
                documento_cliente: doc,
                type: rawType,
                custom_name: customName || undefined,
                number,
                observation: String(r['observacao'] || r['Observação'] || '').trim() || undefined
            });
            totalInscriptions++;
        }
    });

    // 5. Atividades CNAE
    const rawActivities = readSecondarySheet('Atividades_CNAE') || readSecondarySheet('Atividades') || readSecondarySheet('CNAE');
    rawActivities.forEach(r => {
        const doc = sanitizeDocument(r['documento_cliente'] || r['documento'] || r['cnpj'] || r['cpf']);
        if (!doc) return;
        const targetClient = clientMapByDoc.get(doc);
        const cnaeCode = String(r['cnae_codigo'] || r['cnae'] || r['Código CNAE'] || '').trim();
        if (targetClient && cnaeCode) {
            const rawOrder = String(r['tipo_ordem'] || r['Ordem'] || '').toLowerCase();
            targetClient.activities.push({
                documento_cliente: doc,
                cnae_code: cnaeCode,
                cnae_description: String(r['descricao'] || r['Descrição'] || '').trim() || undefined,
                order_type: rawOrder.includes('secund') ? 'Secundária' : 'Principal'
            });
            totalActivities++;
        }
    });

    // 6. Acessos e Portais
    const rawAccesses = readSecondarySheet('Acessos_Portais') || readSecondarySheet('Acessos');
    rawAccesses.forEach(r => {
        const doc = sanitizeDocument(r['documento_cliente'] || r['documento'] || r['cnpj'] || r['cpf']);
        if (!doc) return;
        const targetClient = clientMapByDoc.get(doc);
        const name = String(r['nome_acesso'] || r['portal'] || r['Nome Acesso'] || '').trim();
        if (targetClient && name) {
            targetClient.accesses.push({
                documento_cliente: doc,
                access_name: name,
                username: String(r['usuario'] || r['login'] || '').trim() || undefined,
                password: String(r['senha'] || r['password'] || '').trim() || undefined,
                sector: String(r['setor'] || r['Setor'] || '').trim() || undefined,
                access_url: String(r['url_acesso'] || r['url'] || r['link'] || '').trim() || undefined
            });
            totalAccesses++;
        }
    });

    // 7. Licenças e Alvarás
    const rawLicenses = readSecondarySheet('Licenças_Alvarás') || readSecondarySheet('Licencas') || readSecondarySheet('Alvaras');
    rawLicenses.forEach(r => {
        const doc = sanitizeDocument(r['documento_cliente'] || r['documento'] || r['cnpj'] || r['cpf']);
        if (!doc) return;
        const targetClient = clientMapByDoc.get(doc);
        const name = String(r['nome_licenca'] || r['licenca'] || r['Nome Licença'] || '').trim();
        if (targetClient && name) {
            targetClient.licenses.push({
                documento_cliente: doc,
                license_name: name,
                license_number: String(r['numero'] || r['Número'] || '').trim() || undefined,
                expiry_date: parseExcelDate(r['vencimento'] || r['Vencimento'] || r['data_vencimento']),
                access_url: String(r['link_acesso'] || r['link'] || r['url'] || '').trim() || undefined
            });
            totalLicenses++;
        }
    });

    // 8. Legislações
    const rawLegs = readSecondarySheet('Legislações') || readSecondarySheet('Legislacoes');
    rawLegs.forEach(r => {
        const doc = sanitizeDocument(r['documento_cliente'] || r['documento'] || r['cnpj'] || r['cpf']);
        if (!doc) return;
        const targetClient = clientMapByDoc.get(doc);
        const desc = String(r['descricao'] || r['Descrição'] || r['legislacao'] || '').trim();
        if (targetClient && desc) {
            targetClient.legislations.push({
                documento_cliente: doc,
                description: desc,
                status: String(r['status'] || r['Status'] || 'Vigente').trim() || undefined,
                access_url: String(r['link_acesso'] || r['link'] || r['url'] || '').trim() || undefined
            });
            totalLegislations++;
        }
    });

    // 9. Séries DF-e
    const rawDfe = readSecondarySheet('Séries_DFe') || readSecondarySheet('Series_DFe') || readSecondarySheet('DFe');
    rawDfe.forEach(r => {
        const doc = sanitizeDocument(r['documento_cliente'] || r['documento'] || r['cnpj'] || r['cpf']);
        if (!doc) return;
        const targetClient = clientMapByDoc.get(doc);
        const dfeType = String(r['tipo_dfe'] || r['tipo'] || 'NF-e').trim();
        const series = String(r['serie'] || r['Série'] || '1').trim();
        if (targetClient && series) {
            targetClient.dfeSeries.push({
                documento_cliente: doc,
                dfe_type: dfeType,
                series,
                issuer: String(r['emissor'] || r['Emissor'] || '').trim() || undefined,
                username: String(r['usuario'] || r['login'] || '').trim() || undefined,
                password: String(r['senha'] || r['password'] || '').trim() || undefined,
                login_url: String(r['login_url'] || r['url'] || '').trim() || undefined
            });
            totalDfe++;
        }
    });

    const validCount = clientRows.filter(r => r.validationStatus === 'valid').length;
    const duplicateCount = clientRows.filter(r => r.validationStatus === 'duplicate').length;
    const errorCount = clientRows.filter(r => r.validationStatus === 'error').length;

    return {
        totalRows: clientRows.length,
        validCount,
        duplicateCount,
        errorCount,
        rows: clientRows,
        secondaryStats: {
            taxRegimes: totalRegimes,
            contacts: totalContacts,
            inscriptions: totalInscriptions,
            activities: totalActivities,
            accesses: totalAccesses,
            licenses: totalLicenses,
            legislations: totalLegislations,
            dfeSeries: totalDfe
        }
    };
};

/**
 * Executa a importação no Supabase em lotes com callback de progresso
 */
export const executeClientBatchImport = async (
    validClients: ImportedClientRow[],
    orgId: string,
    onProgress: (percent: number, message: string) => void
): Promise<{
    importedClientsCount: number;
    skippedCount: number;
    secondaryCounts: { [key: string]: number };
    errors: string[];
}> => {
    if (!orgId) {
        throw new Error('Identificador da Organização (org_id) não encontrado.');
    }

    const total = validClients.length;
    if (total === 0) {
        return {
            importedClientsCount: 0,
            skippedCount: 0,
            secondaryCounts: {},
            errors: ['Nenhum cliente válido para importar.']
        };
    }

    let importedCount = 0;
    const errors: string[] = [];
    const secondaryCounts = {
        taxRegimes: 0,
        contacts: 0,
        inscriptions: 0,
        activities: 0,
        accesses: 0,
        licenses: 0,
        legislations: 0,
        dfeSeries: 0
    };

    for (let i = 0; i < total; i++) {
        const client = validClients[i];
        const currentPercent = Math.round(((i + 1) / total) * 100);
        onProgress(currentPercent, `Importando (${i + 1}/${total}): ${client.company_name}...`);

        try {
            // 1. Inserir cliente principal
            const clientPayload = {
                org_id: orgId,
                code: client.code || null,
                company_name: client.company_name,
                trade_name: client.trade_name || null,
                document: client.document,
                status: client.status,
                segment: client.segment || null,
                person_type: client.person_type,
                constitution_date: client.constitution_date || null,
                entry_date: client.entry_date || null,
                admin_partner_name: client.admin_partner_name || null,
                admin_partner_cpf: client.admin_partner_cpf || null,
                admin_partner_birthdate: client.admin_partner_birthdate || null,
                establishment_type: client.establishment_type,
                zip_code: client.zip_code || null,
                street: client.street || null,
                street_number: client.street_number || null,
                complement: client.complement || null,
                neighborhood: client.neighborhood || null,
                city: client.city || null,
                state: client.state || null
            };

            const { data: insertedClient, error: clientInsertErr } = await (supabase.from('clients') as any)
                .insert(clientPayload)
                .select('id')
                .single();

            if (clientInsertErr) {
                throw clientInsertErr;
            }

            const clientId = insertedClient?.id;
            if (!clientId) {
                throw new Error('Falha ao obter ID do cliente inserido.');
            }

            importedCount++;

            // 2. Inserir Regime Tributário
            if (client.taxRegimes.length > 0) {
                const regimesToInsert = client.taxRegimes.map(r => ({
                    client_id: clientId,
                    regime: r.regime,
                    start_date: r.start_date || null,
                    end_date: r.end_date || null,
                    observation: r.observation || null,
                    annexes: r.annexes || []
                }));
                const { error: regErr } = await (supabase.from('client_tax_regime_history') as any).insert(regimesToInsert);
                if (!regErr) secondaryCounts.taxRegimes += regimesToInsert.length;
            }

            // 3. Inserir Contatos
            if (client.contacts.length > 0) {
                const contactsToInsert = client.contacts.map(c => ({
                    client_id: clientId,
                    name: c.name,
                    email: c.email || null,
                    phone_mobile: c.phone_mobile || null,
                    phone_fixed: c.phone_fixed || null,
                    is_main: c.is_main ?? false
                }));
                const { error: contErr } = await (supabase.from('client_contacts') as any).insert(contactsToInsert);
                if (!contErr) secondaryCounts.contacts += contactsToInsert.length;
            }

            // 4. Inserir Inscrições
            if (client.inscriptions.length > 0) {
                const inscToInsert = client.inscriptions.map(insc => ({
                    client_id: clientId,
                    type: insc.type,
                    custom_name: insc.custom_name || null,
                    number: insc.number,
                    observation: insc.observation || null
                }));
                const { error: inscErr } = await (supabase.from('client_inscriptions') as any).insert(inscToInsert);
                if (!inscErr) secondaryCounts.inscriptions += inscToInsert.length;
            }

            // 5. Inserir Atividades CNAE
            if (client.activities.length > 0) {
                const actToInsert = client.activities.map(act => ({
                    client_id: clientId,
                    cnae_code: act.cnae_code,
                    cnae_description: act.cnae_description || null,
                    order_type: act.order_type
                }));
                const { error: actErr } = await (supabase.from('client_activities') as any).insert(actToInsert);
                if (!actErr) secondaryCounts.activities += actToInsert.length;
            }

            // 6. Inserir Acessos e Portais
            if (client.accesses.length > 0) {
                const accToInsert = client.accesses.map(acc => ({
                    client_id: clientId,
                    access_name: acc.access_name,
                    username: acc.username || null,
                    password: acc.password || null,
                    sector: acc.sector || null,
                    access_url: acc.access_url || null
                }));
                const { error: accErr } = await (supabase.from('client_accesses') as any).insert(accToInsert);
                if (!accErr) secondaryCounts.accesses += accToInsert.length;
            }

            // 7. Inserir Licenças e Alvarás
            if (client.licenses.length > 0) {
                const licToInsert = client.licenses.map(lic => ({
                    client_id: clientId,
                    license_name: lic.license_name,
                    license_number: lic.license_number || null,
                    expiry_date: lic.expiry_date || null,
                    access_url: lic.access_url || null
                }));
                const { error: licErr } = await (supabase.from('client_licenses') as any).insert(licToInsert);
                if (!licErr) secondaryCounts.licenses += licToInsert.length;
            }

            // 8. Inserir Legislações
            if (client.legislations.length > 0) {
                const legToInsert = client.legislations.map(leg => ({
                    client_id: clientId,
                    description: leg.description,
                    status: leg.status || 'Vigente',
                    access_url: leg.access_url || null
                }));
                const { error: legErr } = await (supabase.from('client_legislations') as any).insert(legToInsert);
                if (!legErr) secondaryCounts.legislations += legToInsert.length;
            }

            // 9. Inserir Séries DF-e
            if (client.dfeSeries.length > 0) {
                const dfeToInsert = client.dfeSeries.map(dfe => ({
                    client_id: clientId,
                    dfe_type: dfe.dfe_type,
                    series: dfe.series,
                    issuer: dfe.issuer || null,
                    username: dfe.username || null,
                    password: dfe.password || null,
                    login_url: dfe.login_url || null
                }));
                const { error: dfeErr } = await (supabase.from('client_dfe_series') as any).insert(dfeToInsert);
                if (!dfeErr) secondaryCounts.dfeSeries += dfeToInsert.length;
            }

        } catch (err: any) {
            console.error(`Erro ao importar cliente ${client.company_name}:`, err);
            errors.push(`${client.company_name} (${client.document}): ${err.message || 'Erro desconhecido'}`);
        }
    }

    return {
        importedClientsCount: importedCount,
        skippedCount: total - importedCount,
        secondaryCounts,
        errors
    };
};
