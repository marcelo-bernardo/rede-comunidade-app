import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native'
import { useAuth } from '../../src/store/AuthStore'
import { SectionTitle, Badge, Card, Vazio, FundoGradiente } from '../../src/components/ui'
import { formatarData } from '../../src/lib/utils'

function formatarCpf(cpf: string): string {
  const apenasNumeros = cpf.replace(/\D/g, '')
  if (apenasNumeros.length !== 11) return cpf
  return `${apenasNumeros.slice(0, 3)}.${apenasNumeros.slice(3, 6)}.${apenasNumeros.slice(6, 9)}-${apenasNumeros.slice(9)}`
}

type Pendente = {
  id: string
  nome: string
  cpf: string
  rua: string
  email: string
  telefone: string
  criadoEm: string
}

export default function AprovacoesScreen() {
  const { listarPendentes, aprovarCadastro, recusarCadastro } = useAuth()
  const pendentes: Pendente[] = listarPendentes()
  const { recarregarUsuarios } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    recarregarUsuarios().finally(() => setRefreshing(false))
  }, [])

  function handleAprovar(item: Pendente) {
    Alert.alert(
      'Aprovar cadastro',
      `Deseja aprovar o cadastro de ${item.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: () => aprovarCadastro(item.id),
        },
      ],
    )
  }

  function handleRecusar(item: Pendente) {
    Alert.alert(
      'Recusar cadastro',
      `Deseja recusar o cadastro de ${item.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: () => recusarCadastro(item.id),
        },
      ],
    )
  }

  function renderItem({ item }: { item: Pendente }) {
    return (
      <Card style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.nome}>{item.nome}</Text>
          <Badge texto="Pendente" fundo="#fef3c7" cor="#92400e" />
        </View>

        <View style={s.info}>
          <Text style={s.infoLabel}>CPF:</Text>
          <Text style={s.infoValue}>{formatarCpf(item.cpf)}</Text>
        </View>

        <View style={s.info}>
          <Text style={s.infoLabel}>Rua:</Text>
          <Text style={s.infoValue}>{item.rua || '—'}</Text>
        </View>

        <View style={s.info}>
          <Text style={s.infoLabel}>E-mail:</Text>
          <Text style={s.infoValue}>{item.email}</Text>
        </View>

        {item.telefone ? (
          <View style={s.info}>
            <Text style={s.infoLabel}>Telefone:</Text>
            <Text style={s.infoValue}>{item.telefone}</Text>
          </View>
        ) : null}

        <View style={s.info}>
          <Text style={s.infoLabel}>Solicitado em:</Text>
          <Text style={s.infoValue}>{formatarData(item.criadoEm)}</Text>
        </View>

        <View style={s.botoes}>
          <TouchableOpacity
            style={s.btnAprovar}
            onPress={() => handleAprovar(item)}
            activeOpacity={0.7}
          >
            <Text style={s.btnAprovarText}>✓ Aprovar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btnRecusar}
            onPress={() => handleRecusar(item)}
            activeOpacity={0.7}
          >
            <Text style={s.btnRecusarText}>✕ Recusar</Text>
          </TouchableOpacity>
        </View>
      </Card>
    )
  }

  return (
    <FundoGradiente>
      <View style={s.container}>
        <FlatList
          data={pendentes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.lista}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" colors={['#059669']} />}
          ListHeaderComponent={
            <SectionTitle
              titulo="Solicitações Pendentes"
              descricao={`${pendentes.length} aguardando análise`}
            />
          }
          ListEmptyComponent={
            <Vazio
              mensagem="Nenhuma solicitação pendente no momento."
              acao="Atualizar"
              onAcao={() => {}}
            />
          }
        />
      </View>
    </FundoGradiente>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  lista: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  info: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    width: 90,
  },
  infoValue: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  botoes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  btnAprovar: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnAprovarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnRecusar: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnRecusarText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
})
