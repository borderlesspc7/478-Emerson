import { Button } from '../../components/ui/Button/Button'
import { useAuth } from '../../hooks/useAuth'
import './DashboardPage.css'

export function DashboardPage() {
  const { user } = useAuth()
  const guestName = user?.displayName || user?.email?.split('@')[0] || 'hóspede'

  return (
    <div className="page-dashboard">
      <section className="page-dashboard__hero">
        <h2 className="page-dashboard__heading">Olá, {guestName}</h2>
        <p className="page-dashboard__lead">
          Seu guia digital da estadia em um só lugar: reserva, acesso ao imóvel,
          Wi-Fi e solicitações de serviços.
        </p>
        <div className="page-dashboard__actions">
          <Button variant="primary" size="md">
            Ver dados da reserva
          </Button>
          <Button variant="secondary" size="md">
            Solicitar serviço
          </Button>
        </div>
      </section>

      <div className="page-dashboard__grid">
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Check-in</h3>
          <p className="page-dashboard__card-value">Hoje, 15:00</p>
          <p className="page-dashboard__card-meta">Entrada digital liberada</p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Wi-Fi</h3>
          <p className="page-dashboard__card-value">ZEN_GUEST</p>
          <p className="page-dashboard__card-meta">Senha: bemvindo2026</p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Acesso</h3>
          <p className="page-dashboard__card-value page-dashboard__ok">
            Ativo
          </p>
          <p className="page-dashboard__card-meta">Válido durante a estadia</p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Imóvel</h3>
          <p className="page-dashboard__card-value">Apto 402</p>
          <p className="page-dashboard__card-meta">Rua Exemplo, 123</p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Serviço rápido</h3>
          <p className="page-dashboard__card-value">Limpeza</p>
          <p className="page-dashboard__card-meta">Solicite em 1 clique</p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Suporte</h3>
          <p className="page-dashboard__card-value">24h</p>
          <p className="page-dashboard__card-meta">Canal centralizado no app</p>
        </article>
      </div>
    </div>
  )
}
