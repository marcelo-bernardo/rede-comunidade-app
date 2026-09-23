import React, { useState, useMemo, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { useApp } from '../../src/store/AppStore'
import {
  Card,
  SectionTitle,
  Botao,
  Badge,
  Modal,
  Campo,
  Input,
  Select,
  Checkbox,
  MultiSelect,
  Vazio,
  FundoGradiente,
} from '../../src/components/ui'
import {
  TIPOS_CONSTRUCAO,
  SITUACOES_MORADIA,
  RISCOS,
  type Casa,
  type TipoConstrucao,
  type SituacaoMoradia,
  type Risco,
} from '../../src/lib/types'

export default function Casas() {
  const { estado, addCasa, updateCasa, removeCasa } = useApp()
  const { casas, familias } = estado

  const [busca, setBusca] = useState('')
  const [soRisco, setSoRisco] = useState(false)
  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Casa | null>(null)
  const { recarregar } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    recarregar().finally(() => setRefreshing(false))
  }, [])

  // Form state
  const [apelido, setApelido] = useState('')
  const [endereco, setEndereco] = useState('')
  const [quadra, setQuadra] = useState('')
  const [lote, setLote] = useState('')
  const [tipoConstrucao, setTipoConstrucao] = useState<TipoConstrucao>('Alvenaria')
  const [situacao, setSituacao] = useState<SituacaoMoradia>('Própria')
  const [comodos, setComodos] = useState('')
  const [aguaEncanada, setAguaEncanada] = useState(false)
  const [esgoto, setEsgoto] = useState(false)
  const [energiaEletrica, setEnergiaEletrica] = useState(false)
  const [coletaLixo, setColetaLixo] = useState(false)
  const [riscos, setRiscos] = useState<Risco[]>([])
  const [observacoes, setObservacoes] = useState('')

  const lista = useMemo(() => {
    return casas.filter((c) => {
      const textoBusca = `${c.apelido} ${c.endereco} ${c.quadra}`.toLowerCase()
      const matchBusca = !busca || textoBusca.includes(busca.toLowerCase())
      const matchRisco = !soRisco || c.riscos.length > 0
      return matchBusca && matchRisco
    })
  }, [casas, busca, soRisco])

  function contarFamilias(casaId: string) {
    return familias.filter((f) => f.casaId === casaId).length
  }

  function limparForm() {
    setApelido('')
    setEndereco('')
    setQuadra('')
    setLote('')
    setTipoConstrucao('Alvenaria')
    setSituacao('Própria')
    setComodos('')
    setAguaEncanada(false)
    setEsgoto(false)
    setEnergiaEletrica(false)
    setColetaLixo(false)
    setRiscos([])
    setObservacoes('')
    setEditando(null)
  }

  function abrirNovo() {
    limparForm()
    setModalVisivel(true)
  }

  function abrirEditar(c: Casa) {
    setApelido(c.apelido)
    setEndereco(c.endereco)
    setQuadra(c.quadra)
    setLote(c.lote)
    setTipoConstrucao(c.tipoConstrucao)
    setSituacao(c.situacao)
    setComodos(String(c.comodos))
    setAguaEncanada(c.aguaEncanada)
    setEsgoto(c.esgoto)
    setEnergiaEletrica(c.energiaEletrica)
    setColetaLixo(c.coletaLixo)
    setRiscos(c.riscos)
    setObservacoes(c.observacoes)
    setEditando(c)
    setModalVisivel(true)
  }

  function salvar() {
    if (!apelido.trim()) {
      Alert.alert('Erro', 'Apelido é obrigatório.')
      return
    }
    const dados = {
      apelido: apelido.trim(),
      endereco: endereco.trim(),
      quadra: quadra.trim(),
      lote: lote.trim(),
      tipoConstrucao,
      situacao,
      comodos: Number(comodos) || 0,
      aguaEncanada,
      esgoto,
      energiaEletrica,
      coletaLixo,
      riscos,
      observacoes: observacoes.trim(),
    }

    if (editando) {
      updateCasa(editando.id, dados)
    } else {
      addCasa(dados)
    }
    setModalVisivel(false)
    limparForm()
  }

  function excluir(c: Casa) {
    const famVinculadas = contarFamilias(c.id)
    const msg =
      famVinculadas > 0
        ? `"${c.apelido}" tem ${famVinculadas} família(s) vinculada(s). Elas serão desvinculadas. Excluir?`
        : `Excluir "${c.apelido}"?`

    Alert.alert('Excluir', msg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => removeCasa(c.id),
      },
    ])
  }

  return (
    <FundoGradiente>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" colors={['#059669']} />}
      >
        <SectionTitle
          titulo="Casas"
          descricao={`${casas.length} cadastrada${casas.length !== 1 ? 's' : ''}`}
          acao="+ Nova"
          onAcao={abrirNovo}
        />

        <View style={s.filtros}>
          <TextInput
            style={s.busca}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar casa..."
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[s.riscoBtn, soRisco && s.riscoBtnAtivo]}
            onPress={() => setSoRisco(!soRisco)}
          >
            <Text style={[s.riscoBtnText, soRisco && s.riscoBtnTextAtivo]}>⚠️ Só com risco</Text>
          </TouchableOpacity>
        </View>

        {lista.length === 0 ? (
          <Vazio mensagem="Nenhuma casa encontrada." acao="Adicionar casa" onAcao={abrirNovo} />
        ) : (
          lista.map((c) => (
            <Card key={c.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardNome}>{c.apelido}</Text>
                {c.riscos.length > 0 && <Badge texto="Risco" fundo="#fee2e2" cor="#991b1b" />}
              </View>

              <Text style={s.cardEnd}>{c.endereco}</Text>

              <View style={s.infoGrid}>
                <InfoLinha icon="🏗️" valor={`${c.tipoConstrucao} · ${c.situacao}`} />
                <InfoLinha icon="🚪" valor={`${c.comodos} cômodo${c.comodos !== 1 ? 's' : ''}`} />
                <InfoLinha icon="👨‍👩‍👧‍👦" valor={`${contarFamilias(c.id)} família(s)`} />
              </View>

              <View style={s.infraRow}>
                <InfraBadge label="Água" ok={c.aguaEncanada} />
                <InfraBadge label="Esgoto" ok={c.esgoto} />
                <InfraBadge label="Energia" ok={c.energiaEletrica} />
                <InfraBadge label="Coleta" ok={c.coletaLixo} />
              </View>

              {c.riscos.length > 0 && (
                <View style={s.tagsRow}>
                  {c.riscos.map((r) => (
                    <Badge key={r} texto={r} fundo="#fee2e2" cor="#991b1b" />
                  ))}
                </View>
              )}

              {c.observacoes ? (
                <Text style={s.observacoes}>{c.observacoes}</Text>
              ) : null}

              <View style={s.cardActions}>
                <Botao titulo="Editar" variante="secundario" onPress={() => abrirEditar(c)} />
                <Botao titulo="Excluir" variante="perigo" onPress={() => excluir(c)} />
              </View>
            </Card>
          ))
        )}

        <Modal
          visivel={modalVisivel}
          onFechar={() => {
            setModalVisivel(false)
            limparForm()
          }}
          titulo={editando ? 'Editar casa' : 'Nova casa'}
        >
          <Campo label="Apelido *">
            <Input value={apelido} onChangeText={setApelido} placeholder="Ex: Casa da Dona Maria" />
          </Campo>

          <Campo label="Endereço">
            <Input value={endereco} onChangeText={setEndereco} placeholder="Endereço completo" />
          </Campo>

          <View style={s.row2}>
            <Campo label="Quadra">
              <Input value={quadra} onChangeText={setQuadra} placeholder="Q" />
            </Campo>
            <Campo label="Lote">
              <Input value={lote} onChangeText={setLote} placeholder="L" />
            </Campo>
          </View>

          <Campo label="Tipo de construção">
            <Select
              value={tipoConstrucao}
              options={TIPOS_CONSTRUCAO}
              onValueChange={(v) => setTipoConstrucao(v as TipoConstrucao)}
            />
          </Campo>

          <Campo label="Situação da moradia">
            <Select
              value={situacao}
              options={SITUACOES_MORADIA}
              onValueChange={(v) => setSituacao(v as SituacaoMoradia)}
            />
          </Campo>

          <Campo label="Cômodos">
            <Input value={comodos} onChangeText={setComodos} keyboardType="numeric" placeholder="0" />
          </Campo>

          <Checkbox label="Água encanada" value={aguaEncanada} onChange={setAguaEncanada} />
          <Checkbox label="Esgoto" value={esgoto} onChange={setEsgoto} />
          <Checkbox label="Energia elétrica" value={energiaEletrica} onChange={setEnergiaEletrica} />
          <Checkbox label="Coleta de lixo" value={coletaLixo} onChange={setColetaLixo} />

          <MultiSelect
            label="Riscos"
            options={RISCOS}
            value={riscos}
            onChange={(v) => setRiscos(v as Risco[])}
          />

          <Campo label="Observações">
            <Input value={observacoes} onChangeText={setObservacoes} multiline placeholder="Observações..." />
          </Campo>

          <Botao titulo={editando ? 'Salvar alterações' : 'Criar casa'} onPress={salvar} />
        </Modal>
      </ScrollView>
    </FundoGradiente>
  )
}

function InfraBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <Badge
      texto={label}
      fundo={ok ? '#d1fae5' : '#fee2e2'}
      cor={ok ? '#065f46' : '#991b1b'}
    />
  )
}

function InfoLinha({ icon, valor }: { icon: string; valor: string }) {
  if (!valor) return null
  return (
    <View style={s.infoLinha}>
      <Text>{icon}</Text>
      <Text style={s.infoText}>{valor}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, paddingBottom: 32 },
  filtros: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  busca: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
  },
  riscoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  riscoBtnAtivo: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  riscoBtnText: { fontSize: 13, color: '#475569' },
  riscoBtnTextAtivo: { color: '#991b1b' },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  cardEnd: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  infoGrid: { gap: 4, marginBottom: 8 },
  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#334155', flex: 1 },
  infraRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 8 },
  observacoes: { fontSize: 13, color: '#64748b', fontStyle: 'italic', marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  row2: { flexDirection: 'row', gap: 12 },
})
