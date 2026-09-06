import imageCompression from 'browser-image-compression';

export interface FileCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  initialQuality?: number;
}

/**
 * Comprime e otimiza imagens de forma transparente e em segundo plano (Web Worker),
 * preservando a nitidez total de textos, números contábeis, carimbos e códigos de barra.
 * 
 * - Imagens (JPEG, PNG, WebP) pesadas (ex: fotos de celular de 5 a 12 MB) são reduzidas em até 90% (~300-800 KB).
 * - Arquivos que NÃO são imagens (PDFs, XMLs, planilhas Excel, DOCX) NÃO são alterados e retornam intactos.
 * - Imagens já leves (≤ 300 KB) não são reprocessadas.
 * - Em caso de qualquer falha do ambiente, retorna o arquivo original com segurança total (fallback).
 */
export async function compressFileIfNeeded(
  file: File,
  options?: FileCompressionOptions
): Promise<File> {
  // 1. Validação básica de entrada
  if (!file || !(file instanceof File)) {
    return file;
  }

  // 2. Apenas imagens rasterizadas são otimizadas (ignora PDFs, XMLs, DOCX, SVG, etc.)
  const isRasterImage = 
    file.type.startsWith('image/') && 
    !file.type.includes('svg') && 
    !file.type.includes('gif');

  if (!isRasterImage) {
    return file;
  }

  // 3. Imagens que já são leves (menores ou iguais a 300 KB) permanecem inalteradas
  const THRESHOLD_BYTES = 300 * 1024;
  if (file.size <= THRESHOLD_BYTES) {
    return file;
  }

  try {
    const compressionConfig = {
      maxSizeMB: options?.maxSizeMB ?? 0.8, // Teto máximo ~800 KB
      maxWidthOrHeight: options?.maxWidthOrHeight ?? 1920, // Resolução Full HD (excelente para comprovantes)
      useWebWorker: options?.useWebWorker ?? true, // Não trava o thread principal do smartphone
      initialQuality: options?.initialQuality ?? 0.85, // 85% de qualidade (fidelidade visual impecável)
    };

    const compressedBlob = await imageCompression(file, compressionConfig);

    // Se o arquivo resultante não ficou menor, preserva o original
    if (compressedBlob.size >= file.size) {
      return file;
    }

    // Retorna novo objeto File preservando o nome original do arquivo
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type || file.type,
      lastModified: Date.now()
    });
  } catch (error) {
    console.warn('[fileCompression] Falha ao otimizar arquivo, prosseguindo com original:', error);
    return file; // Fallback gracioso
  }
}

/**
 * Comprime uma lista de arquivos de forma assíncrona.
 */
export async function compressFilesIfNeeded(
  files: File[],
  options?: FileCompressionOptions
): Promise<File[]> {
  if (!files || files.length === 0) return [];
  return Promise.all(files.map(f => compressFileIfNeeded(f, options)));
}
