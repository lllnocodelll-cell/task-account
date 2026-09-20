import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tratar requisição prévia de CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração do Supabase ausente na Edge Function');
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:suporte@taskaccount.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Chaves VAPID não configuradas nos secrets do Supabase');
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { 
      channelId, 
      senderId, 
      senderName, 
      senderAvatar, 
      text, 
      recipientUserIds 
    } = body;

    if (!channelId && (!recipientUserIds || recipientUserIds.length === 0)) {
      throw new Error('channelId ou recipientUserIds é obrigatório');
    }

    let targetUserIds: string[] = [];

    if (recipientUserIds && Array.isArray(recipientUserIds) && recipientUserIds.length > 0) {
      targetUserIds = recipientUserIds.filter(id => id && id !== senderId);
    } else if (channelId) {
      // Descobrir membros do canal a partir do banco
      const { data: members, error: membersError } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', channelId);

      if (!membersError && members) {
        targetUserIds = members
          .map((m: any) => m.user_id)
          .filter((uid: string) => uid && uid !== senderId);
      }

      // Se não houver membros explícitos na tabela de membros (ex: canal de suporte do cliente)
      if (targetUserIds.length === 0) {
        const { data: channel } = await supabase
          .from('chat_channels')
          .select('client_id, created_by')
          .eq('id', channelId)
          .single();

        if (channel) {
          const candidateIds: string[] = [];
          if (channel.created_by && channel.created_by !== senderId) {
            candidateIds.push(channel.created_by);
          }
          // Se o canal tem client_id, buscar os usuários desse cliente
          if (channel.client_id) {
            const { data: clientProfiles } = await supabase
              .from('profiles')
              .select('id')
              .eq('client_id', channel.client_id);
            if (clientProfiles) {
              clientProfiles.forEach((p: any) => {
                if (p.id !== senderId) candidateIds.push(p.id);
              });
            }
          }
          targetUserIds = Array.from(new Set(candidateIds));
        }
      }
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum destinatário elegível encontrado', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Buscar inscrições push ativas para os destinatários
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', targetUserIds);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'Destinatários sem inscrições push ativas', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const pushPayload = JSON.stringify({
      title: senderName ? `${senderName} (Task Account)` : 'Task Account',
      body: text || 'Nova mensagem recebida no chat',
      icon: senderAvatar || '/pwa-192x192.png',
      badge: '/favicon.png',
      tag: `chat-channel-${channelId || 'global'}`,
      data: {
        url: channelId ? `/?tab=chat&channelId=${channelId}` : '/?tab=chat',
        channelId: channelId,
        senderId: senderId
      }
    });

    let sentCount = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            pushPayload
          );
          sentCount++;
        } catch (err: any) {
          // Se 410 (Gone) ou 404 (Not Found), o dispositivo desinstalou ou cancelou
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredIds.push(sub.id);
          } else {
            console.warn(`Erro ao enviar push para sub ${sub.id}:`, err?.message || err);
          }
        }
      })
    );

    // Limpeza de inscrições obsoletas
    if (expiredIds.length > 0) {
      await supabase
        .from('user_push_subscriptions')
        .delete()
        .in('id', expiredIds);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        expiredRemoved: expiredIds.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Erro na Edge Function send-push:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
