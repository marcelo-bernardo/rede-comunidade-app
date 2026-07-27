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
  RISCOS,
  SITUACOES_MORADIA,
  TIPOS_CONSTRUCAO,
  type Casa,
  type Risco,
  type SituacaoMoradia,
  type TipoConstrucao,
} from '../lib/types'
import { useApp } from '../store/AppStore'

type Form = Omit<Casa, 'id' | 'criadaEm' | 'ponto'> & { lat: string; lng: string }

const vazio: Form = {
  apelido: '',
  endereco: '',
  quadra: '',
  lote: '',
  tipoConstrucao: 'Alvenaria',
  situacao: 'Própria',
  comodos: 1,
  aguaEncanada: true,
  esgoto: false,
  energiaEletrica: true,
  coletaLixo: false,
  riscos: [],
  observacoes: '',
  lat: '',
  lng: '',
}

/** Itens de infraestrutura mostrados como selo em cada cartão. */
const INFRA: Array<[keyof Casa, string]> = [
  ['aguaEncanada', 'água'],
  ['esgoto', 'esgoto'],
  ['energiaEletrica', 'energia'],
  ['coletaLixo', 'coleta'],
]

export default function Casas() {
  const { estado, addCasa, updateCasa, removeCasa } = useApp()
  const [form, setForm] = useState<Form>(vazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [soRisco, setSoRisco] = useState(false)

  const familiasPorCasa = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const f of estado.familias) {
      if (f.casaId) mapa.set(f.casaId, (mapa.get(f.casaId) ?? 0) + 1)
    }
    return mapa
  }, [estado.familias])

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return estado.casas.filter((c) => {
      if (soRisco && c.riscos.length === 0) return false
      if (!termo) return true
      return [c.apelido, c.endereco, c.quadra, c.lote, c.observacoes]
        .join(' ')
        .toLowerCase()
        .includes(termo)
    })
  }, [estado.casas, busca, soRisco])

  function abrirNovo() {
    setForm(vazio)
    setEditandoId(null)
    setAberto(true)
  }

  function abrirEdicao(c: Casa) {
    setForm({
      ...c,
      lat: c.ponto ? String(c.ponto.lat) : '',
      lng: c.ponto ? String(c.ponto.lng) : '',
    })
    setEditandoId(c.id)
    setAberto(true)
  }

  function salvar() {
    if (!form.apelido.trim() && !form.endereco.trim()) return
    const { lat, lng, ...resto } = form
    const temCoord = lat.trim() !== '' && lng.trim() !== ''
    const dados = {
      ...resto,
      ponto: temCoord ? { lat: Number(lat), lng: Number(lng) } : undefined,
    }
    if (editandoId) updateCasa(editandoId, dados)
    else addCasa(dados)
    setAberto(false)
  }

  function excluir(c: Casa) {
    const vinculadas = familiasPorCasa.get(c.id) ?? 0
    const aviso =
      vinculadas > 0
        ? `Excluir "${c.apelido || c.endereco}"? ${vinculadas} família(s) ficarão sem casa vinculada.`
        : `Excluir "${c.apelido || c.endereco}"?`
    if (confirm(aviso)) removeCasa(c.id)
  }

  return (
    <div>
      <SectionTitle
        titulo="Casas e domicílios"
        descricao="Cadastro físico das moradias: construção, infraestrutura e riscos. É a base para o registro das famílias."
        acao={<Botao onClick={abrirNovo}>+ Cadastrar casa</Botao>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Input
          placeholder="Buscar por endereço, quadra ou apelido..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <Checkbox label="Só casas com risco" checked={soRisco} onChange={setSoRisco} />
      </div>

      {lista.length === 0 ? (
        <Vazio
          texto="Nenhuma casa cadastrada."
          acao={<Botao onClick={abrirNovo}>Cadastrar a primeira</Botao>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">
                    {c.apelido || c.endereco}
                  </h3>
                  <p className="text-xs text-slate-500">{c.endereco}</p>
                </div>
                <Badge className="bg-slate-100 text-slate-700">{c.situacao}</Badge>
              </div>

              <p className="mt-2.5 text-xs text-slate-500">
                {c.tipoConstrucao} · {c.comodos} cômodo(s)
                {(c.quadra || c.lote) && ` · Q${c.quadra || '—'} L${c.lote || '—'}`}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {INFRA.map(([campo, rotulo]) => (
                  <Badge
                    key={rotulo}
                    className={
                      c[campo]
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {c[campo] ? '' : 'sem '}
                    {rotulo}
                  </Badge>
                ))}
              </div>

              {c.riscos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.riscos.map((r) => (
                    <Badge key={r} className="bg-orange-100 text-orange-800">
                      risco: {r.toLowerCase()}
                    </Badge>
                  ))}
                </div>
              )}

              {c.observacoes && (
                <p className="mt-3 flex-1 text-xs leading-relaxed text-slate-600">
                  {c.observacoes}
                </p>
              )}

              <p className="mt-3 text-xs text-slate-400">
                {familiasPorCasa.get(c.id) ?? 0} família(s) vinculada(s)
                {c.ponto && ' · georreferenciada'}
              </p>

              <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-3">
                <button
                  onClick={() => abrirEdicao(c)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(c)}
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
        titulo={editandoId ? 'Editar casa' : 'Cadastrar casa'}
        onFechar={() => setAberto(false)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Apelido / como é conhecida">
            <Input
              value={form.apelido}
              onChange={(e) => setForm({ ...form, apelido: e.target.value })}
              placeholder="Casa da Dona Marlene"
            />
          </Campo>
          <Campo label="Endereço / referência">
            <Input
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            />
          </Campo>
          <Campo label="Quadra">
            <Input
              value={form.quadra}
              onChange={(e) => setForm({ ...form, quadra: e.target.value })}
            />
          </Campo>
          <Campo label="Lote">
            <Input
              value={form.lote}
              onChange={(e) => setForm({ ...form, lote: e.target.value })}
            />
          </Campo>
          <Campo label="Tipo de construção">
            <Select
              value={form.tipoConstrucao}
              onChange={(e) =>
                setForm({ ...form, tipoConstrucao: e.target.value as TipoConstrucao })
              }
            >
              {TIPOS_CONSTRUCAO.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Campo>
          <Campo label="Situação de moradia">
            <Select
              value={form.situacao}
              onChange={(e) =>
                setForm({ ...form, situacao: e.target.value as SituacaoMoradia })
              }
            >
              {SITUACOES_MORADIA.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Campo>
          <Campo label="Número de cômodos">
            <Input
              type="number"
              min={1}
              value={form.comodos}
              onChange={(e) => setForm({ ...form, comodos: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="Riscos identificados" className="sm:col-span-2">
            <MultiSelect
              opcoes={RISCOS}
              valor={form.riscos}
              onChange={(v) => setForm({ ...form, riscos: v as Risco[] })}
            />
          </Campo>
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <Checkbox
              label="Água encanada"
              checked={form.aguaEncanada}
              onChange={(v) => setForm({ ...form, aguaEncanada: v })}
            />
            <Checkbox
              label="Esgoto ligado à rede"
              checked={form.esgoto}
              onChange={(v) => setForm({ ...form, esgoto: v })}
            />
            <Checkbox
              label="Energia elétrica"
              checked={form.energiaEletrica}
              onChange={(v) => setForm({ ...form, energiaEletrica: v })}
            />
            <Checkbox
              label="Coleta de lixo passa"
              checked={form.coletaLixo}
              onChange={(v) => setForm({ ...form, coletaLixo: v })}
            />
          </div>
          <Campo label="Latitude (opcional)">
            <Input
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
            />
          </Campo>
          <Campo label="Longitude (opcional)">
            <Input
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
            />
          </Campo>
          <Campo label="Observações" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </Campo>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setAberto(false)}>
            Cancelar
          </Botao>
          <Botao
            onClick={salvar}
            disabled={!form.apelido.trim() && !form.endereco.trim()}
          >
            Salvar
          </Botao>
        </div>
      </Modal>
    </div>
  )
}
