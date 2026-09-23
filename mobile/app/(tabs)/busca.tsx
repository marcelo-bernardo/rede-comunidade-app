import React, { useState, useMemo, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal as RNModal,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { useApp } from '../../src/store/AppStore'
import { useAuth } from '../../src/store/AuthStore'
import {
  Card,
  SectionTitle,
  Badge,
  Vazio,
  FundoGradiente,
} from '../../src/components/ui'
import {
  formatarData,
  idade,
  indiceVulnerabilidade,
  faixaVulnerabilidade,
  moeda,
} from '../../src/lib/utils'
import type { StatusCadastro, Perfil, Usuario } from '../../src/lib/types'

type StatusFiltro = StatusCadastro | 'TODOS'
type PerfilFiltro = Perfil | 'TODOS'
type IdadeCategoria = 'TODOS' | 'criancas' | 'jovens' | 'adultos' | 'idosos'

const IDADE_CATEGORIAS: { label: string; valor: IdadeCategoria; icone: string; min: number; max: number }[] = [
  { label: 'Todos', valor: 'TODOS', icone: '👥', min: 0, max: 150 },
  { label: 'Crianças', valor: 'criancas', icone: '👶', min: 0, max: 12 },
  { label: 'Jovens', valor: 'jovens', icone: '🧑', min: 13, max: 24 },
  { label: 'Adultos', valor: 'adultos', icone: '👨', min: 25, max: 59 },
  { label: 'Idosos', valor: 'idosos', icone: '👴', min: 60, max: 150 },
]

const STATUS_OPCOES: { label: string; valor: StatusFiltro; fundo: string; cor: string }[] = [
  { label: 'Todos', valor: 'TODOS', fundo: '#f1f5f9', cor: '#334155' },
  { label: 'Pendente', valor: 'PENDENTE', fundo: '#fef3c7', cor: '#92400e' },
  { label: 'Aprovado', valor: 'APROVADO', fundo: '#d1fae5', cor: '#065f46' },
  { label: 'Recusado', valor: 'REJEITADO', fundo: '#fee2e2', cor: '#991b1b' },
]

const PERFIL_OPCOES: { label: string; valor: PerfilFiltro }[] = [
  { label: 'Todos', valor: 'TODOS' },
  { label: 'Morador', valor: 'MORADOR' },
  { label: 'Admin', valor: 'ADMIN' },
]

const STATUS_CORES: Record<StatusCadastro, { fundo: string; cor: string }> = {
  PENDENTE: { fundo: '#fef3c7', cor: '#92400e' },
  APROVADO: { fundo: '#d1fae5', cor: '#065f46' },
  REJEITADO: { fundo: '#fee2e2', cor: '#991b1b' },
}

const PERFIL_CORES: Record<Perfil, { fundo: string; cor: string }> = {
  MORADOR: { fundo: '#e0e7ff', cor: '#3730a3' },
  ADMIN: { fundo: '#f3e8ff', cor: '#6b21a8' },
}

export default function Busca() {
  const { listarTodos } = useAuth()
  const { estado } = useApp()
  const { familias, casas } = estado

  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('TODOS')
  const [perfilFiltro, setPerfilFiltro] = useState<PerfilFiltro>('TODOS')
  const [idadeCategoria, setIdadeCategoria] = useState<IdadeCategoria>('TODOS')
  const [idadeMin, setIdadeMin] = useState('')
  const [idadeMax, setIdadeMax] = useState('')
  const { recarregar } = useApp()
  const { recarregarUsuarios } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [modalFiltro, setModalFiltro] = useState(false)

  const [tmpStatus, setTmpStatus] = useState<StatusFiltro>('TODOS')
  const [tmpPerfil, setTmpPerfil] = useState<PerfilFiltro>('TODOS')
  const [tmpIdadeCategoria, setTmpIdadeCategoria] = useState<IdadeCategoria>('TODOS')
  const [tmpIdadeMin, setTmpIdadeMin] = useState('')
  const [tmpIdadeMax, setTmpIdadeMax] = useState('')

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    Promise.all([recarregar(), recarregarUsuarios()]).finally(() => setRefreshing(false))
  }, [])

  const todosUsuarios = listarTodos()

  function encontrarFamilia(usuario: Usuario) {
    return familias.find(
      (f) =>
        f.responsavel.toLowerCase() === usuario.nome.toLowerCase() ||
        f.membros.some((m) => m.nome.toLowerCase() === usuario.nome.toLowerCase()),
    )
  }

  function encontrarCasa(familiaId: string | null) {
    if (!familiaId) return null
    return casas.find((c) => c.id === familiaId) ?? null
  }

  function idadeDoUsuario(usuario: Usuario, fam: ReturnType<typeof encontrarFamilia>): number | null {
    if (!fam) return null
    const membro = fam.membros.find(
      (m) => m.nome.toLowerCase() === usuario.nome.toLowerCase(),
    )
    if (membro) return idade(membro.nascimento)
    if (fam.responsavel.toLowerCase() === usuario.nome.toLowerCase()) {
      const resp = fam.membros.find((m) => m.parentesco === 'Responsável')
      if (resp) return idade(resp.nascimento)
    }
    return null
  }

  const lista = useMemo(() => {
    const catAtiva = IDADE_CATEGORIAS.find((c) => c.valor === idadeCategoria)
    const minCustom = idadeMin !== '' ? Number(idadeMin) : null
    const maxCustom = idadeMax !== '' ? Number(idadeMax) : null

    return todosUsuarios.filter((u) => {
      const textoBusca = `${u.nome} ${u.email} ${u.cpf} ${u.telefone} ${u.rua}`.toLowerCase()
      const matchBusca = !busca || textoBusca.includes(busca.toLowerCase())
      const matchStatus = statusFiltro === 'TODOS' || u.status === statusFiltro
      const matchPerfil = perfilFiltro === 'TODOS' || u.perfil === perfilFiltro

      const fam = encontrarFamilia(u)
      const anos = idadeDoUsuario(u, fam)

      let matchIdade = true
      if (idadeCategoria !== 'TODOS' && catAtiva) {
        matchIdade = anos !== null && anos >= catAtiva.min && anos <= catAtiva.max
      }
      if (minCustom !== null || maxCustom !== null) {
        if (anos === null) {
          matchIdade = false
        } else {
          if (minCustom !== null && anos < minCustom) matchIdade = false
          if (maxCustom !== null && anos > maxCustom) matchIdade = false
        }
      }

      return matchBusca && matchStatus && matchPerfil && matchIdade
    })
  }, [todosUsuarios, busca, statusFiltro, perfilFiltro, idadeCategoria, idadeMin, idadeMax, familias])

  const contadores = useMemo(() => {
    const total = todosUsuarios.length
    const pendentes = todosUsuarios.filter((u) => u.status === 'PENDENTE').length
    const aprovados = todosUsuarios.filter((u) => u.status === 'APROVADO').length
    const recusados = todosUsuarios.filter((u) => u.status === 'REJEITADO').length
    return { total, pendentes, aprovados, recusados }
  }, [todosUsuarios])

  const filtrosAtivos = useMemo(() => {
    let count = 0
    if (statusFiltro !== 'TODOS') count++
    if (perfilFiltro !== 'TODOS') count++
    if (idadeCategoria !== 'TODOS') count++
    if (idadeMin !== '') count++
    if (idadeMax !== '') count++
    return count
  }, [statusFiltro, perfilFiltro, idadeCategoria, idadeMin, idadeMax])

  function abrirFiltro() {
    setTmpStatus(statusFiltro)
    setTmpPerfil(perfilFiltro)
    setTmpIdadeCategoria(idadeCategoria)
    setTmpIdadeMin(idadeMin)
    setTmpIdadeMax(idadeMax)
    setModalFiltro(true)
  }

  function aplicarFiltro() {
    setStatusFiltro(tmpStatus)
    setPerfilFiltro(tmpPerfil)
    setIdadeCategoria(tmpIdadeCategoria)
    setIdadeMin(tmpIdadeMin)
    setIdadeMax(tmpIdadeMax)
    setModalFiltro(false)
  }

  function limparFiltro() {
    setTmpStatus('TODOS')
    setTmpPerfil('TODOS')
    setTmpIdadeCategoria('TODOS')
    setTmpIdadeMin('')
    setTmpIdadeMax('')
  }

  function contadorLabel(valor: string, opcoes: { label: string; valor: string }[]): string {
    return opcoes.find((o) => o.valor === valor)?.label ?? valor
  }

  return (
    <FundoGradiente>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" colors={['#059669']} />
        }
      >
        <SectionTitle
          titulo="Censo de Moradores"
          descricao={`${lista.length} resultado(s) de ${contadores.total} cadastrado(s)`}
        />

        <View style={s.contadores}>
          <View style={[s.contadorCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[s.contadorValor, { color: '#92400e' }]}>{contadores.pendentes}</Text>
            <Text style={s.contadorLabel}>Pendentes</Text>
          </View>
          <View style={[s.contadorCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={[s.contadorValor, { color: '#065f46' }]}>{contadores.aprovados}</Text>
            <Text style={s.contadorLabel}>Aprovados</Text>
          </View>
          <View style={[s.contadorCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={[s.contadorValor, { color: '#991b1b' }]}>{contadores.recusados}</Text>
            <Text style={s.contadorLabel}>Recusados</Text>
          </View>
        </View>

        <View style={s.searchRow}>
          <TextInput
            style={s.busca}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome, e-mail, CPF, telefone ou rua..."
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={s.hamburgerBtn} onPress={abrirFiltro}>
            <Text style={s.hamburgerIcon}>☰</Text>
            {filtrosAtivos > 0 && (
              <View style={s.hamburgerBadge}>
                <Text style={s.hamburgerBadgeText}>{filtrosAtivos}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {filtrosAtivos > 0 && (
          <View style={s.chipsRow}>
            {statusFiltro !== 'TODOS' && (
              <TouchableOpacity style={s.chip} onPress={() => setStatusFiltro('TODOS')}>
                <Text style={s.chipText}>{contadorLabel(statusFiltro, STATUS_OPCOES)}</Text>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            )}
            {perfilFiltro !== 'TODOS' && (
              <TouchableOpacity style={s.chip} onPress={() => setPerfilFiltro('TODOS')}>
                <Text style={s.chipText}>{contadorLabel(perfilFiltro, PERFIL_OPCOES)}</Text>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            )}
            {idadeCategoria !== 'TODOS' && (
              <TouchableOpacity style={s.chip} onPress={() => setIdadeCategoria('TODOS')}>
                <Text style={s.chipText}>{IDADE_CATEGORIAS.find((c) => c.valor === idadeCategoria)?.label}</Text>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            )}
            {idadeMin !== '' && (
              <TouchableOpacity style={s.chip} onPress={() => setIdadeMin('')}>
                <Text style={s.chipText}>Min: {idadeMin}</Text>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            )}
            {idadeMax !== '' && (
              <TouchableOpacity style={s.chip} onPress={() => setIdadeMax('')}>
                <Text style={s.chipText}>Max: {idadeMax}</Text>
                <Text style={s.chipX}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {lista.length === 0 ? (
          <Vazio mensagem="Nenhum morador encontrado com os filtros selecionados." />
        ) : (
          lista.map((u) => {
            const familia = encontrarFamilia(u)
            const casa = familia ? encontrarCasa(familia.casaId) : null
            const vuln = familia ? indiceVulnerabilidade(familia, casa) : null
            const faixa = vuln !== null ? faixaVulnerabilidade(vuln) : null
            const statusCor = STATUS_CORES[u.status]
            const perfilCor = PERFIL_CORES[u.perfil]
            const anos = idadeDoUsuario(u, familia)

            return (
              <Card key={u.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardNome}>{u.nome}</Text>
                  <View style={s.badges}>
                    <Badge texto={u.status} fundo={statusCor.fundo} cor={statusCor.cor} />
                    <Badge texto={u.perfil} fundo={perfilCor.fundo} cor={perfilCor.cor} />
                  </View>
                </View>

                <View style={s.infoGrid}>
                  <InfoLinha icon="📧" valor={u.email} />
                  <InfoLinha icon=" CPF" valor={formatarCpf(u.cpf)} />
                  {u.telefone ? <InfoLinha icon="📞" valor={u.telefone} /> : null}
                  {u.rua ? <InfoLinha icon="📍" valor={u.rua} /> : null}
                  {anos !== null && <InfoLinha icon="🎂" valor={`${anos} ano(s)`} />}
                  <InfoLinha icon="📅" valor={`Cadastrado em ${formatarData(u.criadoEm)}`} />
                </View>

                {familia && (
                  <View style={s.familiaSection}>
                    <View style={s.divider} />
                    <Text style={s.familiaTitle}>Família vinculada</Text>
                    <InfoLinha icon="👨‍👩‍👧‍👦" valor={familia.nomeFamilia} />
                    <InfoLinha icon="💰" valor={`Renda: ${moeda(familia.rendaMensal)}`} />
                    <InfoLinha icon="👥" valor={`${familia.membros.length} membro(s)`} />
                    {casa && <InfoLinha icon="🏠" valor={`${casa.apelido} — ${casa.endereco}`} />}
                    {faixa && (
                      <View style={s.vulnRow}>
                        <Badge texto={`Vulnerabilidade: ${faixa.rotulo}`} fundo={faixa.fundo} cor={faixa.texto} />
                        <Badge texto={`${vuln}/100`} fundo="#f1f5f9" cor="#334155" />
                      </View>
                    )}
                    {familia.beneficios.length > 0 && (
                      <View style={s.tagsRow}>
                        {familia.beneficios.map((b) => (
                          <Badge key={b} texto={b} />
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </Card>
            )
          })
        )}
      </ScrollView>

      <RNModal visible={modalFiltro} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setModalFiltro(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={s.modalLabel}>Status</Text>
              <View style={s.modalFiltroRow}>
                {STATUS_OPCOES.map((opt) => (
                  <TouchableOpacity
                    key={opt.valor}
                    style={[s.modalFiltroBtn, tmpStatus === opt.valor && s.modalFiltroBtnAtivo]}
                    onPress={() => setTmpStatus(opt.valor)}
                  >
                    <Text style={[s.modalFiltroBtnText, tmpStatus === opt.valor && s.modalFiltroBtnTextAtivo]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.modalLabel}>Perfil</Text>
              <View style={s.modalFiltroRow}>
                {PERFIL_OPCOES.map((opt) => (
                  <TouchableOpacity
                    key={opt.valor}
                    style={[s.modalFiltroBtn, tmpPerfil === opt.valor && s.modalFiltroBtnAtivo]}
                    onPress={() => setTmpPerfil(opt.valor)}
                  >
                    <Text style={[s.modalFiltroBtnText, tmpPerfil === opt.valor && s.modalFiltroBtnTextAtivo]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.modalLabel}>Idade</Text>
              <View style={s.modalFiltroRow}>
                {IDADE_CATEGORIAS.map((opt) => (
                  <TouchableOpacity
                    key={opt.valor}
                    style={[s.modalFiltroBtn, s.modalFiltroBtnIdade, tmpIdadeCategoria === opt.valor && s.modalFiltroBtnAtivo]}
                    onPress={() => {
                      setTmpIdadeCategoria(opt.valor)
                      if (opt.valor !== 'TODOS') {
                        setTmpIdadeMin('')
                        setTmpIdadeMax('')
                      }
                    }}
                  >
                    <Text style={[s.modalFiltroBtnText, tmpIdadeCategoria === opt.valor && s.modalFiltroBtnTextAtivo]}>
                      {opt.icone} {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.idadeCustomRow}>
                <View style={s.idadeInputWrap}>
                  <Text style={s.idadeInputLabel}>Idade mín.</Text>
                  <TextInput
                    style={s.idadeInput}
                    value={tmpIdadeMin}
                    onChangeText={(t) => {
                      setTmpIdadeMin(t.replace(/\D/g, ''))
                      setTmpIdadeCategoria('TODOS')
                    }}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
                <Text style={s.idadeSeparador}>até</Text>
                <View style={s.idadeInputWrap}>
                  <Text style={s.idadeInputLabel}>Idade máx.</Text>
                  <TextInput
                    style={s.idadeInput}
                    value={tmpIdadeMax}
                    onChangeText={(t) => {
                      setTmpIdadeMax(t.replace(/\D/g, ''))
                      setTmpIdadeCategoria('TODOS')
                    }}
                    placeholder="150"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity style={s.modalBtnLimpar} onPress={limparFiltro}>
                <Text style={s.modalBtnLimparText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtnAplicar} onPress={aplicarFiltro}>
                <Text style={s.modalBtnAplicarText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>
    </FundoGradiente>
  )
}

function formatarCpf(cpf: string): string {
  const nums = cpf.replace(/\D/g, '')
  if (nums.length !== 11) return cpf
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`
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
  contadores: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  contadorCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  contadorValor: { fontSize: 22, fontWeight: '700' },
  contadorLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
  hamburgerBtn: {
    width: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerIcon: { fontSize: 22, color: '#334155' },
  hamburgerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#059669',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  hamburgerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, color: '#065f46', fontWeight: '600' },
  chipX: { fontSize: 12, color: '#059669', fontWeight: '700' },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardNome: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  badges: { flexDirection: 'row', gap: 4 },
  infoGrid: { gap: 4, marginBottom: 4 },
  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#334155', flex: 1 },
  familiaSection: { marginTop: 4 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  familiaTitle: { fontSize: 13, fontWeight: '700', color: '#065f46', marginBottom: 6 },
  vulnRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  tagsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalClose: { fontSize: 20, color: '#94a3b8', padding: 4 },
  modalBody: { padding: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 4 },
  modalFiltroRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  modalFiltroBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalFiltroBtnAtivo: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  modalFiltroBtnText: { fontSize: 13, color: '#475569' },
  modalFiltroBtnTextAtivo: { color: '#065f46', fontWeight: '600' },
  modalFiltroBtnIdade: { minWidth: 44, alignItems: 'center' },
  idadeCustomRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 16 },
  idadeInputWrap: { flex: 1 },
  idadeInputLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  idadeInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
    textAlign: 'center',
  },
  idadeSeparador: { fontSize: 13, color: '#94a3b8', paddingBottom: 10 },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalBtnLimpar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  modalBtnLimparText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  modalBtnAplicar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  modalBtnAplicarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})
