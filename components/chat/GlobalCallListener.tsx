import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Video, PhoneCall, PhoneOff } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { getOrCreateDailyRoom } from '../../utils/dailyApi';
import { VideoCallModal } from './VideoCallModal';

interface GlobalCallListenerProps {
    userId?: string;
    userName?: string;
}

export const GlobalCallListener: React.FC<GlobalCallListenerProps> = ({ userId, userName }) => {
    const [incomingCall, setIncomingCall] = useState<{
        channelId: string;
        callerName: string;
        isVideoEnabled: boolean;
    } | null>(null);

    const [callState, setCallState] = useState<{
        isOpen: boolean;
        isVideoEnabled: boolean;
        roomUrl: string;
        channelId: string;
        roomName: string;
    }>({
        isOpen: false,
        isVideoEnabled: true,
        roomUrl: '',
        channelId: '',
        roomName: ''
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const audio = new Audio('https://cdn.freesound.org/previews/415/415516_5121236-lq.mp3');
        audio.loop = true;
        audioRef.current = audio;

        return () => {
            audio.pause();
            audio.currentTime = 0;
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!userId) return;

        const sub = supabase
            .channel('global-calls-db')
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_calls' as any,
                    filter: `target_id=eq.${userId}` 
                },
                async (payload) => {
                    const newCall = payload.new as any;
                    
                    // Buscar nome do chamador para exibição
                    let callerName = 'Alguém';
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', newCall.caller_id)
                        .single();
                    if (profile) callerName = profile.full_name;

                    setIncomingCall({
                        channelId: newCall.channel_id,
                        callerName: callerName,
                        isVideoEnabled: newCall.is_video
                    });

                    // Tentar tocar áudio
                    audioRef.current?.play().catch(e => console.log('Autoplay bloqueado pelo navegador:', e));

                    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
                    ringTimeoutRef.current = setTimeout(() => {
                        handleDeclineCall();
                    }, 30000); // 30 segundos de toque antes de desistir
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, [userId]);

    const handleDeclineCall = () => {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
        setIncomingCall(null);
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);

        const targetChannelId = incomingCall.channelId;
        const isVideo = incomingCall.isVideoEnabled;
        const rName = incomingCall.callerName;
        setIncomingCall(null);

        try {
            const safeRoomName = `TaskAccount_${targetChannelId.replace(/-/g, '')}`;
            const url = await getOrCreateDailyRoom(safeRoomName);

            setCallState({
                isOpen: true,
                isVideoEnabled: isVideo,
                roomUrl: url,
                channelId: targetChannelId,
                roomName: rName,
            });
        } catch (err) {
            console.error('Erro ao conectar', err);
            alert('Falha interna ao conectar com servidor de vídeo.');
        }
    };

    return (
        <>
            {incomingCall && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-md transition-all duration-300">
                    <div className="bg-slate-900 rounded-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in duration-300 border border-slate-700">
                        <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 relative">
                            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping"></div>
                            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                {incomingCall.isVideoEnabled ? <Video size={32} /> : <PhoneCall size={32} />}
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">{incomingCall.callerName}</h2>
                        <p className="text-slate-400 mb-8">
                            {incomingCall.isVideoEnabled ? 'Chamada de vídeo recebida...' : 'Chamada de áudio recebida...'}
                        </p>

                        <div className="flex w-full gap-4">
                            <button
                                onClick={handleDeclineCall}
                                className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-medium transition-colors border border-red-500/20 flex flex-col items-center justify-center gap-2"
                            >
                                <PhoneOff size={24} />
                                <span>Recusar</span>
                            </button>
                            <button
                                onClick={handleAcceptCall}
                                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/30 flex flex-col items-center justify-center gap-2"
                            >
                                {incomingCall.isVideoEnabled ? <Video size={24} /> : <PhoneCall size={24} />}
                                <span>Atender</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {callState.isOpen && (
                <VideoCallModal
                    isOpen={callState.isOpen}
                    onClose={() => setCallState(prev => ({ ...prev, isOpen: false }))}
                    channelId={callState.channelId}
                    userName={userName || 'Usuário'}
                    roomName={callState.roomName}
                    roomUrl={callState.roomUrl}
                    isVideoEnabled={callState.isVideoEnabled}
                />
            )}
        </>
    );
};
