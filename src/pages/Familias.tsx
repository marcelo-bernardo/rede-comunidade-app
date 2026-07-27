import { useMemo, useState } from 'react'
import {
  Badge,
  Botao,
  Campo,
  Card,
  Checkbox,
  Input,
  Modal,
  MultiSelect,
  SectionTitle,
  Select,
  Textarea,
  Vazio,
} from '../components/ui'
import {
  BENEFICIOS,
  ESCOLARIDADES,
  PARENTESCOS,
  type Beneficio,
  type Escolaridade,
  type Familia,
  type Membro,
  type Parentesco,
} from '../lib/types'
import {
  faixaVulnerabilidade,
  idade,
  indiceVulnerabilidade,
  moeda,
  uid,
} from '../lib/utils'
import { useApp } from '../store/AppStore'

type Form = Omit<Familia, 'id' | 'criadaEm'>

const membroVazio = (): Membro => ({
  id: uid('mem'),
  nome: '',
  nascimento: '',
  parentesco: 'Filho(a)',
  escolaridade: 'Fundamental incompleto',
  estuda: false,
  trabalha: false,
  pcd: false,
  doencaCronica: false,
  gestante: false,
})

const vazio: Form = {
  nomeFamilia: '',
  casaId: null,
  responsavel: '',
  telefone: '',
  nis: '',
  rendaMensal: 0,
  beneficios: [],
  membros: [],
  observacoes: '',
}

