import { Button } from '../../components/ui/Button/Button'
import './DashboardPage.css'

export function DashboardPage() {
  return (
    <div className="page-dashboard">
      <section className="page-dashboard__hero">
        <h2 className="page-dashboard__heading">Bem-vindo de volta</h2>
        <p className="page-dashboard__lead">
          Este é o seu painel. Adicione métricas, listas e ações conforme o
          produto evoluir.
        </p>
        <div className="page-dashboard__actions">
          <Button variant="primary" size="md">
            Nova ação
          </Button>
          <Button variant="secondary" size="md">
            Ver documentação
          </Button>
        </div>
      </section>

      <div className="page-dashboard__grid">
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Resumo</h3>
          <p className="page-dashboard__card-value">—</p>
          <p className="page-dashboard__card-meta">Dados em tempo real</p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Atividade</h3>
          <p className="page-dashboard__card-value">—</p>
          <p className="page-dashboard__card-meta">Últimas 24h</p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">Status</h3>
          <p className="page-dashboard__card-value page-dashboard__ok">
            Operacional
          </p>
          <p className="page-dashboard__card-meta">Todos os sistemas</p>
        </article>
      </div>
    </div>
  )
}
