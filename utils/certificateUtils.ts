import forge from 'node-forge';

export interface ExtractedCertificateData {
  companyName: string;
  document?: string; // CNPJ/CPF Se encontrável
  issuer: string;
  validFrom: string; // ISO String
  validTo: string; // ISO String
}

export const readA1Certificate = async (file: File, password: string): Promise<ExtractedCertificateData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) throw new Error("Falha ao ler o buffer do arquivo");

        // Transforma o ArrayBuffer em uma string binária para o forge parsear
        const forgeBuffer = forge.util.createBuffer(new Uint8Array(arrayBuffer));
        
        // Decodifica o ASN.1
        const asn1 = forge.asn1.fromDer(forgeBuffer);
        
        // Descriptografa e parseia o arquivo PKCS#12
        const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);

        // Extrai o bag de certificados
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = certBags[forge.pki.oids.certBag]?.[0];

        if (!certBag || !certBag.cert) {
           return reject(new Error("Nenhum certificado carregável foi encontrado no arquivo fornecido."));
        }

        const cert = certBag.cert;

        // Extrai datas de validade
        const validFrom = cert.validity.notBefore.toISOString();
        const validTo = cert.validity.notAfter.toISOString();

        // Atributos de Sujeito (Empresa) e Emissor
        const subjectFields = cert.subject.attributes;
        const issuerFields = cert.issuer.attributes;

        const getAttr = (attrs: any[], shortName: string) => attrs.find(a => a.shortName === shortName || a.name === shortName)?.value;
        const getAttrByOid = (attrs: any[], oid: string) => attrs.find(a => a.type === oid)?.value;

        // 'CN' = Common Name
        let companyName = getAttr(subjectFields, 'CN') as string || "Nome Desconhecido";
        let document = getAttrByOid(subjectFields, '2.16.76.1.3.3') as string | undefined; // OID de CNPJ da ICP-Brasil

        // Trata os casos onde o CNPJ vem atrelado ao CN: "EMPRESA EXEMPLO LTDA:11222333000199"
        if (!document && companyName.includes(':')) {
           const parts = companyName.split(':');
           if (parts.length >= 2 && /[0-9]{11,14}/.test(parts[parts.length - 1])) {
               document = parts[parts.length - 1];
               companyName = parts.slice(0, parts.length - 1).join(':'); // remove a parte do CNPJ do nome
           }
        }

        const issuerO = getAttr(issuerFields, 'O');
        const issuerCN = getAttr(issuerFields, 'CN');
        const issuerName = (issuerO || issuerCN || "Emissor Desconhecido") as string;

        resolve({
          companyName,
          document,
          issuer: issuerName,
          validFrom,
          validTo
        });

      } catch (err: any) {
        if (err.message && (err.message.includes('password') || err.message.includes('MAC verify context'))) {
           reject(new Error("Senha incorreta ou arquivo corrompido."));
        } else {
           reject(new Error("Erro ao interpretar o certificado. Tem certeza de que este é um certificado A1 (.pfx/.p12) válido?"));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo selecionado no sistema de arquivos."));
    };

    reader.readAsArrayBuffer(file);
  });
};
