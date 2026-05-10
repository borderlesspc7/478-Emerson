/** Curadoria manual no Firestore (`propertyCurations`), chave = `propertyId` Stays (`_id` do listing). */
export type PropertyCurationRecord = {
  propertyId: string
  garagePhotoUrls: string[]
  elevatorPhotoUrls: string[]
  manualAccessTips: string
  manualPropertyTips: string
  /** Título amigável para grelha admin (cache). */
  displayName?: string | null
  updatedAt: Date | null
}
