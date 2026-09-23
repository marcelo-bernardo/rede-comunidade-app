import React, { useMemo, useState, useCallback } from 'react'
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { useApp } from '../../src/store/AppStore'
import { Card, SectionTitle, Badge, Estatistica, BarraProgresso, FundoGradiente } from '../../src/components/ui'
import { indiceVulnerabilidade, faixaVulnerabilidade, formatarData } from '../../src/lib/utils'

export default function Painel() {
  const { estado } = useApp()
  const { familias, casas, rotas, alertas, comercios, freelancers } = estado
  const { recarregar } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    recarregar().finally(() => setRefreshing(false))
  }, [])

  const stats = useMemo(() => {
    const casasComRisco = casas.filter((c) => c.riscos.length > 0).length
    const comerciosFormalizados = comercios.filter((c) => c.formalizado).length
    const rotasPendentes = rotas.filter((r) => r.status === 'pendente').length
    const alertasAbertos = alertas.filter((a) => !a.resolvido).length

    const vulnerabilidades = familias.map((f) => {
      const casa = casas.find((c) => c.id === f.casaId)
      return indiceVulnerabilidade(f, casa)
    })
    const vulnMedia =
      vulnerabilidades.length > 0
        ? Math.round(vulnerabilidades.reduce((a, b) => a + b, 0) / vulnerabilidades.length)
        : 0

    const ranking = [...familias]
      .map((f) => ({
        ...f,
        vuln: indiceVulnerabilidade(f, casas.find((c) => c.id === f.casaId)),
      }))
      .sort((a, b) => b.vuln - a.vuln)
      .slice(0, 5)

    const infra = {
      agua: casas.filter((c) => c.aguaEncanada).length,
      esgoto: casas.filter((c) => c.esgoto).length,
      energia: casas.filter((c) => c.energiaEletrica).length,
      coleta: casas.filter((c) => c.coletaLixo).length,
    }

    return {
      casasComRisco,
      comerciosFormalizados,
      rotasPendentes,
      alertasAbertos,
      vulnMedia,
      ranking,
      infra,
      totalCasas: casas.length,
      totalFamilias: familias.length,
    }
  }, [familias, casas, rotas, alertas, comercios, freelancers])

  return (
    <FundoGradiente>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" colors={['#059669']} />}
      >
        <SectionTitle titulo="Painel" descricao="Visão geral da comunidade" />

        {/* Resumo */}
        <View style={s.grid}>
          <Estatistica rotulo="Famílias" valor={stats.totalFamilias} />
          <Estatistica rotulo="Casas" valor={stats.totalCasas} />
          <Estatistica rotulo="Rotas" valor={rotas.length} />
          <Estatistica
            rotulo="Vulnerabilidade"
            valor={`${stats.vulnMedia}%`}
            cor={stats.vulnMedia >= 70 ? '#dc2626' : stats.vulnMedia >= 45 ? '#ea580c' : '#059669'}
          />
        </View>

        {/* Infraestrutura */}
        <Card style={s.card}>
          <Text style={s.cardTitle}>Infraestrutura ({stats.totalCasas} casas)</Text>
          {stats.totalCasas > 0 && (
            <>
              <InfraLinha
                label="Água encanada"
                valor={stats.infra.agua}
                total={stats.totalCasas}
              />
              <InfraLinha label="Esgoto" valor={stats.infra.esgoto} total={stats.totalCasas} />
              <InfraLinha
                label="Energia elétrica"
                valor={stats.infra.energia}
                total={stats.totalCasas}
              />
              <InfraLinha label="Coleta de lixo" valor={stats.infra.coleta} total={stats.totalCasas} />
            </>
          )}
          {stats.totalCasas === 0 && <Text style={s.emptyText}>Nenhuma casa cadastrada.</Text>}
        </Card>

        {/* Economia */}
        <Card style={s.card}>
          <Text style={s.cardTitle}>Economia local</Text>
          <View style={s.econRow}>
            <Badge texto={`${comercios.length} comércio${comercios.length !== 1 ? 's' : ''}`} />
            <Badge
              texto={`${stats.comerciosFormalizados} formalizado${stats.comerciosFormalizados !== 1 ? 's' : ''}`}
              fundo="#ecfdf5"
              cor="#065f46"
            />
          </View>
          <View style={s.econRow}>
            <Badge texto={`${freelancers.length} prestador${freelancers.length !== 1 ? 'es' : ''}`} />
          </View>
        </Card>

        {/* Ranking vulnerabilidade */}
        <Card style={s.card}>
          <Text style={s.cardTitle}>Ranking de vulnerabilidade</Text>
          {stats.ranking.length > 0 ? (
            stats.ranking.map((f, i) => {
              const faixa = faixaVulnerabilidade(f.vuln)
              return (
                <View key={f.id} style={s.rankItem}>
                  <Text style={s.rankPos}>{i + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rankNome}>{f.nomeFamilia}</Text>
                    <Text style={s.rankResp}>{f.responsavel}</Text>
                  </View>
                  <Badge texto={faixa.rotulo} fundo={faixa.fundo} cor={faixa.texto} />
                </View>
              )
            })
          ) : (
            <Text style={s.emptyText}>Nenhuma família cadastrada.</Text>
          )}
        </Card>

        {/* Alertas */}
        <Card style={s.card}>
          <Text style={s.cardTitle}>Alertas abertos</Text>
          {alertas.filter((a) => !a.resolvido).length > 0 ? (
            alertas
              .filter((a) => !a.resolvido)
              .map((a) => (
                <View key={a.id} style={s.alertItem}>
                  <Badge
                    texto={a.gravidade}
                    fundo={
                      a.gravidade === 'Alta'
                        ? '#fee2e2'
                        : a.gravidade === 'Média'
                          ? '#fef3c7'
                          : '#e0f2fe'
                    }
                    cor={
                      a.gravidade === 'Alta'
                        ? '#991b1b'
                        : a.gravidade === 'Média'
                          ? '#92400e'
                          : '#075985'
                    }
                  />
                  <Text style={s.alertTipo}>{a.tipo}</Text>
                </View>
              ))
          ) : (
            <Text style={s.emptyText}>Nenhum alerta aberto.</Text>
          )}
        </Card>

        {/* Rotas pendentes */}
        <Card style={s.card}>
          <Text style={s.cardTitle}>Rotas pendentes</Text>
          {rotas.filter((r) => r.status === 'pendente').length > 0 ? (
            rotas
              .filter((r) => r.status === 'pendente')
              .map((r) => (
                <View key={r.id} style={s.alertItem}>
                  <Badge texto="Pendente" fundo="#fef3c7" cor="#92400e" />
                  <Text style={s.alertTipo}>{r.nome}</Text>
                </View>
              ))
          ) : (
            <Text style={s.emptyText}>Nenhuma rota pendente.</Text>
          )}
        </Card>
      </ScrollView>
    </FundoGradiente>
  )
}

function InfraLinha({
  label,
  valor,
  total,
}: {
  label: string
  valor: number
  total: number
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <View style={s.infraRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.infraLabel}>{label}</Text>
        <Text style={s.infraValor}>
          {valor}/{total} ({pct}%)
        </Text>
      </View>
      <BarraProgresso valor={pct} cor="#059669" />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, paddingBottom: 32 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  card: { marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },
  infraRow: { marginBottom: 12 },
  infraLabel: { fontSize: 13, fontWeight: '500', color: '#334155' },
  infraValor: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  econRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  rankPos: { fontSize: 14, fontWeight: '700', color: '#64748b', width: 20 },
  rankNome: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  rankResp: { fontSize: 12, color: '#64748b' },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  alertTipo: { fontSize: 14, color: '#334155', flex: 1 },
})
