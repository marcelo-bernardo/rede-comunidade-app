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
  Vazio,
  FundoGradiente,
} from '../../src/components/ui'
import { uid, hoje, formatarData } from '../../src/lib/utils'
import {
  CATEGORIAS_COMERCIO,
  type Comercio,
  type CategoriaComercio,
} from '../../src/lib/types'

export default function Comercios() {
  const { estado, addComercio, updateComercio, removeComercio } = useApp()
  const { usuario: authUsuario } = useAuth()
  const { comercios } = estado

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<CategoriaComercio | ''>('')
  const [modalVisivel, setModalVisivel] = useState(false)
  const [editando, setEditando] = useState<Comercio | null>(null)
  const { recarregar } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    recarregar().finally(() => setRefreshing(false))
  }, [])

  // Form state
  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [categoria, setCategoria] = useState<CategoriaComercio>('Alimentação')
  const [descricao, setDescricao] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState(false)
  const [endereco, setEndereco] = useState('')
  const [horario, setHorario] = useState('')
  const [formalizado, setFormalizado] = useState(false)
  const [cnpjMei, setCnpjMei] = useState('')
  const [aceitaFiado, setAceitaFiado] = useState(false)
  const [entrega, setEntrega] = useState(false)
  const [tags, setTags] = useState('')

  const lista = useMemo(() => {
    return comercios.filter((c) => {
      const textoBusca = `${c.nome} ${c.responsavel} ${c.endereco} ${c.tags.join(' ')}`.toLowerCase()
      const matchBusca = !busca || textoBusca.includes(busca.toLowerCase())
      const matchFiltro = !filtro || c.categoria === filtro
      return matchBusca && matchFiltro
    })
  }, [comercios, busca, filtro])

  function limparForm() {
    setNome('')
    setResponsavel('')
    setCategoria('Alimentação')
    setDescricao('')
    setTelefone('')
    setWhatsapp(false)
    setEndereco('')
    setHorario('')
    setFormalizado(false)
    setCnpjMei('')
    setAceitaFiado(false)
    setEntrega(false)
    setTags('')
    setEditando(null)
  }

  function abrirNovo() {
    limparForm()
    setModalVisivel(true)
  }

  function abrirEditar(c: Comercio) {
    setNome(c.nome)
    setResponsavel(c.responsavel)
    setCategoria(c.categoria)
    setDescricao(c.descricao)
    setTelefone(c.telefone)
    setWhatsapp(c.whatsapp)
    setEndereco(c.endereco)
    setHorario(c.horario)
    setFormalizado(c.formalizado)
    setCnpjMei(c.cnpjMei)
    setAceitaFiado(c.aceitaFiado)
    setEntrega(c.entrega)
    setTags(c.tags.join(', '))
    setEditando(c)
    setModalVisivel(true)
  }

  function salvar() {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório.')
      return
    }
    const dados = {
      nome: nome.trim(),
      responsavel: responsavel.trim(),
      categoria,
      descricao: descricao.trim(),
      telefone: telefone.trim(),
      whatsapp,
      endereco: endereco.trim(),
      horario: horario.trim(),
      formalizado,
      cnpjMei: cnpjMei.trim(),
      aceitaFiado,
      entrega,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      autor: editando ? editando.autor : (authUsuario?.id || ''),
    }

    if (editando) {
      updateComercio(editando.id, dados)
    } else {
      addComercio(dados)
    }
    setModalVisivel(false)
    limparForm()
  }

  function excluir(c: Comercio) {
    Alert.alert('Excluir', `Excluir "${c.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => removeComercio(c.id),
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
          titulo="Comércios"
          descricao={`${comercios.length} cadastrado${comercios.length !== 1 ? 's' : ''}`}
          acao="+ Novo"
          onAcao={abrirNovo}
        />

        <View style={s.filtros}>
          <TextInput
            style={s.busca}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar comércio..."
            placeholderTextColor="#94a3b8"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categRow}>
            <TouchableOpacity
              style={[s.categBtn, !filtro && s.categBtnAtivo]}
              onPress={() => setFiltro('')}
            >
              <Text style={[s.categBtnText, !filtro && s.categBtnTextAtivo]}>Todos</Text>
            </TouchableOpacity>
            {CATEGORIAS_COMERCIO.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.categBtn, filtro === cat && s.categBtnAtivo]}
                onPress={() => setFiltro(filtro === cat ? '' : cat)}
              >
                <Text style={[s.categBtnText, filtro === cat && s.categBtnTextAtivo]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {lista.length === 0 ? (
          <Vazio mensagem="Nenhum comércio encontrado." acao="Adicionar comércio" onAcao={abrirNovo} />
        ) : (
          lista.map((c) => (
            <Card key={c.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardNome}>{c.nome}</Text>
                  <Text style={s.cardSub}>{c.categoria}</Text>
                </View>
                <View style={s.cardBadges}>
                  {c.formalizado && <Badge texto="Formal" fundo="#ecfdf5" cor="#065f46" />}
                  {c.aceitaFiado && <Badge texto="Fiado" />}
                  {c.entrega && <Badge texto="Entrega" fundo="#f5f3ff" cor="#5b21b6" />}
                </View>
              </View>

              <Text style={s.cardDesc}>{c.descricao}</Text>

              <View style={s.infoGrid}>
                <InfoLinha icon="👤" valor={c.responsavel} />
                <InfoLinha icon="📍" valor={c.endereco} />
                <InfoLinha icon="🕐" valor={c.horario} />
                {c.telefone ? (
                  <InfoLinha icon={c.whatsapp ? '💬' : '📞'} valor={c.telefone} />
                ) : null}
              </View>

              {c.tags.length > 0 && (
                <View style={s.tagsRow}>
                  {c.tags.map((t) => (
                    <Badge key={t} texto={t} fundo="#f1f5f9" cor="#475569" />
                  ))}
                </View>
              )}

              {c.autor === authUsuario?.id && (
                <View style={s.cardActions}>
                  <Botao titulo="Editar" variante="secundario" onPress={() => abrirEditar(c)} />
                  <Botao titulo="Excluir" variante="perigo" onPress={() => excluir(c)} />
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
          titulo={editando ? 'Editar comércio' : 'Novo comércio'}
        >
          <Campo label="Nome *">
            <Input value={nome} onChangeText={setNome} placeholder="Nome do comércio" />
          </Campo>

          <Campo label="Responsável">
            <Input value={responsavel} onChangeText={setResponsavel} placeholder="Nome do responsável" />
          </Campo>

          <Campo label="Categoria">
            <Select
              value={categoria}
              options={CATEGORIAS_COMERCIO}
              onValueChange={(v) => setCategoria(v as CategoriaComercio)}
            />
          </Campo>

          <Campo label="Descrição">
            <Input value={descricao} onChangeText={setDescricao} multiline placeholder="Descreva o comércio" />
          </Campo>

          <Campo label="Telefone">
            <Input value={telefone} onChangeText={setTelefone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
          </Campo>

          <Checkbox label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />

          <Campo label="Endereço">
            <Input value={endereco} onChangeText={setEndereco} placeholder="Endereço completo" />
          </Campo>

          <Campo label="Horário">
            <Input value={horario} onChangeText={setHorario} placeholder="Ex: Seg a sáb, 7h às 20h" />
          </Campo>

          <Checkbox label="Formalizado (MEI/CNPJ)" value={formalizado} onChange={setFormalizado} />

          {formalizado && (
            <Campo label="CNPJ/MEI">
              <Input value={cnpjMei} onChangeText={setCnpjMei} placeholder="00.000.000/0001-00" />
            </Campo>
          )}

          <Checkbox label="Aceita fiado" value={aceitaFiado} onChange={setAceitaFiado} />
          <Checkbox label="Faz entrega" value={entrega} onChange={setEntrega} />

          <Campo label="Tags" dica="Separadas por vírgula">
            <Input value={tags} onChangeText={setTags} placeholder="Ex: gás, água, hortifruti" />
          </Campo>

          <Botao titulo={editando ? 'Salvar alterações' : 'Criar comércio'} onPress={salvar} />
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
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  cardBadges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  cardDesc: { fontSize: 14, color: '#475569', marginBottom: 8 },
  infoGrid: { gap: 4, marginBottom: 8 },
  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#334155', flex: 1 },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
})
