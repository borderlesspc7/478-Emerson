import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiMinus, FiPlus, FiRotateCcw } from 'react-icons/fi'
import { getMediaKind, isEmbeddableVideoUrl } from '../../lib/mediaUrl'
import { Button } from '../ui/Button/Button'
import './MediaModal.css'

const ReactPlayer = lazy(() => import('react-player'))

export type MediaModalProps = {
  url: string
  urls?: string[]
  title?: string
  onClose: () => void
}

const ZOOM_MIN = 1
const ZOOM_MAX = 4
const ZOOM_STEP = 0.25

function ImageZoomViewer({ url, alt }: { url: string; alt: string }) {
  const { t } = useTranslation()
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 })

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [url])

  const zoomIn = () => setScale((s) => Math.min(ZOOM_MAX, Number((s + ZOOM_STEP).toFixed(2))))
  const zoomOut = () =>
    setScale((s) => {
      const next = Math.max(ZOOM_MIN, Number((s - ZOOM_STEP).toFixed(2)))
      if (next === ZOOM_MIN) setOffset({ x: 0, y: 0 })
      return next
    })
  const resetZoom = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const onPointerDown = (ev: PointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return
    dragRef.current = {
      active: true,
      startX: ev.clientX,
      startY: ev.clientY,
      originX: offset.x,
      originY: offset.y,
    }
    setIsDragging(true)
    ev.currentTarget.setPointerCapture(ev.pointerId)
  }

  const onPointerMove = (ev: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    setOffset({
      x: dragRef.current.originX + (ev.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (ev.clientY - dragRef.current.startY),
    })
  }

  const endDrag = (ev: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    setIsDragging(false)
    ev.currentTarget.releasePointerCapture(ev.pointerId)
  }

  return (
    <div className="media-modal__zoom">
      <div className="media-modal__zoom-toolbar">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<FiMinus aria-hidden />}
          onClick={zoomOut}
          disabled={scale <= ZOOM_MIN}
          aria-label={t('mediaModal.zoomOut')}
        >
          {t('mediaModal.zoomOut')}
        </Button>
        <span className="media-modal__zoom-label">{Math.round(scale * 100)}%</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<FiPlus aria-hidden />}
          onClick={zoomIn}
          disabled={scale >= ZOOM_MAX}
          aria-label={t('mediaModal.zoomIn')}
        >
          {t('mediaModal.zoomIn')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<FiRotateCcw aria-hidden />}
          onClick={resetZoom}
          disabled={scale === 1 && offset.x === 0 && offset.y === 0}
          aria-label={t('mediaModal.resetZoom')}
        >
          {t('mediaModal.resetZoom')}
        </Button>
      </div>
      <div
        className={`media-modal__zoom-viewport ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          src={url}
          alt={alt}
          className="media-modal__zoom-image"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}

export function MediaModal({ url, urls, title, onClose }: MediaModalProps) {
  const { t } = useTranslation()
  const gallery = useMemo(() => {
    const list = (urls?.length ? urls : [url]).map((item) => item.trim()).filter(Boolean)
    return [...new Set(list)]
  }, [url, urls])

  const initialIndex = useMemo(() => {
    const idx = gallery.indexOf(url.trim())
    return idx >= 0 ? idx : 0
  }, [gallery, url])

  const [activeIndex, setActiveIndex] = useState(initialIndex)

  useEffect(() => {
    setActiveIndex(initialIndex)
  }, [initialIndex, url])

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        onClose()
        return
      }
      if (gallery.length <= 1) return
      if (ev.key === 'ArrowLeft') {
        setActiveIndex((i) => (i <= 0 ? gallery.length - 1 : i - 1))
      }
      if (ev.key === 'ArrowRight') {
        setActiveIndex((i) => (i >= gallery.length - 1 ? 0 : i + 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, gallery.length])

  const activeUrl = gallery[activeIndex] ?? url
  const mediaKind = getMediaKind(activeUrl)
  const isVideo = isEmbeddableVideoUrl(activeUrl)
  const hasGallery = gallery.length > 1 && !isVideo

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i <= 0 ? gallery.length - 1 : i - 1))
  }, [gallery.length])

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i >= gallery.length - 1 ? 0 : i + 1))
  }, [gallery.length])

  const modalTitle = title ?? t('mediaModal.defaultTitle')

  return createPortal(
    <div className="media-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="media-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="media-modal__header">
          <h2 id="media-modal-title" className="media-modal__title">
            {modalTitle}
          </h2>
          <button
            type="button"
            className="media-modal__close"
            onClick={onClose}
            aria-label={t('mediaModal.close')}
          >
            ×
          </button>
        </header>

        <div className="media-modal__body">
          {isVideo ? (
            <div className="media-modal__player-wrap">
              <Suspense
                fallback={
                  <p className="media-modal__unsupported" role="status">
                    {t('mediaModal.loading')}
                  </p>
                }
              >
                <ReactPlayer
                  src={activeUrl}
                  width="100%"
                  height="100%"
                  controls
                  playsInline
                />
              </Suspense>
            </div>
          ) : mediaKind === 'image' || mediaKind === 'unknown' ? (
            <ImageZoomViewer url={activeUrl} alt={modalTitle} />
          ) : (
            <p className="media-modal__unsupported">{t('mediaModal.unsupported')}</p>
          )}
        </div>

        {hasGallery ? (
          <footer className="media-modal__footer">
            <span className="media-modal__counter">
              {t('mediaModal.counter', { current: activeIndex + 1, total: gallery.length })}
            </span>
            <div className="media-modal__nav">
              <Button type="button" variant="secondary" size="sm" onClick={goPrev}>
                {t('mediaModal.prev')}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={goNext}>
                {t('mediaModal.next')}
              </Button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
