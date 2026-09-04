import { generateInviteLink, parseInviteToken } from '../utils/inviteLink.ts';

// Simular ambiente de window para node
global.window = {
  location: {
    origin: 'http://localhost:5173'
  }
};
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');

console.log('=== TESTE DE LINKS DE CONVITE E ATIVAÇÃO ===');

const mockInvite = {
  memberId: 'd198bbd4-8d48-439d-b657-3f3fb6681021',
  email: 'colaborador.teste@escritorio.com.br',
  name: 'Mariana Castro',
  role: 'operacional',
  orgId: 'a45f9c10-5321-4a11-889c-0192837465ab',
  orgName: 'Castro & Associados Contabilidade'
};

const link = generateInviteLink(mockInvite);
console.log('Link gerado:', link);

const tokenMatch = link.match(/invite=([^&]+)/);
if (!tokenMatch) {
  console.error('FALHA: Token não encontrado na URL');
  process.exit(1);
}

const parsed = parseInviteToken(tokenMatch[1]);
console.log('Token decodificado:', parsed);

if (
  parsed.memberId === mockInvite.memberId &&
  parsed.email === mockInvite.email &&
  parsed.name === mockInvite.name &&
  parsed.role === mockInvite.role &&
  parsed.orgId === mockInvite.orgId &&
  parsed.orgName === mockInvite.orgName
) {
  console.log('✅ TESTE UNITÁRIO DE CONVITE PASSOU COM SUCESSO!');
} else {
  console.error('❌ DADOS DECODIFICADOS NÃO CONFEREM!');
  process.exit(1);
}
