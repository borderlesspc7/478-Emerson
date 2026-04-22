/** Item do catálogo em `serviceCatalog` (gerido pelo admin). */
export type ServiceCatalogItem = {
  id: string
  name: string
  description: string
  priceInCents: number
  /** Ordem de exibição (menor primeiro). */
  order: number
}
