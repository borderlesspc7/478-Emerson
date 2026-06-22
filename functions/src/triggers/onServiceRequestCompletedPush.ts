import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { isCompletedStatus, sendPushToUser } from '../lib/pushMessaging.js'

export const onServiceRequestCompletedPush = onDocumentUpdated(
  {
    document: 'serviceRequests/{requestId}',
    region: 'southamerica-east1',
  },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return

    const wasCompleted = isCompletedStatus(before.status)
    const isCompleted = isCompletedStatus(after.status)
    if (wasCompleted || !isCompleted) return

    const userId = typeof after.userId === 'string' ? after.userId : ''
    if (!userId) return

    const requestId = event.params.requestId
    const serviceName =
      typeof after.serviceName === 'string' && after.serviceName.trim()
        ? after.serviceName.trim()
        : 'serviço'

    await sendPushToUser(userId, {
      type: 'service_completed',
      title: 'Pedido concluído',
      body: `Seu pedido de ${serviceName} foi concluído.`,
      dedupeKey: `service_completed_${requestId}`,
      data: {
        requestId,
        serviceName,
      },
      url: '/servicos',
    })
  },
)
