import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  FileSpreadsheet,
  File as GenericFileIcon,
  Loader2,
  Table as TableIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tooltip } from '../ui/Tooltip';

export interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType = '',
  fileSize
}) => {
  const [sheets, setSheets] = useState<{ name: string; data: any[][] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [officeViewerType, setOfficeViewerType] = useState<'microsoft' | 'google'>('microsoft');
  const [sheetSearch, setSheetSearch] = useState('');

  const cleanUrl = (fileUrl || '').trim();
  const lowerUrl = cleanUrl.toLowerCase();
  const lowerName = (fileName || '').toLowerCase();
  const lowerType = (fileType || '').toLowerCase();

  const isPdf =
    lowerType.includes('pdf') ||
    lowerName.endsWith('.pdf') ||
    /\.pdf($|\?)/i.test(lowerUrl);

  const isImage =
    !isPdf &&
    (lowerType.startsWith('image/') ||
      /\.(jpeg|jpg|png|gif|webp|svg|bmp)($|\?)/i.test(lowerUrl) ||
      /\.(jpeg|jpg|png|gif|webp|svg|bmp)$/i.test(lowerName));

  const isVideo =
    !isPdf &&
    !isImage &&
    (lowerType.startsWith('video/') ||
      /\.(mp4|webm|mov|mkv|m4v)($|\?)/i.test(lowerUrl) ||
      /\.(mp4|webm|mov|mkv|m4v)$/i.test(lowerName));

  const isSpreadsheet =
    !isPdf &&
    !isImage &&
    !isVideo &&
    (lowerType.includes('sheet') ||
      lowerType.includes('excel') ||
      lowerType.includes('csv') ||
      /\.(xlsx|xls|csv)$/i.test(lowerName) ||
      /\.(xlsx|xls|csv)($|\?)/i.test(lowerUrl));

  const isWord =
    !isPdf &&
    !isImage &&
    !isVideo &&
    !isSpreadsheet &&
    (lowerType.includes('word') ||
      lowerType.includes('officedocument.wordprocessingml') ||
      /\.(docx|doc)$/i.test(lowerName) ||
      /\.(docx|doc)($|\?)/i.test(lowerUrl));

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Carregar dados de planilha localmente quando for planilha
  useEffect(() => {
    if (!isOpen || !isSpreadsheet || !cleanUrl) {
      setSheets([]);
      setSheetError(null);
      return;
    }

    let isCancelled = false;
    setLoadingSheet(true);
    setSheetError(null);
    setSheetSearch('');

    fetch(cleanUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (isCancelled) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        const parsed = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
          return { name, data };
        });

        if (parsed.length === 0 || parsed[0].data.length === 0) {
          setSheetError('A planilha está vazia.');
        } else {
          setSheets(parsed);
          setActiveSheetIndex(0);
        }
        setLoadingSheet(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('Não foi possível ler a planilha via XLSX local:', err);
        setSheetError('Não foi possível abrir a planilha localmente.');
        setLoadingSheet(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, isSpreadsheet, cleanUrl]);

  if (!isOpen || !cleanUrl) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = cleanUrl;
      link.download = fileName || 'arquivo';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // URLs do Office Viewer / Google Docs Viewer para URLs públicas
  const isBlobUrl = cleanUrl.startsWith('blob:');
  const encodedUrl = encodeURIComponent(cleanUrl);
  const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

  const activeSheet = sheets[activeSheetIndex];
  const activeRows = activeSheet?.data || [];

  // Filtragem rápida de linhas da planilha se houver busca
  const filteredRows = sheetSearch.trim()
    ? activeRows.filter((row, idx) => {
        if (idx === 0) return true; // Mantém o cabeçalho
        return row.some((cell) =>
          String(cell).toLowerCase().includes(sheetSearch.toLowerCase())
        );
      })
    : activeRows;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10050] flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container Principal */}
      <div className="relative flex flex-col w-full max-w-5xl max-h-[95vh] bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-800 text-slate-100 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                isPdf
                  ? 'bg-rose-500/20 text-rose-400'
                  : isVideo
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : isImage
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isSpreadsheet
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isWord
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {isPdf ? (
                <FileText size={18} />
              ) : isVideo ? (
                <VideoIcon size={18} />
              ) : isImage ? (
                <ImageIcon size={18} />
              ) : isSpreadsheet ? (
                <FileSpreadsheet size={18} />
              ) : isWord ? (
                <FileText size={18} />
              ) : (
                <GenericFileIcon size={18} />
              )}
            </div>

            <div className="min-w-0">
              <Tooltip content={fileName || 'Arquivo'} position="bottom">
                <h3 className="text-sm font-semibold truncate text-slate-100 max-w-[260px] sm:max-w-md cursor-default">
                  {fileName || 'Pré-visualização do Arquivo'}
                </h3>
              </Tooltip>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>
                  {isPdf
                    ? 'Documento PDF'
                    : isVideo
                    ? 'Vídeo'
                    : isImage
                    ? 'Imagem'
                    : isSpreadsheet
                    ? 'Planilha Excel / CSV'
                    : isWord
                    ? 'Documento Word'
                    : 'Arquivo'}
                </span>
                {fileSize && fileSize > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(fileSize)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação com Tooltips do Sistema */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Tooltip content="Baixar arquivo" position="bottom">
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Baixar arquivo"
              >
                <Download size={18} />
              </button>
            </Tooltip>

            <Tooltip content="Abrir original em nova aba" position="bottom">
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer block"
                aria-label="Abrir em nova aba"
              >
                <ExternalLink size={18} />
              </a>
            </Tooltip>

            <Tooltip content="Fechar (Esc)" position="bottom">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Área de Visualização */}
        <div className="relative flex-1 min-h-[350px] flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 overflow-hidden">
          {/* Imagens */}
          {isImage && (
            <div className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar">
              <img
                src={cleanUrl}
                alt={fileName || 'Pré-visualização'}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md select-none transition-transform"
                loading="eager"
              />
            </div>
          )}

          {/* Vídeos */}
          {isVideo && (
            <div className="w-full h-full flex items-center justify-center">
              <video
                src={cleanUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[75vh] max-w-full rounded-xl shadow-2xl bg-black outline-hidden"
              >
                Seu navegador não suporta a reprodução deste formato de vídeo.
              </video>
            </div>
          )}

          {/* PDFs */}
          {isPdf && (
            <div className="w-full h-[75vh] flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
              <iframe
                src={`${cleanUrl}#toolbar=1&navpanes=0`}
                title={fileName || 'Visualizador de PDF'}
                className="w-full h-full border-0 bg-white"
              />
              <div className="p-2 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
                <span>Não está visualizando o PDF corretamente?</span>
                <Tooltip content="Abrir PDF em nova aba externa" position="top">
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    Abrir externamente <ExternalLink size={12} />
                  </a>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Planilhas (Excel / CSV) */}
          {isSpreadsheet && (
            <div className="w-full h-[75vh] flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
              {loadingSheet ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 size={32} className="animate-spin text-emerald-500" />
                  <span className="text-xs font-medium">Carregando dados da planilha...</span>
                </div>
              ) : sheets.length > 0 && !sheetError ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Barra de Ferramentas da Planilha */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 gap-3 shrink-0 flex-wrap">
                    {/* Abas */}
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar max-w-full py-0.5">
                      <div className="text-[11px] font-bold uppercase text-emerald-400 flex items-center gap-1 mr-1">
                        <TableIcon size={14} />
                        <span>Abas:</span>
                      </div>
                      {sheets.map((sheet, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveSheetIndex(idx);
                            setSheetSearch('');
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            activeSheetIndex === idx
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {sheet.name}
                        </button>
                      ))}
                    </div>

                    {/* Campo de Busca Rápida na Planilha */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Filtrar dados..."
                        value={sheetSearch}
                        onChange={(e) => setSheetSearch(e.target.value)}
                        className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {filteredRows.length > 0 ? `${filteredRows.length - 1} linhas` : '0 linhas'}
                      </span>
                    </div>
                  </div>

                  {/* Grid da Tabela */}
                  <div className="flex-1 overflow-auto custom-scrollbar bg-slate-900 text-slate-200">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        {filteredRows.length > 0 && (
                          <tr className="bg-slate-950 text-slate-300 sticky top-0 z-10 border-b border-slate-700 shadow-xs">
                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 border-r border-slate-800 w-12 bg-slate-950">
                              #
                            </th>
                            {filteredRows[0].map((headerCell: any, colIdx: number) => (
                              <th
                                key={colIdx}
                                className="px-3 py-2 text-left font-bold text-emerald-400 border-r border-slate-800 whitespace-nowrap bg-slate-950/95"
                              >
                                {headerCell !== undefined && headerCell !== '' ? String(headerCell) : `Col ${colIdx + 1}`}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {filteredRows.slice(1).map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className={`border-b border-slate-800/80 hover:bg-slate-800/50 transition-colors ${
                              rowIdx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/60'
                            }`}
                          >
                            <td className="px-3 py-1.5 text-center text-[10px] font-mono text-slate-500 border-r border-slate-800 bg-slate-950/40">
                              {rowIdx + 1}
                            </td>
                            {row.map((cell: any, cellIdx: number) => (
                              <td
                                key={cellIdx}
                                className="px-3 py-1.5 border-r border-slate-800/60 whitespace-nowrap text-slate-200"
                              >
                                {cell !== undefined ? String(cell) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Fallback para Office Online Viewer se falhar o parser local ou for solicitado */
                !isBlobUrl ? (
                  <iframe
                    src={officeViewerType === 'microsoft' ? officeUrl : googleViewerUrl}
                    title={fileName || 'Visualizador de Planilha'}
                    className="w-full h-full border-0 bg-white"
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <FileSpreadsheet size={40} className="text-emerald-500 mb-2" />
                    <p className="text-sm text-slate-300 mb-1">Planilha pronta para envio</p>
                    <p className="text-xs text-slate-400">
                      Após o envio, a planilha estará acessível para visualização completa.
                    </p>
                  </div>
                )
              )}

              {/* Rodapé com Ações da Planilha */}
              <div className="p-2 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between px-4">
                <span>Leitor de planilhas nativo integrado</span>
                {!isBlobUrl && (
                  <div className="flex items-center gap-3">
                    <Tooltip content="Alternar entre Microsoft Office e Google Viewer" position="top">
                      <button
                        type="button"
                        onClick={() => setOfficeViewerType(officeViewerType === 'microsoft' ? 'google' : 'microsoft')}
                        className="text-emerald-400 hover:underline cursor-pointer"
                      >
                        {officeViewerType === 'microsoft' ? 'Alternar para Google Viewer' : 'Alternar para Office Viewer'}
                      </button>
                    </Tooltip>
                    <Tooltip content="Abrir planilha em nova aba" position="top">
                      <a
                        href={cleanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-white inline-flex items-center gap-1"
                      >
                        Abrir original <ExternalLink size={12} />
                      </a>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documentos Word (.docx, .doc) */}
          {isWord && (
            <div className="w-full h-[75vh] flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
              {!isBlobUrl ? (
                <>
                  <iframe
                    src={officeViewerType === 'microsoft' ? officeUrl : googleViewerUrl}
                    title={fileName || 'Visualizador Word'}
                    className="w-full h-full border-0 bg-white"
                  />
                  <div className="p-2 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between px-4">
                    <span>Visualizador Oficial do Documento</span>
                    <div className="flex items-center gap-3">
                      <Tooltip content="Alternar entre Microsoft Office e Google Viewer" position="top">
                        <button
                          type="button"
                          onClick={() =>
                            setOfficeViewerType(officeViewerType === 'microsoft' ? 'google' : 'microsoft')
                          }
                          className="text-blue-400 hover:underline cursor-pointer font-medium"
                        >
                          {officeViewerType === 'microsoft'
                            ? 'Alternar para Google Viewer'
                            : 'Alternar para Microsoft Office Viewer'}
                        </button>
                      </Tooltip>
                      <Tooltip content="Abrir documento Word em nova aba" position="top">
                        <a
                          href={cleanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 hover:text-white inline-flex items-center gap-1"
                        >
                          Abrir externamente <ExternalLink size={12} />
                        </a>
                      </Tooltip>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-4 shadow-inner">
                    <FileText size={32} />
                  </div>
                  <h4 className="text-base font-semibold text-slate-200 mb-1">{fileName}</h4>
                  <p className="text-xs text-slate-400 mb-6">
                    Documento Word selecionado. O visualizador integrado da Microsoft estará disponível assim que a mensagem for enviada.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg transition-colors cursor-pointer"
                  >
                    <Download size={16} />
                    Baixar Arquivo {fileSize ? `(${formatFileSize(fileSize)})` : ''}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Outros arquivos sem visualização */}
          {!isImage && !isVideo && !isPdf && !isSpreadsheet && !isWord && (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mb-4 shadow-inner">
                <GenericFileIcon size={32} />
              </div>
              <h4 className="text-base font-semibold text-slate-200 mb-1">{fileName}</h4>
              <p className="text-xs text-slate-400 mb-6">
                Este tipo de arquivo não possui pré-visualização inline disponível. Você pode baixá-lo ou abri-lo em um visualizador externo.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                <Download size={16} />
                Baixar Arquivo {fileSize ? `(${formatFileSize(fileSize)})` : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
