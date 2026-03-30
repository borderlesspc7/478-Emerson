import type { ReactNode } from 'react'
import './PlaceholderPage.css'

type PlaceholderPageProps = {
  title: string
  description: string
  children?: ReactNode
}

export function PlaceholderPage({
  title,
  description,
  children,
}: PlaceholderPageProps) {
  return (
    <div className="page-placeholder">
      <h2 className="page-placeholder__title">{title}</h2>
      <p className="page-placeholder__text">{description}</p>
      {children}
    </div>
  )
}
