import { useMemo, useState } from 'react'
import {
  Badge,
  Botao,
  Campo,
  Card,
  Checkbox,
  Input,
  Modal,
  SectionTitle,
  Select,
  Textarea,
  Vazio,
} from '../components/ui'
import {
  CATEGORIAS_COMERCIO,
  type CategoriaComercio,
  type Comercio,
} from '../lib/types'
import { parseTags } from '../lib/utils'
import { useApp } from '../store/AppStore'

type Form = Omit<Comercio, 'id' | 'criadoEm' | 'tags' | 'ponto'> & {
  tagsTexto: string
  lat: string
  lng: string
}

const vazio: Form = {
  nome: '',
  responsavel: '',
  categoria: 'Alimentação',
  descricao: '',
  telefone: '',
  whatsapp: true,
  endereco: '',
  horario: '',
  formalizado: false,
  cnpjMei: '',
  aceitaFiado: false,
  entrega: false,
  tagsTexto: '',
  lat: '',
  lng: '',
}

export default function Comercios() {
  const { estado, addComercio, updateComercio, removeComercio } = useApp()
  const [form, setForm] = useState<Form>(vazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('todas')

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return estado.comercios.filter((c) => {
      if (categoria !== 'todas' && c.categoria !== categoria) return false
      if (!termo) return true
      return [c.nome, c.responsavel, c.descricao, c.endereco, ...c.tags]
        .join(' ')
        .toLowerCase()
        .includes(termo)
    })
  }, [estado.comercios, busca, categoria])

  function abrirNovo() {
    setForm(vazio)
    setEditandoId(null)
    setAberto(true)
  }

  function abrirEdicao(c: Comercio) {
    setForm({
      ...c,
      tagsTexto: c.tags.join(', '),
      lat: c.ponto ? String(c.ponto.lat) : '',
      lng: c.ponto ? String(c.ponto.lng) : '',
    })
    setEditandoId(c.id)
    setAberto(true)
  }

  function salvar() {
    if (!form.nome.trim()) return
    const { tagsTexto, lat, lng, ...resto } = form
    const temCoord = lat.trim() !== '' && lng.trim() !== ''
    const dados = {
      ...resto,
      tags: parseTags(tagsTexto),
      ponto: temCoord ? { lat: Number(lat), lng: Number(lng) } : undefined,
    }
    if (editandoId) updateComercio(editandoId, dados)
    else addComercio(dados)
    setAberto(false)
  }

  return (
    <div>
      <SectionTitle
        titulo="Comércios locais"
        descricao="Catálogo do comércio da comunidade — formal e informal — para que o dinheiro circule dentro do território."
        acao={<Botao onClick={abrirNovo}>+ Cadastrar comércio</Botao>}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome, produto ou responsável..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="!w-auto"
        >
          <option value="todas">Todas as categorias</option>
          {CATEGORIAS_COMERCIO.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>

      {lista.length === 0 ? (
        <Vazio
          texto="Nenhum comércio encontrado."
          acao={<Botao onClick={abrirNovo}>Cadastrar o primeiro</Botao>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{c.nome}</h3>
                  <p className="text-xs text-slate-500">{c.categoria}</p>
                </div>
                <Badge
                  className={
                    c.formalizado
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }
                >
                  {c.formalizado ? 'MEI/CNPJ' : 'informal'}
                </Badge>
              </div>

              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-600">
                {c.descricao}
              </p>

              <dl className="mt-3 space-y-1 text-xs text-slate-500">
                {c.responsavel && (
                  <div>
                    <dt className="inline font-medium text-slate-600">Responsável: </dt>
                    <dd className="inline">{c.responsavel}</dd>
                  </div>
                )}
                {c.endereco && (
                  <div>
                    <dt className="inline font-medium text-slate-600">Onde: </dt>
                    <dd className="inline">{c.endereco}</dd>
                  </div>
                )}
                {c.horario && (
                  <div>
                    <dt className="inline font-medium text-slate-600">Horário: </dt>
                    <dd className="inline">{c.horario}</dd>
                  </div>
                )}
                {c.telefone && (
                  <div>
                    <dt className="inline font-medium text-slate-600">Contato: </dt>
                    <dd className="inline">
                      {c.telefone} {c.whatsapp && '(WhatsApp)'}
                    </dd>
                  </div>
                )}
              </dl>

              {(c.tags.length > 0 || c.aceitaFiado || c.entrega) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.aceitaFiado && (
                    <Badge className="bg-sky-100 text-sky-800">fiado</Badge>
                  )}
                  {c.entrega && (
                    <Badge className="bg-violet-100 text-violet-800">entrega</Badge>
                  )}
                  {c.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                <button
                  onClick={() => abrirEdicao(c)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Editar
                </button>
                <button
                  onClick={() => removeComercio(c.id)}
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
        titulo={editandoId ? 'Editar comércio' : 'Cadastrar comércio'}
        onFechar={() => setAberto(false)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome do comércio">
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </Campo>
          <Campo label="Responsável">
            <Input
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            />
          </Campo>
          <Campo label="Categoria">
            <Select
              value={form.categoria}
              onChange={(e) =>
                setForm({ ...form, categoria: e.target.value as CategoriaComercio })
              }
            >
              {CATEGORIAS_COMERCIO.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Campo>
          <Campo label="Telefone">
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </Campo>
          <Campo label="Descrição" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </Campo>
          <Campo label="Endereço / referência">
            <Input
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            />
          </Campo>
          <Campo label="Horário de funcionamento">
            <Input
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
              placeholder="Seg a sáb, 8h às 18h"
            />
          </Campo>
          <Campo label="CNPJ / MEI (se tiver)">
            <Input
              value={form.cnpjMei}
              onChange={(e) => setForm({ ...form, cnpjMei: e.target.value })}
            />
          </Campo>
          <Campo label="Produtos/serviços (separados por vírgula)">
            <Input
              value={form.tagsTexto}
              onChange={(e) => setForm({ ...form, tagsTexto: e.target.value })}
              placeholder="gás, água, hortifruti"
            />
          </Campo>
          <Campo label="Latitude (opcional)" dica="Aparece como ponto no mapa de rotas.">
            <Input
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              placeholder="-23.5011"
            />
          </Campo>
          <Campo label="Longitude (opcional)">
            <Input
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              placeholder="-46.6299"
            />
          </Campo>
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <Checkbox
              label="Formalizado"
              checked={form.formalizado}
              onChange={(v) => setForm({ ...form, formalizado: v })}
            />
            <Checkbox
              label="Tem WhatsApp"
              checked={form.whatsapp}
              onChange={(v) => setForm({ ...form, whatsapp: v })}
            />
            <Checkbox
              label="Aceita fiado"
              checked={form.aceitaFiado}
              onChange={(v) => setForm({ ...form, aceitaFiado: v })}
            />
            <Checkbox
              label="Faz entrega"
              checked={form.entrega}
              onChange={(v) => setForm({ ...form, entrega: v })}
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
