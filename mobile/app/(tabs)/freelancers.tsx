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
import { useAuth } from '../../src/store/AuthStore'
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
  DISPONIBILIDADES,
  type Freelancer,
  type Disponibilidade,
} from '../../src/lib/types'
import { moeda } from '../../src/lib/utils'

export default function Freelancers() {
  const { estado, addFreelancer, updateFreelancer, removeFreelancer } = useApp()
  const { usuario: authUsuario } = useAuth()
  const { freelancers } = estado

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Disponibilidade | ''>('')
  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Freelancer | null>(null)
  const { recarregar } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    recarregar().finally(() => setRefreshing(false))
  }, [])

  // Form state
  const [nome, setNome] = useState('')
  const [profissao, setProfissao] = useState('')
  const [descricao, setDescricao] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState(false)
  const [habilidades, setHabilidades] = useState<string[]>([])
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade[]>([])
  const [precoMin, setPrecoMin] = useState('')
  const [precoMax, setPrecoMax] = useState('')
  const [unidadePreco, setUnidadePreco] = useState<'hora' | 'diária' | 'serviço'>('serviço')
  const [atendeDomicilio, setAtendeDomicilio] = useState(false)
  const [temTransporte, setTemTransporte] = useState(false)
  const [bairro, setBairro] = useState('')
  const [habilidadesText, setHabilidadesText] = useState('')

  const lista = useMemo(() => {
    return freelancers.filter((f) => {
      const textoBusca = `${f.nome} ${f.profissao} ${f.habilidades.join(' ')} ${f.bairro}`.toLowerCase()
      const matchBusca = !busca || textoBusca.includes(busca.toLowerCase())
      const matchFiltro = !filtro || f.disponibilidade.includes(filtro)
      return matchBusca && matchFiltro
    })
  }, [freelancers, busca, filtro])

  function limparForm() {
    setNome('')
    setProfissao('')
    setDescricao('')
    setTelefone('')
    setWhatsapp(false)
    setHabilidades([])
    setDisponibilidade([])
    setPrecoMin('')
    setPrecoMax('')
    setUnidadePreco('serviço')
    setAtendeDomicilio(false)
    setTemTransporte(false)
    setBairro('')
    setHabilidadesText('')
    setEditando(null)
  }

  function abrirNovo() {
    limparForm()
    setModalVisivel(true)
  }

  function abrirEditar(f: Freelancer) {
    setNome(f.nome)
    setProfissao(f.profissao)
    setDescricao(f.descricao)
    setTelefone(f.telefone)
    setWhatsapp(f.whatsapp)
    setHabilidades(f.habilidades)
    setDisponibilidade(f.disponibilidade)
    setPrecoMin(String(f.precoMin))
    setPrecoMax(String(f.precoMax))
    setUnidadePreco(f.unidadePreco)
    setAtendeDomicilio(f.atendeDomicilio)
    setTemTransporte(f.temTransporte)
    setBairro(f.bairro)
    setHabilidadesText(f.habilidades.join(', '))
    setEditando(f)
    setModalVisivel(true)
  }

  function salvar() {
    if (!nome.trim() || !profissao.trim()) {
      Alert.alert('Erro', 'Nome e profissão são obrigatórios.')
      return
    }
    const dados = {
      nome: nome.trim(),
      profissao: profissao.trim(),
      descricao: descricao.trim(),
      telefone: telefone.trim(),
      whatsapp,
      habilidades: habilidadesText
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean),
      disponibilidade,
      precoMin: Number(precoMin) || 0,
      precoMax: Number(precoMax) || 0,
      unidadePreco,
      atendeDomicilio,
      temTransporte,
      bairro: bairro.trim(),
      autor: editando ? editando.autor : (authUsuario?.id || ''),
    }

    if (editando) {
      updateFreelancer(editando.id, dados)
    } else {
      addFreelancer(dados)
    }
    setModalVisivel(false)
    limparForm()
  }

  function excluir(f: Freelancer) {
    Alert.alert('Excluir', `Excluir "${f.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => removeFreelancer(f.id),
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
          titulo="Freelancers"
          descricao={`${freelancers.length} cadastrado${freelancers.length !== 1 ? 's' : ''}`}
          acao="+ Novo"
          onAcao={abrirNovo}
        />

        <View style={s.filtros}>
          <TextInput
            style={s.busca}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar freelancer..."
            placeholderTextColor="#94a3b8"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categRow}>
            <TouchableOpacity
              style={[s.categBtn, !filtro && s.categBtnAtivo]}
              onPress={() => setFiltro('')}
            >
              <Text style={[s.categBtnText, !filtro && s.categBtnTextAtivo]}>Todos</Text>
            </TouchableOpacity>
            {DISPONIBILIDADES.map((d) => (
              <TouchableOpacity
                key={d}
                style={[s.categBtn, filtro === d && s.categBtnAtivo]}
                onPress={() => setFiltro(filtro === d ? '' : d)}
              >
                <Text style={[s.categBtnText, filtro === d && s.categBtnTextAtivo]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {lista.length === 0 ? (
          <Vazio mensagem="Nenhum freelancer encontrado." acao="Adicionar freelancer" onAcao={abrirNovo} />
        ) : (
          lista.map((f) => (
            <Card key={f.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.avatar, { backgroundColor: '#ecfdf5' }]}>
                  <Text style={[s.avatarText, { color: '#065f46' }]}>
                    {f.nome.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardNome}>{f.nome}</Text>
                  <Text style={s.cardProf}>{f.profissao}</Text>
                </View>
              </View>

              <Text style={s.cardDesc}>{f.descricao}</Text>

              <View style={s.infoGrid}>
                <InfoLinha icon="📍" valor={f.bairro} />
                <InfoLinha icon={f.whatsapp ? '💬' : '📞'} valor={f.telefone} />
                <InfoLinha
                  icon="💰"
                  valor={`${moeda(f.precoMin)} — ${moeda(f.precoMax)} / ${f.unidadePreco}`}
                />
              </View>

              {f.disponibilidade.length > 0 && (
                <View style={s.tagsRow}>
                  {f.disponibilidade.map((d) => (
                    <Badge key={d} texto={d} fundo="#e0f2fe" cor="#075985" />
                  ))}
                </View>
              )}

              <View style={s.badgesRow}>
                {f.atendeDomicilio && <Badge texto="Domicílio" fundo="#f5f3ff" cor="#5b21b6" />}
                {f.temTransporte && <Badge texto="Transporte" fundo="#ecfdf5" cor="#065f46" />}
              </View>

              {f.autor === authUsuario?.id && (
                <View style={s.cardActions}>
                  <Botao titulo="Editar" variante="secundario" onPress={() => abrirEditar(f)} />
                  <Botao titulo="Excluir" variante="perigo" onPress={() => excluir(f)} />
                </View>
              )}
            </Card>
          ))
        )}

        <Modal
          visivel={modalVisivel}
          onFechar={() => {
            setModalVisivel(false)
            limparForm()
          }}
          titulo={editando ? 'Editar freelancer' : 'Novo freelancer'}
        >
          <Campo label="Nome *">
            <Input value={nome} onChangeText={setNome} placeholder="Nome completo" />
          </Campo>

          <Campo label="Profissão *">
            <Input value={profissao} onChangeText={setProfissao} placeholder="Ex: Eletricista" />
          </Campo>

          <Campo label="Descrição">
            <Input value={descricao} onChangeText={setDescricao} multiline placeholder="Descreva sua experiência" />
          </Campo>

          <Campo label="Telefone">
            <Input value={telefone} onChangeText={setTelefone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
          </Campo>

          <Checkbox label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />

          <Campo label="Habilidades" dica="Separadas por vírgula">
            <Input value={habilidadesText} onChangeText={setHabilidadesText} placeholder="Ex: instalação, reparo" />
          </Campo>

          <MultiSelect
            label="Disponibilidade"
            options={DISPONIBILIDADES}
            value={disponibilidade}
            onChange={(v) => setDisponibilidade(v as Disponibilidade[])}
          />

          <View style={s.precosRow}>
            <Campo label="Preço mín.">
              <Input value={precoMin} onChangeText={setPrecoMin} placeholder="0" keyboardType="numeric" />
            </Campo>
            <Campo label="Preço máx.">
              <Input value={precoMax} onChangeText={setPrecoMax} placeholder="0" keyboardType="numeric" />
            </Campo>
          </View>

          <Campo label="Unidade">
            <Select
              value={unidadePreco}
              options={['hora', 'diária', 'serviço']}
              onValueChange={(v) => setUnidadePreco(v as 'hora' | 'diária' | 'serviço')}
            />
          </Campo>

          <Campo label="Bairro">
            <Input value={bairro} onChangeText={setBairro} placeholder="Bairro" />
          </Campo>

          <Checkbox label="Atende a domicílio" value={atendeDomicilio} onChange={setAtendeDomicilio} />
          <Checkbox label="Tem transporte próprio" value={temTransporte} onChange={setTemTransporte} />

          <Botao titulo={editando ? 'Salvar alterações' : 'Criar freelancer'} onPress={salvar} />
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
  filtros: { marginBottom: 16 },
  busca: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 8,
  },
  categRow: { flexDirection: 'row', gap: 6 },
  categBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  categBtnAtivo: { backgroundColor: '#059669', borderColor: '#059669' },
  categBtnText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  categBtnTextAtivo: { color: '#fff' },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardProf: { fontSize: 13, color: '#64748b' },
  cardDesc: { fontSize: 14, color: '#475569', marginBottom: 8 },
  infoGrid: { gap: 4, marginBottom: 8 },
  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#334155', flex: 1 },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 6 },
  badgesRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  precosRow: { flexDirection: 'row', gap: 12 },
})
