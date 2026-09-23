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
  BarraProgresso,
  Vazio,
  FundoGradiente,
} from '../../src/components/ui'
import {
  PARENTESCOS,
  ESCOLARIDADES,
  BENEFICIOS,
  type Familia,
  type Membro,
  type Parentesco,
  type Escolaridade,
  type Beneficio,
} from '../../src/lib/types'
import {
  indiceVulnerabilidade,
  faixaVulnerabilidade,
  moeda,
  idade,
} from '../../src/lib/utils'

export default function Familias() {
  const { estado, addFamilia, updateFamilia, removeFamilia } = useApp()
  const { familias, casas } = estado

  const [busca, setBusca] = useState('')
  const [ordenar, setOrdenar] = useState<'vulnerabilidade' | 'nome'>('vulnerabilidade')
  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Familia | null>(null)
  const { recarregar } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    recarregar().finally(() => setRefreshing(false))
  }, [])

  // Form state
  const [nomeFamilia, setNomeFamilia] = useState('')
  const [casaId, setCasaId] = useState<string | null>(null)
  const [responsavel, setResponsavel] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nis, setNis] = useState('')
  const [rendaMensal, setRendaMensal] = useState('')
  const [beneficios, setBeneficios] = useState<Beneficio[]>([])
  const [membros, setMembros] = useState<Omit<Membro, 'id'>[]>([])
  const [observacoes, setObservacoes] = useState('')

  const lista = useMemo(() => {
    return familias
      .filter((f) => {
        const textoBusca = `${f.nomeFamilia} ${f.responsavel} ${f.nis} ${f.membros.map((m) => m.nome).join(' ')}`.toLowerCase()
        return !busca || textoBusca.includes(busca.toLowerCase())
      })
      .map((f) => ({
        ...f,
        vuln: indiceVulnerabilidade(f, casas.find((c) => c.id === f.casaId)),
      }))
      .sort((a, b) =>
        ordenar === 'vulnerabilidade' ? b.vuln - a.vuln : a.nomeFamilia.localeCompare(b.nomeFamilia),
      )
  }, [familias, busca, ordenar, casas])

  function limparForm() {
    setNomeFamilia('')
    setCasaId(null)
    setResponsavel('')
    setTelefone('')
    setNis('')
    setRendaMensal('')
    setBeneficios([])
    setMembros([])
    setObservacoes('')
    setEditando(null)
  }

  function abrirNovo() {
    limparForm()
    setModalVisivel(true)
  }

  function abrirEditar(f: Familia) {
    setNomeFamilia(f.nomeFamilia)
    setCasaId(f.casaId)
    setResponsavel(f.responsavel)
    setTelefone(f.telefone)
    setNis(f.nis)
    setRendaMensal(String(f.rendaMensal))
    setBeneficios(f.beneficios)
    setMembros(f.membros.map(({ id, ...rest }) => rest))
    setObservacoes(f.observacoes)
    setEditando(f)
    setModalVisivel(true)
  }

  function adicionarMembro() {
    setMembros([
      ...membros,
      {
        nome: '',
        nascimento: '',
        parentesco: 'Filho(a)',
        escolaridade: 'Fundamental incompleto',
        estuda: false,
        trabalha: false,
        pcd: false,
        doencaCronica: false,
        gestante: false,
      },
    ])
  }

  function atualizarMembro(index: number, dados: Partial<Omit<Membro, 'id'>>) {
    const novos = [...membros]
    novos[index] = { ...novos[index], ...dados }
    setMembros(novos)
  }

  function removerMembro(index: number) {
    setMembros(membros.filter((_, i) => i !== index))
  }

  function salvar() {
    if (!nomeFamilia.trim() || !responsavel.trim()) {
      Alert.alert('Erro', 'Nome da família e responsável são obrigatórios.')
      return
    }
    const dados = {
      nomeFamilia: nomeFamilia.trim(),
      casaId,
      responsavel: responsavel.trim(),
      telefone: telefone.trim(),
      nis: nis.trim(),
      rendaMensal: Number(rendaMensal) || 0,
      beneficios,
      membros: membros.map((m, i) => ({
        ...m,
        id: editando ? editando.membros[i]?.id ?? `mem_${Date.now()}_${i}` : `mem_${Date.now()}_${i}`,
      })),
      observacoes: observacoes.trim(),
    }

    if (editando) {
      updateFamilia(editando.id, dados)
    } else {
      addFamilia(dados)
    }
    setModalVisivel(false)
    limparForm()
  }

  function excluir(f: Familia) {
    Alert.alert('Excluir', `Excluir "${f.nomeFamilia}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => removeFamilia(f.id),
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
          titulo="Famílias"
          descricao={`${familias.length} registrada${familias.length !== 1 ? 's' : ''}`}
          acao="+ Nova"
          onAcao={abrirNovo}
        />

        <View style={s.filtros}>
          <TextInput
            style={s.busca}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar família..."
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[s.ordBtn, ordenar === 'vulnerabilidade' && s.ordBtnAtivo]}
            onPress={() => setOrdenar('vulnerabilidade')}
          >
            <Text style={[s.ordBtnText, ordenar === 'vulnerabilidade' && s.ordBtnTextAtivo]}>
              📊 Vulnerabilidade
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.ordBtn, ordenar === 'nome' && s.ordBtnAtivo]}
            onPress={() => setOrdenar('nome')}
          >
            <Text style={[s.ordBtnText, ordenar === 'nome' && s.ordBtnTextAtivo]}>🔤 Nome</Text>
          </TouchableOpacity>
        </View>

        {lista.length === 0 ? (
          <Vazio mensagem="Nenhuma família encontrada." acao="Adicionar família" onAcao={abrirNovo} />
        ) : (
          lista.map((f) => {
            const faixa = faixaVulnerabilidade(f.vuln)
            const casa = casas.find((c) => c.id === f.casaId)
            return (
              <Card key={f.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardNome}>{f.nomeFamilia}</Text>
                  <Badge texto={faixa.rotulo} fundo={faixa.fundo} cor={faixa.texto} />
                </View>

                <Text style={s.cardResp}>{f.responsavel}</Text>

                <View style={s.vulnContainer}>
                  <View style={s.vulnHeader}>
                    <Text style={s.vulnLabel}>Vulnerabilidade</Text>
                    <Text style={s.vulnValor}>{f.vuln}/100</Text>
                  </View>
                  <BarraProgresso valor={f.vuln} cor={faixa.fundo} />
                </View>

                <View style={s.infoGrid}>
                  <InfoLinha icon="📞" valor={f.telefone} />
                  {f.nis ? <InfoLinha icon="📄" valor={`NIS: ${f.nis}`} /> : null}
                  <InfoLinha icon="💰" valor={`Renda: ${moeda(f.rendaMensal)}`} />
                  {casa ? <InfoLinha icon="🏠" valor={casa.apelido} /> : null}
                  <InfoLinha icon="👥" valor={`${f.membros.length} membro(s)`} />
                </View>

                {f.beneficios.length > 0 && (
                  <View style={s.tagsRow}>
                    {f.beneficios.map((b) => (
                      <Badge key={b} texto={b} />
                    ))}
                  </View>
                )}

                <View style={s.cardActions}>
                  <Botao titulo="Editar" variante="secundario" onPress={() => abrirEditar(f)} />
                  <Botao titulo="Excluir" variante="perigo" onPress={() => excluir(f)} />
                </View>
              </Card>
            )
          })
        )}

        <Modal
          visivel={modalVisivel}
          onFechar={() => {
            setModalVisivel(false)
            limparForm()
          }}
          titulo={editando ? 'Editar família' : 'Nova família'}
        >
          <Campo label="Nome da família *">
            <Input value={nomeFamilia} onChangeText={setNomeFamilia} placeholder="Ex: Família Silva" />
          </Campo>

          <Campo label="Responsável *">
            <Input value={responsavel} onChangeText={setResponsavel} placeholder="Nome do responsável" />
          </Campo>

          <Campo label="Telefone">
            <Input value={telefone} onChangeText={setTelefone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
          </Campo>

          <Campo label="NIS">
            <Input value={nis} onChangeText={setNis} placeholder="000.00000.00-0" />
          </Campo>

          <Campo label="Renda mensal">
            <Input value={rendaMensal} onChangeText={setRendaMensal} keyboardType="numeric" placeholder="0" />
          </Campo>

          <MultiSelect
            label="Benefícios"
            options={BENEFICIOS}
            value={beneficios}
            onChange={(v) => setBeneficios(v as Beneficio[])}
          />

          <Campo label="Casa vinculada">
            <Select
              value={casaId ? casas.find((c) => c.id === casaId)?.apelido ?? '' : ''}
              options={['Nenhuma', ...casas.map((c) => c.apelido)]}
              onValueChange={(v) => {
                const c = casas.find((ca) => ca.apelido === v)
                setCasaId(c?.id ?? null)
              }}
              placeholder="Selecionar casa..."
            />
          </Campo>

          {/* Membros */}
          <View style={s.membrosHeader}>
            <Text style={s.membrosTitle}>Membros ({membros.length})</Text>
            <Botao titulo="+ Adicionar" variante="fantasma" onPress={adicionarMembro} />
          </View>

          {membros.map((m, i) => (
            <Card key={i} style={s.membroCard}>
              <View style={s.membroHeader}>
                <Text style={s.membroIdx}>#{i + 1}</Text>
                <TouchableOpacity onPress={() => removerMembro(i)}>
                  <Text style={s.membroRemove}>✕</Text>
                </TouchableOpacity>
              </View>

              <Campo label="Nome">
                <Input value={m.nome} onChangeText={(t) => atualizarMembro(i, { nome: t })} placeholder="Nome" />
              </Campo>

              <Campo label="Nascimento">
                <Input value={m.nascimento} onChangeText={(t) => atualizarMembro(i, { nascimento: t })} placeholder="AAAA-MM-DD" />
              </Campo>

              <Campo label="Parentesco">
                <Select
                  value={m.parentesco}
                  options={PARENTESCOS}
                  onValueChange={(v) => atualizarMembro(i, { parentesco: v as Parentesco })}
                />
              </Campo>

              <Campo label="Escolaridade">
                <Select
                  value={m.escolaridade}
                  options={ESCOLARIDADES}
                  onValueChange={(v) => atualizarMembro(i, { escolaridade: v as Escolaridade })}
                />
              </Campo>

              <Checkbox label="Estuda" value={m.estuda} onChange={(v) => atualizarMembro(i, { estuda: v })} />
              <Checkbox label="Trabalha" value={m.trabalha} onChange={(v) => atualizarMembro(i, { trabalha: v })} />
              <Checkbox label="PCD" value={m.pcd} onChange={(v) => atualizarMembro(i, { pcd: v })} />
              <Checkbox label="Doença crônica" value={m.doencaCronica} onChange={(v) => atualizarMembro(i, { doencaCronica: v })} />
              <Checkbox label="Gestante" value={m.gestante} onChange={(v) => atualizarMembro(i, { gestante: v })} />
            </Card>
          ))}

          <Campo label="Observações">
            <Input value={observacoes} onChangeText={setObservacoes} multiline placeholder="Observações..." />
          </Campo>

          <Botao titulo={editando ? 'Salvar alterações' : 'Criar família'} onPress={salvar} />
        </Modal>
      </ScrollView>
    </FundoGradiente>
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
  filtros: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  busca: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
  },
  ordBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  ordBtnAtivo: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  ordBtnText: { fontSize: 12, color: '#475569' },
  ordBtnTextAtivo: { color: '#065f46' },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  cardResp: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  vulnContainer: { marginBottom: 12 },
  vulnHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  vulnLabel: { fontSize: 12, color: '#64748b' },
  vulnValor: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  infoGrid: { gap: 4, marginBottom: 8 },
  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#334155', flex: 1 },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  membrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  membrosTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  membroCard: { marginBottom: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
  membroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  membroIdx: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  membroRemove: { fontSize: 16, color: '#dc2626', padding: 4 },
})
