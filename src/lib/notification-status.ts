export type NotificationChannelStatus = {
  sent: boolean
  skipped?: boolean
  simulated?: boolean
  warning?: string
  error?: string
}

export type NotificationStatus = {
  email: NotificationChannelStatus
  sms: NotificationChannelStatus
}

export function describeNotificationStatus(status: NotificationStatus) {
  return (['email', 'sms'] as const).map((name) => {
    const channel = status[name]
    const label = name === 'email' ? 'Email' : 'SMS'
    if (!channel) return `${label}: no result returned.`
    if (channel.skipped) return `${label}: skipped (${channel.error || 'not enabled'}).`
    if (channel.simulated) return `${label}: simulated, not sent.`
    if (channel.sent) return `${label}: accepted by provider; delivery is not confirmed.${channel.warning ? ` Warning: ${channel.warning}` : ''}`
    return `${label}: failed (${channel.error || 'provider did not accept the request'}).`
  }).join(' ')
}

export function notificationsAccepted(status: NotificationStatus) {
  return [status.email, status.sms].every((channel) => channel?.sent && !channel.simulated && !channel.warning)
}
