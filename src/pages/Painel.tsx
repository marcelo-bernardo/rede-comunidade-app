import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, Estatistica, SectionTitle } from '../components/ui'
import {
  comprimentoRota,
  faixaVulnerabilidade,
  formatarDistancia,
  idade,
  indiceVulnerabilidade,
} from '../lib/utils'
import { useApp } from '../store/AppStore'

export default function Painel() {
  const { estado } = useApp()

  const casaPorId = useMemo(
    () => new Map(estado.casas.map((c) => [c.id, c])),
    [estado.casas],
  )

  const resumo = useMemo(() => {
    const pessoas = estado.familias.reduce((n, f) => n + f.membros.length, 0)
    const criancas = estado.familias
      .flatMap((f) => f.membros)
      .filter((m) => (idade(m.nascimento) ?? 99) < 12).length
    const idosos = estado.familias
      .flatMap((f) => f.membros)
      .filter((m) => (idade(m.nascimento) ?? 0) >= 60).length

    const comIndice = estado.familias.map((f) => ({
      familia: f,
      indice: indiceVulnerabilidade(f, f.casaId ? casaPorId.get(f.casaId) : null),
    }))
    const criticas = comIndice.filter((x) => x.indice >= 70).length
    const media = comIndice.length
      ? Math.round(comIndice.reduce((s, x) => s + x.indice, 0) / comIndice.length)
      : 0

    const total = estado.casas.length || 1
    const infra = {
      agua: Math.round((estado.casas.filter((c) => c.aguaEncanada).length / total) * 100),
      esgoto: Math.round((estado.casas.filter((c) => c.esgoto).length / total) * 100),
      energia: Math.round(
        (estado.casas.filter((c) => c.energiaEletrica).length / total) * 100,
      ),
      coleta: Math.round((estado.casas.filter((c) => c.coletaLixo).length / total) * 100),
    }

    const kmMapeados = estado.rotas.reduce((s, r) => s + comprimentoRota(r), 0)

    return {
      pessoas,
      criancas,
      idosos,
      criticas,
      media,
      infra,
      kmMapeados,
      prioritarias: [...comIndice].sort((a, b) => b.indice - a.indice).slice(0, 5),
      alertasAbertos: estado.alertas.filter((a) => !a.resolvido),
      rotasPendentes: estado.rotas.filter((r) => r.status === 'pendente').length,
      casasEmRisco: estado.casas.filter((c) => c.riscos.length > 0).length,
    }
  }, [estado, casaPorId])

  return (
    <div>
      <SectionTitle
        titulo={`Olá, ${estado.usuario}`}
        descricao="Retrato da comunidade a partir do que os próprios moradores cadastraram."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica
          rotulo="Famílias registradas"
          valor={estado.familias.length}
          detalhe={`${resumo.pessoas} pessoas · ${resumo.criancas} crianças · ${resumo.idosos} idosos`}
        />
        <Estatistica
          rotulo="Casas mapeadas"
          valor={estado.casas.length}
          detalhe={`${resumo.casasEmRisco} com risco identificado`}
        />
        <Estatistica
          rotulo="Rotas mapeadas"
          valor={estado.rotas.length}
          detalhe={`${formatarDistancia(resumo.kmMapeados)} · ${resumo.rotasPendentes} aguardando validação`}
        />
        <Estatistica
          rotulo="Vulnerabilidade média"
          valor={resumo.media}
          detalhe={`${resumo.criticas} família(s) em situação crítica`}
          cor={
            resumo.media >= 70
              ? 'text-red-600'
              : resumo.media >= 45
                ? 'text-orange-600'
                : 'text-emerald-600'
          }
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Cobertura de infraestrutura
          </h2>
          {estado.casas.length === 0 ? (
            <p className="text-sm text-slate-400">
              Cadastre casas para ver a cobertura.{' '}
              <Link to="/casas" className="text-emerald-700 underline">
                Ir para casas
              </Link>
            </p>
          ) : (
            <div className="space-y-3.5">
              {(
                [
                  ['Água encanada', resumo.infra.agua],
                  ['Esgoto na rede', resumo.infra.esgoto],
                  ['Energia elétrica', resumo.infra.energia],
                  ['Coleta de lixo', resumo.infra.coleta],
                ] as [string, number][]
              ).map(([rotulo, pct]) => (
                <div key={rotulo}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{rotulo}</span>
                    <span className="font-medium text-slate-800">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 80
                          ? 'bg-emerald-500'
                          : pct >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Economia local
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Comércios</dt>
              <dd className="font-semibold text-slate-900">{estado.comercios.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Formalizados</dt>
              <dd className="font-semibold text-slate-900">
                {estado.comercios.filter((c) => c.formalizado).length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Prestadores</dt>
              <dd className="font-semibold text-slate-900">{estado.freelancers.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Atendem em domicílio</dt>
              <dd className="font-semibold text-slate-900">
                {estado.freelancers.filter((f) => f.atendeDomicilio).length}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 text-sm">
            <Link to="/comercios" className="text-emerald-700 hover:underline">
              Comércios
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/freelancers" className="text-emerald-700 hover:underline">
              Freelancers
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Famílias prioritárias
          </h2>
          {resumo.prioritarias.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma família registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {resumo.prioritarias.map(({ familia, indice }) => {
                const faixa = faixaVulnerabilidade(indice)
                return (
                  <li key={familia.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {familia.nomeFamilia}
                      </p>
                      <p className="text-xs text-slate-400">
                        {familia.membros.length} pessoa(s) · {familia.responsavel}
                      </p>
                    </div>
                    <Badge className={faixa.classe}>{indice}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
          <Link
            to="/familias"
            className="mt-3 inline-block border-t border-slate-100 pt-3 text-sm text-emerald-700 hover:underline"
          >
            Ver todas as famílias
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Alertas abertos ({resumo.alertasAbertos.length})
          </h2>
          {resumo.alertasAbertos.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum alerta aberto no momento.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {resumo.alertasAbertos.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{a.tipo}</p>
                    <p className="truncate text-xs text-slate-400">{a.descricao}</p>
                  </div>
                  <Badge
                    className={
                      a.gravidade === 'Alta'
                        ? 'bg-red-100 text-red-800'
                        : a.gravidade === 'Média'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                    }
                  >
                    {a.gravidade}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/mapa"
            className="mt-3 inline-block border-t border-slate-100 pt-3 text-sm text-emerald-700 hover:underline"
          >
            Abrir o mapa
          </Link>
        </Card>
      </div>
    </div>
  )
}
