/** Curadoria manual no Firestore (`propertyCurations`), chave = `propertyId` Stays (`_id` do listing). */
export type PropertyCurationRecord = {
  propertyId: string
  garagePhotoUrls: string[]
  /** Link YouTube ou Vimeo exibido no card «Vaga de Garagem» do hóspede. */
  garageVideoUrl?: string | null
  elevatorPhotoUrls: string[]
  manualAccessTips: string
  manualPropertyTips: string
  /** Conteúdo editável exibido no card do imóvel para o hóspede. */
  buildingName?: string | null
  apartmentPassword?: string | null
  /** `false` remove a informação correspondente da visualização do hóspede. */
  showBuildingName?: boolean
  showApartmentPassword?: boolean
  /** Título amigável para grelha admin (cache). */
  displayName?: string | null
  updatedAt: Date | null
}