export default function Familias() {
  const { estado, addFamilia, updateFamilia, removeFamilia } = useApp()
  const [form, setForm] = useState<Form>(vazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<'vulnerabilidade' | 'nome'>('vulnerabilidade')

  const casaPorId = useMemo(
    () => new Map(estado.casas.map((c) => [c.id, c])),
    [estado.casas],
  )

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtradas = estado.familias.filter((f) => {
      if (!termo) return true
      return [f.nomeFamilia, f.responsavel, f.nis, ...f.membros.map((m) => m.nome)]
        .join(' ')
        .toLowerCase()
        .includes(termo)
    })
    return [...filtradas].sort((a, b) => {
      if (ordem === 'nome') return a.nomeFamilia.localeCompare(b.nomeFamilia)
      const ia = indiceVulnerabilidade(a, a.casaId ? casaPorId.get(a.casaId) : null)
      const ib = indiceVulnerabilidade(b, b.casaId ? casaPorId.get(b.casaId) : null)
      return ib - ia
    })
  }, [estado.familias, busca, ordem, casaPorId])

  function abrirNovo() {
    setForm({ ...vazio, membros: [{ ...membroVazio(), parentesco: 'Responsável' }] })
    setEditandoId(null)
    setAberto(true)
  }

  function abrirEdicao(f: Familia) {
    setForm(structuredClone(f))
    setEditandoId(f.id)
    setAberto(true)
  }

  function salvar() {
    if (!form.responsavel.trim()) return
    const dados = {
      ...form,
      nomeFamilia: form.nomeFamilia.trim() || `Família ${form.responsavel}`,
      membros: form.membros.filter((m) => m.nome.trim()),
    }
    if (editandoId) updateFamilia(editandoId, dados)
    else addFamilia(dados)
    setAberto(false)
  }

  function atualizarMembro(id: string, dados: Partial<Membro>) {
    setForm((f) => ({
      ...f,
      membros: f.membros.map((m) => (m.id === id ? { ...m, ...dados } : m)),
    }))
  }

  return (
    <div>
      <SectionTitle
        titulo="Registro de famílias"
        descricao="Composição familiar, renda, benefícios e vínculo com a moradia. O índice de vulnerabilidade prioriza quem precisa de visita primeiro."
        acao={<Botao onClick={abrirNovo}>+ Registrar família</Botao>}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por família, responsável, NIS ou morador..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as typeof ordem)}
          className="!w-auto"
        >
          <option value="vulnerabilidade">Ordenar por vulnerabilidade</option>
          <option value="nome">Ordenar por nome</option>
        </Select>
      </div>

      {lista.length === 0 ? (
        <Vazio
          texto="Nenhuma família registrada."
          acao={<Botao onClick={abrirNovo}>Registrar a primeira</Botao>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((f) => {
            const casa = f.casaId ? casaPorId.get(f.casaId) : null
            const indice = indiceVulnerabilidade(f, casa)
            const faixa = faixaVulnerabilidade(indice)
            const perCapita = f.rendaMensal / Math.max(f.membros.length, 1)
            return (
              <Card key={f.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">
                      {f.nomeFamilia}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Responsável: {f.responsavel}
                      {f.telefone && ` · ${f.telefone}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge className={faixa.classe}>{faixa.rotulo}</Badge>
                    <p className="mt-1 text-xs text-slate-400">índice {indice}</p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      indice >= 70
                        ? 'bg-red-500'
                        : indice >= 45
                          ? 'bg-orange-500'
                          : indice >= 25
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                    }`}
                    style={{ width: `${indice}%` }}
                  />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-y-2 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-slate-400">Pessoas</dt>
                    <dd className="font-medium text-slate-800">{f.membros.length}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Renda</dt>
                    <dd className="font-medium text-slate-800">{moeda(f.rendaMensal)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Per capita</dt>
                    <dd className="font-medium text-slate-800">{moeda(perCapita)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Casa</dt>
                    <dd className="truncate font-medium text-slate-800">
                      {casa ? casa.apelido || casa.endereco : 'sem vínculo'}
                    </dd>
                  </div>
                </dl>

                {f.membros.length > 0 && (
                  <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                    {f.membros.map((m) => {
                      const anos = idade(m.nascimento)
                      return (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-center gap-2 py-2 text-xs"
                        >
                          <span className="font-medium text-slate-800">{m.nome}</span>
                          <span className="text-slate-400">
                            {anos !== null ? `${anos} anos` : 'idade não informada'} ·{' '}
                            {m.parentesco}
                          </span>
                          {m.pcd && <Badge className="bg-sky-100 text-sky-800">PCD</Badge>}
                          {m.gestante && (
                            <Badge className="bg-pink-100 text-pink-800">gestante</Badge>
                          )}
                          {m.doencaCronica && (
                            <Badge className="bg-orange-100 text-orange-800">
                              doença crônica
                            </Badge>
                          )}
                          {anos !== null && anos >= 6 && anos <= 17 && !m.estuda && (
                            <Badge className="bg-red-100 text-red-800">fora da escola</Badge>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {f.beneficios.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.beneficios.map((b) => (
                      <Badge key={b} className="bg-emerald-100 text-emerald-800">
                        {b}
                      </Badge>
                    ))}
                  </div>
                )}

                {f.observacoes && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {f.observacoes}
                  </p>
                )}

                <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => abrirEdicao(f)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() =>
                      confirm(`Excluir o registro de ${f.nomeFamilia}?`) &&
                      removeFamilia(f.id)
                    }
                    className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        aberto={aberto}
        titulo={editandoId ? 'Editar família' : 'Registrar família'}
        onFechar={() => setAberto(false)}
        largura="max-w-3xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome da família" dica="Se vazio, usa o nome do responsável.">
            <Input
              value={form.nomeFamilia}
              onChange={(e) => setForm({ ...form, nomeFamilia: e.target.value })}
            />
          </Campo>
          <Campo label="Responsável familiar">
            <Input
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            />
          </Campo>
          <Campo label="Telefone de contato">
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </Campo>
          <Campo label="NIS (opcional)">
            <Input
              value={form.nis}
              onChange={(e) => setForm({ ...form, nis: e.target.value })}
            />
          </Campo>
          <Campo label="Renda familiar mensal (R$)">
            <Input
              type="number"
              min={0}
              value={form.rendaMensal}
              onChange={(e) => setForm({ ...form, rendaMensal: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="Casa vinculada">
            <Select
              value={form.casaId ?? ''}
              onChange={(e) => setForm({ ...form, casaId: e.target.value || null })}
            >
              <option value="">Sem vínculo</option>
              {estado.casas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apelido || c.endereco}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Benefícios recebidos" className="sm:col-span-2">
            <MultiSelect
              opcoes={BENEFICIOS}
              valor={form.beneficios}
              onChange={(v) => setForm({ ...form, beneficios: v as Beneficio[] })}
            />
          </Campo>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Membros ({form.membros.length})
            </h3>
            <Botao
              variante="secundario"
              onClick={() => setForm({ ...form, membros: [...form.membros, membroVazio()] })}
            >
              + Adicionar membro
            </Botao>
          </div>

          <div className="space-y-3">
            {form.membros.map((m, i) => (
              <div key={m.id} className="rounded-lg border border-slate-200 p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Membro {i + 1}
                  </span>
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        membros: form.membros.filter((x) => x.id !== m.id),
                      })
                    }
                    className="rounded-md px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Campo label="Nome" className="lg:col-span-2">
                    <Input
                      value={m.nome}
                      onChange={(e) => atualizarMembro(m.id, { nome: e.target.value })}
                    />
                  </Campo>
                  <Campo label="Nascimento">
                    <Input
                      type="date"
                      value={m.nascimento}
                      onChange={(e) =>
                        atualizarMembro(m.id, { nascimento: e.target.value })
                      }
                    />
                  </Campo>
                  <Campo label="Parentesco">
                    <Select
                      value={m.parentesco}
                      onChange={(e) =>
                        atualizarMembro(m.id, {
                          parentesco: e.target.value as Parentesco,
                        })
                      }
                    >
                      {PARENTESCOS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </Select>
                  </Campo>
                  <Campo label="Escolaridade" className="sm:col-span-2">
                    <Select
                      value={m.escolaridade}
                      onChange={(e) =>
                        atualizarMembro(m.id, {
                          escolaridade: e.target.value as Escolaridade,
                        })
                      }
                    >
                      {ESCOLARIDADES.map((es) => (
                        <option key={es}>{es}</option>
                      ))}
                    </Select>
                  </Campo>
                </div>
                <div className="mt-3 flex flex-wrap gap-4">
                  <Checkbox
                    label="Estuda"
                    checked={m.estuda}
                    onChange={(v) => atualizarMembro(m.id, { estuda: v })}
                  />
                  <Checkbox
                    label="Trabalha"
                    checked={m.trabalha}
                    onChange={(v) => atualizarMembro(m.id, { trabalha: v })}
                  />
                  <Checkbox
                    label="PCD"
                    checked={m.pcd}
                    onChange={(v) => atualizarMembro(m.id, { pcd: v })}
                  />
                  <Checkbox
                    label="Doença crônica"
                    checked={m.doencaCronica}
                    onChange={(v) => atualizarMembro(m.id, { doencaCronica: v })}
                  />
                  <Checkbox
                    label="Gestante"
                    checked={m.gestante}
                    onChange={(v) => atualizarMembro(m.id, { gestante: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Campo label="Observações" className="mt-4">
          <Textarea
            rows={2}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
        </Campo>

        <div className="mt-5 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setAberto(false)}>
            Cancelar
          </Botao>
          <Botao onClick={salvar} disabled={!form.responsavel.trim()}>
            Salvar
          </Botao>
        </div>
      </Modal>
    </div>
  )
}
