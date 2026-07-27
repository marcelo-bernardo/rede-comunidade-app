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
  DISPONIBILIDADES,
  type Disponibilidade,
  type Freelancer,
} from '../lib/types'
import { moeda, parseTags } from '../lib/utils'
import { useApp } from '../store/AppStore'

type Form = Omit<Freelancer, 'id' | 'criadoEm' | 'habilidades'> & {
  habilidadesTexto: string
}

const vazio: Form = {
  nome: '',
  profissao: '',
  descricao: '',
  telefone: '',
  whatsapp: true,
  habilidadesTexto: '',
  disponibilidade: [],
  precoMin: 0,
  precoMax: 0,
  unidadePreco: 'serviço',
  atendeDomicilio: true,
  temTransporte: false,
  bairro: '',
}

export default function Freelancers() {
  const { estado, addFreelancer, updateFreelancer, removeFreelancer } = useApp()
  const [form, setForm] = useState<Form>(vazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [disp, setDisp] = useState('todas')

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return estado.freelancers.filter((f) => {
      if (disp !== 'todas' && !f.disponibilidade.includes(disp as Disponibilidade))
        return false
      if (!termo) return true
      return [f.nome, f.profissao, f.descricao, f.bairro, ...f.habilidades]
        .join(' ')
        .toLowerCase()
        .includes(termo)
    })
  }, [estado.freelancers, busca, disp])

  function abrirNovo() {
    setForm(vazio)
    setEditandoId(null)
    setAberto(true)
  }

  function abrirEdicao(f: Freelancer) {
    setForm({ ...f, habilidadesTexto: f.habilidades.join(', ') })
    setEditandoId(f.id)
    setAberto(true)
  }

  function salvar() {
    if (!form.nome.trim()) return
    const { habilidadesTexto, ...resto } = form
    const dados = { ...resto, habilidades: parseTags(habilidadesTexto) }
    if (editandoId) updateFreelancer(editandoId, dados)
    else addFreelancer(dados)
    setAberto(false)
  }

  function faixaPreco(f: Freelancer) {
    if (!f.precoMin && !f.precoMax) return 'a combinar'
    if (f.precoMin === f.precoMax) return `${moeda(f.precoMin)} / ${f.unidadePreco}`
    return `${moeda(f.precoMin)} – ${moeda(f.precoMax)} / ${f.unidadePreco}`
  }

  return (
    <div>
      <SectionTitle
        titulo="Freelancers e prestadores"
        descricao="Quem faz o quê na comunidade: pedreiro, eletricista, diarista, costureira, entregador — com contato e faixa de preço."
        acao={<Botao onClick={abrirNovo}>+ Cadastrar prestador</Botao>}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por profissão, habilidade ou nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <Select value={disp} onChange={(e) => setDisp(e.target.value)} className="!w-auto">
          <option value="todas">Qualquer disponibilidade</option>
          {DISPONIBILIDADES.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
      </div>

      {lista.length === 0 ? (
        <Vazio
          texto="Nenhum prestador encontrado."
          acao={<Botao onClick={abrirNovo}>Cadastrar o primeiro</Botao>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((f) => (
            <Card key={f.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-semibold text-emerald-700">
                  {f.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{f.nome}</h3>
                  <p className="text-xs text-slate-500">
                    {f.profissao}
                    {f.bairro && ` · ${f.bairro}`}
                  </p>
                </div>
              </div>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                {f.descricao}
              </p>

              <p className="mt-3 text-sm font-medium text-slate-800">{faixaPreco(f)}</p>

              {f.habilidades.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {f.habilidades.map((h) => (
                    <Badge key={h}>{h}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {f.disponibilidade.map((d) => (
                  <Badge key={d} className="bg-sky-100 text-sky-800">
                    {d}
                  </Badge>
                ))}
                {f.atendeDomicilio && (
                  <Badge className="bg-violet-100 text-violet-800">atende em casa</Badge>
                )}
                {f.temTransporte && (
                  <Badge className="bg-slate-100 text-slate-700">tem transporte</Badge>
                )}
              </div>

              {f.telefone && (
                <p className="mt-3 text-xs text-slate-500">
                  {f.telefone} {f.whatsapp && '(WhatsApp)'}
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
                  onClick={() => removeFreelancer(f.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        aberto={aberto}
        titulo={editandoId ? 'Editar prestador' : 'Cadastrar prestador'}
        onFechar={() => setAberto(false)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome">
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </Campo>
          <Campo label="Profissão">
            <Input
              value={form.profissao}
              onChange={(e) => setForm({ ...form, profissao: e.target.value })}
              placeholder="Eletricista, diarista, pedreiro..."
            />
          </Campo>
          <Campo label="Descrição" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </Campo>
          <Campo label="Telefone">
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </Campo>
          <Campo label="Bairro / região que atende">
            <Input
              value={form.bairro}
              onChange={(e) => setForm({ ...form, bairro: e.target.value })}
            />
          </Campo>
          <Campo label="Habilidades (separadas por vírgula)" className="sm:col-span-2">
            <Input
              value={form.habilidadesTexto}
              onChange={(e) => setForm({ ...form, habilidadesTexto: e.target.value })}
              placeholder="instalação elétrica, quadro de luz, chuveiro"
            />
          </Campo>
          <Campo label="Preço mínimo (R$)">
            <Input
              type="number"
              min={0}
              value={form.precoMin}
              onChange={(e) => setForm({ ...form, precoMin: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="Preço máximo (R$)">
            <Input
              type="number"
              min={0}
              value={form.precoMax}
              onChange={(e) => setForm({ ...form, precoMax: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="Cobrado por">
            <Select
              value={form.unidadePreco}
              onChange={(e) =>
                setForm({
                  ...form,
                  unidadePreco: e.target.value as Form['unidadePreco'],
                })
              }
            >
              <option value="hora">hora</option>
              <option value="diária">diária</option>
              <option value="serviço">serviço</option>
            </Select>
          </Campo>
          <Campo label="Disponibilidade" className="sm:col-span-2">
            <MultiSelect
              opcoes={DISPONIBILIDADES}
              valor={form.disponibilidade}
              onChange={(v) => setForm({ ...form, disponibilidade: v })}
            />
          </Campo>
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <Checkbox
              label="Tem WhatsApp"
              checked={form.whatsapp}
              onChange={(v) => setForm({ ...form, whatsapp: v })}
            />
            <Checkbox
              label="Atende em domicílio"
              checked={form.atendeDomicilio}
              onChange={(v) => setForm({ ...form, atendeDomicilio: v })}
            />
            <Checkbox
              label="Tem transporte próprio"
              checked={form.temTransporte}
              onChange={(v) => setForm({ ...form, temTransporte: v })}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setAberto(false)}>
            Cancelar
          </Botao>
          <Botao onClick={salvar} disabled={!form.nome.trim()}>
            Salvar
          </Botao>
        </div>
      </Modal>
    </div>
  )
}
