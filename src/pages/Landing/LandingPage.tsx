import { useEffect, useRef } from 'react'
import { BRAND } from '../../config/brand'
import { LANDING_MARKUP } from './landingMarkup'
import './LandingPage.css'

type DemoStep = {
  title: string
  body: string
  rows: Array<[string, string]>
}

const DEMO_STEPS: DemoStep[] = [
  {
    title: 'Reserva confirmada',
    body: 'O hóspede entra com o código da reserva ou magic link e já encontra a estadia correta.',
    rows: [
      ['Reserva', 'ZEN-4821'],
      ['Imóvel', 'Apartamento Zen • 402'],
      ['Período', '12 set, 15:00 → 16 set, 11:00'],
      ['Status', 'Confirmada'],
    ],
  },
  {
    title: 'Pré check-in',
    body: 'As informações necessárias são coletadas antes da chegada.',
    rows: [
      ['Hóspede', 'Marina Lopes'],
      ['Progresso', '100%'],
      ['Chegada prevista', '14:30'],
      ['Status', 'Concluído'],
    ],
  },
  {
    title: 'Acesso liberado',
    body: 'Informações sensíveis aparecem somente no horário configurado.',
    rows: [
      ['Apartamento', '402'],
      ['Entrada', 'Porta lateral'],
      ['Wi-Fi', 'ZEN_APTO_402'],
      ['Status', 'Disponível'],
    ],
  },
  {
    title: 'Serviços da estadia',
    body: 'Extras e pedidos ficam ligados à reserva.',
    rows: [
      ['Serviço', 'Limpeza extra'],
      ['Reserva', 'ZEN-4821'],
      ['Pagamento', 'Quando aplicável'],
      ['Status', 'Pendente'],
    ],
  },
  {
    title: 'Operação admin',
    body: 'O gestor acompanha reservas, acessos, pedidos e imóveis.',
    rows: [
      ['Chegam hoje', '5'],
      ['Hospedados', '8'],
      ['Pedidos pendentes', '3'],
      ['Integração', 'Stays sincronizado'],
    ],
  },
]

