// ============================================================
// 产品类型定义
// ============================================================

export type ProductCategory = 'gel' | 'drink'
export type ProductRegion = 'CN' | 'INTL'

export interface BaseProduct {
  id: string
  brand: string
  name: string
  region: ProductRegion
  category: ProductCategory
  carbsPerServing: number
  servingSizeGrams: number
  sodiumPerServing: number
  caffeinePerServing: number
  isCaffeinated: boolean
  priceCNY?: number
  notes?: string
}

export interface GelProduct extends BaseProduct {
  category: 'gel'
  consistency?: 'thin' | 'thick' | 'liquid'
  withWater?: boolean
}

export interface DrinkProduct extends BaseProduct {
  category: 'drink'
  mixRatio?: number
  servingWaterMl: number
  isIsotonic?: boolean
}
