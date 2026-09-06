const XLSX = require('xlsx');

const sanitizeDocument = (doc) => {
    if (!doc) return '';
    return String(doc).replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
};

const wb = XLSX.readFile('scratch/test_model.xlsx');
console.log('Sheets encontradas:', wb.SheetNames);

const clients = XLSX.utils.sheet_to_json(wb.Sheets['Clientes']);
console.log('Clientes lidos:', clients.length, clients.map(c => ({ doc: c.documento, nome: c.razao_social })));

const regimes = XLSX.utils.sheet_to_json(wb.Sheets['Regime_Tributario']);
console.log('Regimes lidos:', regimes.length, regimes.map(r => ({ doc: r.documento_cliente, regime: r.regime })));

const contacts = XLSX.utils.sheet_to_json(wb.Sheets['Contatos']);
console.log('Contatos lidos:', contacts.length, contacts.map(c => ({ doc: c.documento_cliente, nome: c.nome })));

const inscriptions = XLSX.utils.sheet_to_json(wb.Sheets['Inscrições']);
console.log('Inscrições lidas:', inscriptions.length, inscriptions.map(i => ({ doc: i.documento_cliente, tipo: i.tipo, num: i.numero })));

const legislations = XLSX.utils.sheet_to_json(wb.Sheets['Legislações']);
console.log('Legislações lidas:', legislations.length, legislations.map(l => ({ doc: l.documento_cliente, desc: l.descricao })));
