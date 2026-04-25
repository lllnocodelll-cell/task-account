import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

interface VideoCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: string;
    userName: string;
    roomName: string;
    roomUrl: string; // URL originada pela API
    isVideoEnabled?: boolean;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
    isOpen,
    onClose,
    channelId,
    userName,
    roomName,
    roomUrl,
    isVideoEnabled = true
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const callFrameRef = useRef<HTMLDivElement>(null);
    const dailyRef = useRef<DailyCall | null>(null);

    const joinMeeting = useCallback(async () => {
        if (!callFrameRef.current || !roomUrl) return;

        if (dailyRef.current) {
            dailyRef.current.destroy();
        }

        const callObject = DailyIframe.createFrame(callFrameRef.current, {
            iframeStyle: {
                width: '100%',
                height: '100%',
                border: '0',
                backgroundColor: '#0f172a',
            },
            showLeaveButton: true,
            showFullscreenButton: true, // Adiciona botões flat bonitos do Daily nativos
        });

        dailyRef.current = callObject;

        await callObject.join({
            url: roomUrl,
            userName: userName,
            startVideoOff: !isVideoEnabled,
        });

        callObject.on('left-meeting', () => {
            onClose();
        });

    }, [roomUrl, userName, isVideoEnabled, onClose]);

    useEffect(() => {
        if (isOpen && roomUrl) {
            joinMeeting();
        }

        return () => {
            if (dailyRef.current) {
                dailyRef.current.destroy();
                dailyRef.current = null;
            }
        };
    }, [isOpen, roomUrl, joinMeeting]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
            <div
                className={`bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${isFullscreen ? 'w-full h-full rounded-none' : 'w-[90vw] h-[85vh] max-w-6xl'
                    }`}
            >
                {/* Header da Chamada */}
                <div className="h-14 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between px-6 shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${isVideoEnabled ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                        <h3 className="font-semibold text-white">
                            {isVideoEnabled ? 'Chamada de Vídeo' : 'Chamada de Áudio'} - {roomName}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                        >
                            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        <button
                            onClick={() => {
                                if (dailyRef.current) dailyRef.current.leave();
                                onClose();
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700 rounded-lg transition-colors ml-2"
                            title="Encerrar Chamada"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Container do DailyIframe */}
                <div className="flex-1 bg-slate-900 relative" ref={callFrameRef}>
                    {!roomUrl && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                            Carregando sala segura...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
