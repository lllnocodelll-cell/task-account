import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "npm:web-push@3.6.7";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedEnv = Deno.env.get('ALLOWED_ORIGINS');
  let allowOrigin = '*';

  if (allowedEnv) {
    const allowedList = allowedEnv.split(',').map((item) => item.trim()).filter(Boolean);
    allowOrigin = origin && allowedList.includes(origin) ? origin : (allowedList[0] || '');
  } else if (origin) {
    allowOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (rateLimitStore.size > 1000) {
    for (const [k, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) rateLimitStore.delete(k);
    }
  }

  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

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

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token de autenticação ausente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Aceita chamadas internas assinadas com SERVICE_ROLE_KEY ou usuários autenticados via JWT
    const isInternalServiceCall = token === supabaseServiceKey;
    let callerProfile: {
      id: string;
      org_id: string | null;
      role: string | null;
      client_id: string | null;
      client_ids: string[] | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null = null;

    if (!isInternalServiceCall) {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user) {
        return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      const rate = checkRateLimit(authData.user.id);
      if (!rate.allowed) {
        return new Response(JSON.stringify({ error: 'Limite de disparos atingido. Aguarde alguns segundos.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rate.retryAfterSec) },
          status: 429,
        });
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, org_id, role, client_id, client_ids, full_name, avatar_url')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        return new Response(JSON.stringify({ error: 'Perfil do usuário não encontrado.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      callerProfile = profileData;
    }

    const body = await req.json();
    const {
      eventType = 'chat',
      channelId,
      clientId,
      orgId,
      senderId: rawSenderId,
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

    // Quando chamado por usuário autenticado, ignora senderId forjado do payload
    const senderId = callerProfile ? callerProfile.id : rawSenderId;
    const callerOrgId = callerProfile ? (callerProfile.org_id || callerProfile.id) : (orgId || null);

    if (callerProfile && orgId && orgId !== callerOrgId) {
      return new Response(JSON.stringify({ error: 'Acesso negado para esta organização.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const isClientDocumentEvent = eventType === 'client_document';

    if (isClientDocumentEvent) {
      if (!clientId) {
        throw new Error('clientId é obrigatório para notificação de documento');
      }
      if (callerProfile?.role === 'cliente') {
        return new Response(JSON.stringify({ error: 'Apenas a equipe do escritório pode notificar documentos.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }
    } else if (!channelId && (!recipientUserIds || recipientUserIds.length === 0)) {
      throw new Error('channelId ou recipientUserIds é obrigatório');
    }

    let senderName = rawSenderName || callerProfile?.full_name;
    let senderAvatar = rawSenderAvatar || callerProfile?.avatar_url;
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
    let resolvedOrgId: string | null = callerOrgId;

    if (isClientDocumentEvent) {
      const { data: clientInfo } = await supabase
        .from('clients')
        .select('company_name, trade_name, org_id')
        .eq('id', clientId)
        .maybeSingle();

      if (!clientInfo) {
        return new Response(JSON.stringify({ error: 'Cliente não encontrado.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      if (callerOrgId && clientInfo.org_id && clientInfo.org_id !== callerOrgId) {
        return new Response(JSON.stringify({ error: 'Acesso negado ao cliente informado.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      clientCompanyName = clientInfo.trade_name || clientInfo.company_name || '';
      resolvedOrgId = callerOrgId || clientInfo.org_id || null;

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
      if (callerProfile?.role === 'cliente') {
        return new Response(JSON.stringify({ error: 'Envio direto de destinatários não permitido para clientes.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      if (callerOrgId) {
        const { data: sameOrgUsers } = await supabase
          .from('profiles')
          .select('id')
          .in('id', recipientUserIds)
          .or(`org_id.eq.${callerOrgId},id.eq.${callerOrgId}`);

        if (sameOrgUsers) {
          sameOrgUsers.forEach((u: any) => {
            if (u.id && u.id !== senderId) candidateSet.add(u.id);
          });
        }
      } else {
        recipientUserIds.forEach((id: string) => {
          if (id && id !== senderId) candidateSet.add(id);
        });
      }
    } else if (channelId) {
      const { data: channel } = await supabase
        .from('chat_channels')
        .select('client_id, created_by, is_private, org_id')
        .eq('id', channelId)
        .maybeSingle();

      if (!channel) {
        return new Response(JSON.stringify({ error: 'Canal não encontrado.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      if (callerOrgId && channel.org_id && channel.org_id !== callerOrgId) {
        return new Response(JSON.stringify({ error: 'Acesso negado ao canal.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      // 1. Membros explícitos do canal
      const { data: members, error: membersError } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', channelId);

      const memberIds = (!membersError && members) ? members.map((m: any) => m.user_id) : [];

      if (callerProfile?.role === 'cliente') {
        const linkedClientIds = new Set<string>([
          ...(callerProfile.client_id ? [callerProfile.client_id] : []),
          ...((callerProfile.client_ids || []).filter(Boolean)),
        ]);
        const isExplicitMember = memberIds.includes(callerProfile.id);
        const isChannelCreator = channel.created_by === callerProfile.id;
        const isAllowedClientChannel = Boolean(channel.client_id && linkedClientIds.has(channel.client_id) && !channel.is_private);

        if (!isExplicitMember && !isChannelCreator && !isAllowedClientChannel) {
          return new Response(JSON.stringify({ error: 'Acesso negado a este canal.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          });
        }
      }

      memberIds.forEach((uid: string) => {
        if (uid && uid !== senderId) {
          candidateSet.add(uid);
        }
      });

      const effectivePrivate = Boolean(isPrivate || channel.is_private);
      const effectiveChannelOrgId = callerOrgId || channel.org_id || null;

      if (channel.created_by && channel.created_by !== senderId) {
        candidateSet.add(channel.created_by);
      }

      if (channel.client_id && !effectivePrivate) {
        let clientProfilesQuery = supabase
          .from('profiles')
          .select('id, role')
          .or(`client_id.eq.${channel.client_id},client_ids.cs.{${channel.client_id}}`);

        if (effectiveChannelOrgId) {
          clientProfilesQuery = clientProfilesQuery.eq('org_id', effectiveChannelOrgId);
        }

        const { data: clientProfiles } = await clientProfilesQuery;

        if (clientProfiles) {
          clientProfiles.forEach((p: any) => {
            if (p.id && p.id !== senderId) {
              candidateSet.add(p.id);
            }
          });
        }
      }

      // Garante que todos os candidatos pertençam à mesma organização do canal
      if (effectiveChannelOrgId && candidateSet.size > 0) {
        const { data: validProfiles } = await supabase
          .from('profiles')
          .select('id, role')
          .in('id', Array.from(candidateSet))
          .or(`org_id.eq.${effectiveChannelOrgId},id.eq.${effectiveChannelOrgId}`);

        const validMap = new Map<string, string | null>(
          (validProfiles || []).map((p: any) => [p.id, p.role])
        );

        for (const uid of Array.from(candidateSet)) {
          if (!validMap.has(uid) || (effectivePrivate && validMap.get(uid) === 'cliente')) {
            candidateSet.delete(uid);
          }
        }
      } else if (effectivePrivate && candidateSet.size > 0) {
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
