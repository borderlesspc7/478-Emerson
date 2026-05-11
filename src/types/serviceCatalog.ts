/** Item do catálogo em `serviceCatalog` (gerido pelo admin). */
export type ServiceCatalogItem = {
  id: string
  name: string
  description: string
  priceInCents: number
  /** Dígitos do WhatsApp (DDI + DDD + número), ex. 5511999998888. Vazio = sem destinatário fixo no link. */
  whatsappPhone: string
  /** Ordem de exibição (menor primeiro). */
  order: number
}
