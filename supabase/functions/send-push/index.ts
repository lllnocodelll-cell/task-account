import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
      eventType = 'chat',
      channelId,
      clientId,
      orgId,
      senderId,
      senderName: rawSenderName,
      senderAvatar: rawSenderAvatar,
      text,
      image,
      isPrivate = false,
      recipientUserIds,
      documentNames,
      taskName,
      competence,
    } = body;

    const isClientDocumentEvent = eventType === 'client_document';

    if (isClientDocumentEvent) {
      if (!clientId) {
        throw new Error('clientId é obrigatório para notificação de documento');
      }
    } else if (!channelId && (!recipientUserIds || recipientUserIds.length === 0)) {
      throw new Error('channelId ou recipientUserIds é obrigatório');
    }

    let senderName = rawSenderName;
    let senderAvatar = rawSenderAvatar;
    if ((!senderName || !senderAvatar) && senderId) {
      const { data: senderProf } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', senderId)
        .maybeSingle();
      if (senderProf) {
        senderName = senderName || senderProf.full_name;
        senderAvatar = senderAvatar || senderProf.avatar_url;
      }
    }

    const candidateSet = new Set<string>();
    let clientCompanyName = '';
    let resolvedOrgId: string | null = orgId || null;

    if (isClientDocumentEvent) {
      const { data: clientInfo } = await supabase
        .from('clients')
        .select('company_name, trade_name, org_id')
        .eq('id', clientId)
        .maybeSingle();

      if (clientInfo) {
        clientCompanyName = clientInfo.trade_name || clientInfo.company_name || '';
        resolvedOrgId = resolvedOrgId || clientInfo.org_id || null;
      }

      let clientProfilesQuery = supabase
        .from('profiles')
        .select('id, role, org_id')
        .eq('role', 'cliente')
        .or(`client_id.eq.${clientId},client_ids.cs.{${clientId}}`);

      if (resolvedOrgId) {
        clientProfilesQuery = clientProfilesQuery.eq('org_id', resolvedOrgId);
      }

      const { data: clientProfiles } = await clientProfilesQuery;
      if (clientProfiles) {
        clientProfiles.forEach((p: any) => {
          if (p.id && p.id !== senderId) {
            candidateSet.add(p.id);
          }
        });
      }
    } else if (recipientUserIds && Array.isArray(recipientUserIds) && recipientUserIds.length > 0) {
      recipientUserIds.forEach((id: string) => {
        if (id && id !== senderId) candidateSet.add(id);
      });
    } else if (channelId) {
      // 1. Membros explícitos do canal
      const { data: members, error: membersError } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', channelId);

      if (!membersError && members) {
        members.forEach((m: any) => {
          if (m.user_id && m.user_id !== senderId) {
            candidateSet.add(m.user_id);
          }
        });
      }

      // 2. Complementa com criador e usuários do cliente (client_id ou array client_ids)
      const { data: channel } = await supabase
        .from('chat_channels')
        .select('client_id, created_by, is_private')
        .eq('id', channelId)
        .maybeSingle();

      const effectivePrivate = Boolean(isPrivate || channel?.is_private);

      if (channel) {
        if (channel.created_by && channel.created_by !== senderId) {
          candidateSet.add(channel.created_by);
        }

        if (channel.client_id && !effectivePrivate) {
          const { data: clientProfiles } = await supabase
            .from('profiles')
            .select('id, role')
            .or(`client_id.eq.${channel.client_id},client_ids.cs.{${channel.client_id}}`);

          if (clientProfiles) {
            clientProfiles.forEach((p: any) => {
              if (p.id && p.id !== senderId) {
                candidateSet.add(p.id);
              }
            });
          }
        }
      }

      // Se a mensagem/canal for privado, remove qualquer perfil do portal cliente
      if (effectivePrivate && candidateSet.size > 0) {
        const { data: rolesData } = await supabase
          .from('profiles')
          .select('id, role')
          .in('id', Array.from(candidateSet));

        if (rolesData) {
          rolesData.forEach((p: any) => {
            if (p.role === 'cliente') {
              candidateSet.delete(p.id);
            }
          });
        }
      }
    }

    const targetUserIds = Array.from(candidateSet);

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum destinatário elegível encontrado', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const docList = Array.isArray(documentNames) ? documentNames.filter(Boolean) : [];
    const title = isClientDocumentEvent
      ? (clientCompanyName ? `Novo documento • ${clientCompanyName}` : 'Novo documento disponível')
      : (senderName ? senderName : 'Task Account');

    let messageBody = text || 'Nova mensagem recebida no chat';
    if (isClientDocumentEvent) {
      if (docList.length === 1) {
        messageBody = `${docList[0]}${competence ? ` (${competence})` : ''}`;
      } else if (docList.length > 1) {
        messageBody = `${docList.length} novos documentos disponíveis${taskName ? ` • ${taskName}` : ''}${competence ? ` (${competence})` : ''}`;
      } else {
        messageBody = `Um novo documento foi publicado na Área do Cliente${competence ? ` (${competence})` : ''}.`;
      }
    }

    // Para novos documentos do cliente, também registra notificação persistente no sininho (via service_role)
    if (isClientDocumentEvent) {
      try {
        const notificationRows = targetUserIds.map((uid) => ({
          user_id: uid,
          org_id: resolvedOrgId,
          title,
          message: messageBody,
          type: 'client_document',
          link: '/?tab=client-portal',
          related_entity_id: clientId,
          read: false,
          created_at: new Date().toISOString(),
        }));
        const { error: notifInsertError } = await supabase
          .from('notifications')
          .insert(notificationRows);
        if (notifInsertError) {
          console.warn('Aviso ao gravar notificação de documento:', notifInsertError.message);
        }
      } catch (notifErr: any) {
        console.warn('Aviso ao registrar notificação na tabela notifications:', notifErr?.message || notifErr);
      }
    }

    // Buscar inscrições push ativas para os destinatários (mais recentes primeiro)
    const { data: rawSubscriptions, error: subsError } = await supabase
      .from('user_push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, user_agent, updated_at')
      .in('user_id', targetUserIds)
      .order('updated_at', { ascending: false });

    if (subsError || !rawSubscriptions || rawSubscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'Destinatários sem inscrições push ativas', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Deduplica por (user_id, dispositivo normalizado) mantendo apenas o registro mais recente
    // para evitar notificações duplicadas no mesmo celular (ex.: Chrome vs PWA instalado).
    const normalizeDeviceKey = (ua?: string | null, fallbackId?: string) => {
      if (!ua) return `id:${fallbackId || 'unknown'}`;
      return ua
        .replace(/\b(Chrome|CriOS|Edg|EdgA|EdgiOS|Firefox|FxiOS|Version|Safari|OPR)\/[\d.]+/gi, '$1')
        .trim();
    };

    const seenDeviceKeys = new Set<string>();
    const subscriptions: any[] = [];
    const staleDuplicateIds: string[] = [];

    for (const sub of rawSubscriptions) {
      const deviceKey = `${sub.user_id}::${normalizeDeviceKey(sub.user_agent, sub.id)}`;
      if (seenDeviceKeys.has(deviceKey)) {
        staleDuplicateIds.push(sub.id);
        continue;
      }
      seenDeviceKeys.add(deviceKey);
      subscriptions.push(sub);
    }

    const icon = isClientDocumentEvent ? '/pwa-192x192.png' : (senderAvatar || '/pwa-192x192.png');
    const badge = '/pwa-badge.png';
    const tag = isClientDocumentEvent
      ? `client-docs-${clientId}`
      : `chat-channel-${channelId || 'global'}`;
    const targetPath = isClientDocumentEvent
      ? '/?tab=client-portal'
      : (channelId ? `/?tab=chat&channelId=${channelId}` : '/?tab=chat');
    const appOrigin = Deno.env.get('APP_PUBLIC_URL') || '';
    const navigateUrl = appOrigin ? `${appOrigin.replace(/\/$/, '')}${targetPath}` : targetPath;

    // Envelope compatível com Declarative Web Push (Safari/iOS 18.4+ RFC 8030) + SW padrão (Android/Desktop)
    const pushPayload = JSON.stringify({
      web_push: 8030,
      notification: {
        title,
        body: messageBody,
        icon,
        badge,
        ...(image ? { image } : {}),
        tag,
        renotify: true,
        silent: false,
        navigate: navigateUrl,
        app_badge: '1'
      },
      title,
      body: messageBody,
      icon,
      badge,
      ...(image ? { image } : {}),
      tag,
      data: {
        url: targetPath,
        tab: isClientDocumentEvent ? 'client-portal' : 'chat',
        eventType: isClientDocumentEvent ? 'client_document' : 'chat',
        clientId: clientId || undefined,
        channelId: channelId || undefined,
        senderId: senderId || undefined
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
            pushPayload,
            {
              TTL: 86400,
              urgency: 'high'
            }
          );
          sentCount++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredIds.push(sub.id);
          } else {
            console.warn(`Erro ao enviar push para sub ${sub.id}:`, err?.message || err);
          }
        }
      })
    );

    const idsToCleanup = [...expiredIds, ...staleDuplicateIds];
    if (idsToCleanup.length > 0) {
      await supabase
        .from('user_push_subscriptions')
        .delete()
        .in('id', idsToCleanup);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        expiredRemoved: expiredIds.length,
        duplicatesRemoved: staleDuplicateIds.length
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
