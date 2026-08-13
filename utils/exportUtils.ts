/**
 * Utilitário para exportar dados no formato CSV (compatível com Microsoft Excel em PT-BR)
 */
export const exportToCSV = (filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) => {
    // Sanitização e conversão de células para formato CSV com delimitador ';'
    const formatCell = (val: any): string => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const headerLine = headers.map(formatCell).join(';');
    const rowLines = rows.map(row => row.map(formatCell).join(';'));
    
    // Unir linhas com quebra de linha padrão do Windows (\r\n)
    const csvContent = [headerLine, ...rowLines].join('\r\n');

    // Adicionar marcação UTF-8 BOM (\uFEFF) para forçar o Excel a abrir acentos corretamente
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
