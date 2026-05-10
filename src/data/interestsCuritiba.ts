export type InterestCategory = 'essential' | 'leisure'

export type InterestKind = 'pharmacy' | 'grocery' | 'park' | 'museum'

export type CuritibaInterest = {
  id: string
  category: InterestCategory
  kind: InterestKind
  /** Texto livre para pesquisa no Google Maps (endereço ou nome + cidade). */
  mapsQuery: string
}

/**
 * Pontos de referência mockados em Curitiba (distâncias são estimativas para o hóspede).
 */
export const CURITIBA_INTERESTS: CuritibaInterest[] = [
  {
    id: 'raiaBatel',
    category: 'essential',
    kind: 'pharmacy',
    mapsQuery: 'Droga Raia Av. Batel Curitiba PR',
  },
  {
    id: 'panvelCentro',
    category: 'essential',
    kind: 'pharmacy',
    mapsQuery: 'Panvel Farmácia Rua XV de Novembro Curitiba',
  },
  {
    id: 'carrefourBatel',
    category: 'essential',
    kind: 'grocery',
    mapsQuery: 'Carrefour Bairro Batel Curitiba',
  },
  {
    id: 'muffatoCentro',
    category: 'essential',
    kind: 'grocery',
    mapsQuery: 'Super Muffato Praça Osório Curitiba',
  },
  {
    id: 'jardimBotanico',
    category: 'leisure',
    kind: 'park',
    mapsQuery: 'Jardim Botânico de Curitiba',
  },
  {
    id: 'parqueBarigui',
    category: 'leisure',
    kind: 'park',
    mapsQuery: 'Parque Barigui Curitiba',
  },
  {
    id: 'monCuritiba',
    category: 'leisure',
    kind: 'museum',
    mapsQuery: 'Museu Oscar Niemeyer Curitiba',
  },
  {
    id: 'museuHistoria',
    category: 'leisure',
    kind: 'museum',
    mapsQuery: 'Museu Histórico de Curitiba',
  },
]