function supportWhatsAppUrl(): string | null {
  const raw = (import.meta.env.VITE_ZEN_SUPPORT_WHATSAPP as string | undefined)?.trim() ?? ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null
  const text = encodeURIComponent(
    `Olá! Quero conhecer o ${BRAND.name} para as minhas estadias.`,
  )
  return `https://wa.me/${digits}?text=${text}`
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Landing marketing pública — baseada no protótipo
 * Guia_da_Zen_Reservas_Premium_Prototype.
 */
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${BRAND.name} | Da reserva ao check-out`
    return () => {
      document.title = BRAND.name
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Recover from hash/auto-scroll leaving the page mid-section blank.
    if (!window.location.hash) {
      window.scrollTo(0, 0)
    }

    const wa = supportWhatsAppUrl()
    root.querySelectorAll<HTMLAnchorElement>('[data-whatsapp]').forEach((el) => {
      if (wa) {
        el.href = wa
        el.target = '_blank'
        el.rel = 'noopener noreferrer'
      } else {
        el.href = '#contato'
      }
    })

    const navw = root.querySelector('#navw')
    const onScroll = () => {
      navw?.classList.toggle('lp-s', window.scrollY > 18)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    const reduce = prefersReducedMotion()
    const reveals = [...root.querySelectorAll('.lp-reveal')]
    // Content must stay visible even if observers fail (blank green screen bug).
    reveals.forEach((el) => el.classList.add('lp-in'))

    const tabs = [...root.querySelectorAll<HTMLElement>('.lp-jtab')]
    const slides = [...root.querySelectorAll<HTMLElement>('.lp-slide')]
    const jtabs = root.querySelector<HTMLElement>('.lp-jtabs')
    let ji = 0

    const scrollTabIntoStrip = (tab: HTMLElement) => {
      if (!jtabs) return
      const left = tab.offsetLeft - (jtabs.clientWidth - tab.clientWidth) / 2
      jtabs.scrollTo({
        left: Math.max(0, left),
        behavior: reduce ? 'auto' : 'smooth',
      })
    }

    const setJourney = (i: number, opts?: { scrollTab?: boolean }) => {
      if (!tabs.length || !slides.length) return
      ji = ((i % slides.length) + slides.length) % slides.length
      tabs.forEach((tab, n) => tab.classList.toggle('lp-active', n === ji))
      slides.forEach((slide, n) => slide.classList.toggle('lp-active', n === ji))
      if (opts?.scrollTab && tabs[ji]) scrollTabIntoStrip(tabs[ji])
    }

    // Ensure first slide is active after mount/HMR.
    setJourney(0)

    const tabHandlers = tabs.map((tab, i) => {
      const handler = () => setJourney(i, { scrollTab: true })
      tab.addEventListener('click', handler)
      return () => tab.removeEventListener('click', handler)
    })

    // Auto-rotate only while the journey stage is on screen - never scrolls the page.
    const stage = root.querySelector('.lp-stage')
    let journeyTimer: number | null = null
    let stageVisible = false
    const stageIo =
      reduce || !stage
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              stageVisible = Boolean(entry?.isIntersecting)
            },
            { threshold: 0.35 },
          )
    if (stage && stageIo) stageIo.observe(stage)

    if (!reduce && tabs.length > 0) {
      journeyTimer = window.setInterval(() => {
        if (!document.hidden && stageVisible) setJourney(ji + 1)
      }, 6500)
    }

    const track = root.querySelector<HTMLElement>('#track')
    const prevBtn = root.querySelector('#prev')
    const nextBtn = root.querySelector('#next')
    let ci = 0
    const caseWidth = () => {
      const first = track?.querySelector('.lp-case')
      if (!first) return 0
      return first.getBoundingClientRect().width + 16
    }
    const maxIndex = () => (window.innerWidth <= 680 ? 4 : window.innerWidth <= 980 ? 3 : 2)
    const moveTrack = () => {
      if (track) track.style.transform = `translateX(-${ci * caseWidth()}px)`
    }
    const onNext = () => {
      ci = Math.min(ci + 1, maxIndex())
      moveTrack()
    }
    const onPrev = () => {
      ci = Math.max(ci - 1, 0)
      moveTrack()
    }
    nextBtn?.addEventListener('click', onNext)
    prevBtn?.addEventListener('click', onPrev)
    window.addEventListener('resize', moveTrack)

    const modal = root.querySelector('#modal')
    const closeBtn = root.querySelector('#close')
    const openModal = () => modal?.classList.add('lp-open')
    const closeModal = () => modal?.classList.remove('lp-open')
    const demoBtns = [...root.querySelectorAll('[data-demo]')]
    demoBtns.forEach((btn) => btn.addEventListener('click', openModal))
    closeBtn?.addEventListener('click', closeModal)
    const onModalBackdrop = (e: Event) => {
      if (e.target === modal) closeModal()
    }
    modal?.addEventListener('click', onModalBackdrop)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)

    const dnav = [...root.querySelectorAll<HTMLButtonElement>('.lp-dnav button')]
    const preview = root.querySelector('#preview')
    const dnavHandlers = dnav.map((btn, i) => {
      const handler = () => {
        dnav.forEach((b, n) => b.classList.toggle('lp-active', n === i))
        const step = DEMO_STEPS[i]
        if (!preview || !step) return
        const rows = step.rows
          .map(([label, value]) => `<div class="lp-dr"><b>${label}</b><span>${value}</span></div>`)
          .join('')
        preview.innerHTML = `<h3>${step.title}</h3><p>${step.body}</p><div class="lp-dres">${rows}</div>`
      }
      btn.addEventListener('click', handler)
      return () => btn.removeEventListener('click', handler)
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', moveTrack)
      window.removeEventListener('keydown', onKey)
      stageIo?.disconnect()
      if (journeyTimer) window.clearInterval(journeyTimer)
      tabHandlers.forEach((off) => off())
      nextBtn?.removeEventListener('click', onNext)
      prevBtn?.removeEventListener('click', onPrev)
      demoBtns.forEach((btn) => btn.removeEventListener('click', openModal))
      closeBtn?.removeEventListener('click', closeModal)
      modal?.removeEventListener('click', onModalBackdrop)
      dnavHandlers.forEach((off) => off())
    }
  }, [])

  return (
    <div
      className="landing-page"
      ref={rootRef}
      dangerouslySetInnerHTML={{ __html: LANDING_MARKUP }}
    />
  )
}
