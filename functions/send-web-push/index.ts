import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

Deno.serve(async (req) => {
  try {
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')!
    if (req.headers.get('x-webhook-secret') !== webhookSecret) {
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = await req.json()
    const notification = payload.record ?? payload
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('trainer_id', notification.trainer_id)
    if (error) throw error

    const message = JSON.stringify({
      title: notification.title,
      body: notification.body,
      target_hash: notification.target_hash || '#notifications',
    })

    await Promise.all((subscriptions || []).map(async (item) => {
      try {
        await webpush.sendNotification({
          endpoint: item.endpoint,
          keys: { p256dh: item.p256dh, auth: item.auth },
        }, message)
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', item.id)
        } else throw error
      }
    }))

    return Response.json({ sent: subscriptions?.length || 0 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
})
