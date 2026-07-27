import { useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from 'react-leaflet'
import {
  Badge,
  Botao,
  Campo,
  Card,
  Checkbox,
  Input,
  Modal,
  Select,
  SectionTitle,
  Textarea,
} from '../components/ui'
import { CENTRO_PADRAO } from '../lib/seed'
import {
  CONDICOES,
  GRAVIDADES,
  TIPOS_ALERTA,
  TIPOS_ROTA,
  type Condicao,
  type Gravidade,
  type LatLng,
  type TipoAlerta,
  type TipoRota,
} from '../lib/types'
import {
  comprimentoRota,
  corDaCondicao,
  formatarData,
  formatarDistancia,
} from '../lib/utils'
import { useApp } from '../store/AppStore'

type Modo = 'navegar' | 'rota' | 'alerta'

const COR_GRAVIDADE: Record<Gravidade, string> = {
  Baixa: '#0ea5e9',
  Média: '#f59e0b',
  Alta: '#dc2626',
}

/** Captura cliques no mapa e repassa a coordenada conforme o modo ativo. */
function CapturaClique({ onClique }: { onClique: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClique({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

const rotaVazia = {
  nome: '',
  tipo: 'Caminho a pé' as TipoRota,
  condicao: 'Regular' as Condicao,
  iluminacao: false,
  acessivel: false,
  descricao: '',
}

const alertaVazio = {
  tipo: 'Buraco na via' as TipoAlerta,
  gravidade: 'Média' as Gravidade,
  descricao: '',
}

export default function Mapa() {
  const {
    estado,
    addRota,
    removeRota,
    updateRota,
    confirmarRota,
    addAlerta,
    removeAlerta,
    updateAlerta,
    confirmarAlerta,
  } = useApp()

  const [modo, setModo] = useState<Modo>('navegar')
  const [rascunho, setRascunho] = useState<LatLng[]>([])
  const [pontoAlerta, setPontoAlerta] = useState<LatLng | null>(null)

  const [formRota, setFormRota] = useState(rotaVazia)
  const [formAlerta, setFormAlerta] = useState(alertaVazio)
  const [modalRota, setModalRota] = useState(false)
  const [modalAlerta, setModalAlerta] = useState(false)

  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [mostrarResolvidos, setMostrarResolvidos] = useState(false)

  const centro = useMemo(() => {
    const primeira = estado.rotas.find((r) => r.pontos.length > 0)
    if (primeira) return primeira.pontos[0]
    const casa = estado.casas.find((c) => c.ponto)
    return casa?.ponto ?? CENTRO_PADRAO
  }, [estado.rotas, estado.casas])

  const rotasVisiveis = useMemo(
    () =>
      filtroTipo === 'todos'
        ? estado.rotas
        : estado.rotas.filter((r) => r.tipo === filtroTipo),
    [estado.rotas, filtroTipo],
  )

  const alertasVisiveis = useMemo(
    () => estado.alertas.filter((a) => mostrarResolvidos || !a.resolvido),
    [estado.alertas, mostrarResolvidos],
  )

  function aoClicarNoMapa(p: LatLng) {
    if (modo === 'rota') setRascunho((pts) => [...pts, p])
    if (modo === 'alerta') {
      setPontoAlerta(p)
      setModalAlerta(true)
    }
  }

  function salvarRota() {
    if (!formRota.nome.trim() || rascunho.length < 2) return
    addRota({
      ...formRota,
      pontos: rascunho,
      autor: estado.usuario,
      status: 'pendente',
      confirmacoes: [],
    })
    setRascunho([])
    setFormRota(rotaVazia)
    setModalRota(false)
    setModo('navegar')
  }

  function salvarAlerta() {
    if (!pontoAlerta || !formAlerta.descricao.trim()) return
    addAlerta({
      ...formAlerta,
      ponto: pontoAlerta,
      autor: estado.usuario,
      resolvido: false,
      confirmacoes: [],
    })
    setPontoAlerta(null)
    setFormAlerta(alertaVazio)
    setModalAlerta(false)
    setModo('navegar')
  }

  const instrucao =
    modo === 'rota'
      ? `Clique no mapa para marcar o traçado (${rascunho.length} ${
          rascunho.length === 1 ? 'ponto' : 'pontos'
        }). São necessários ao menos 2.`
      : modo === 'alerta'
        ? 'Clique no ponto onde está o problema.'
        : 'Arraste para navegar. Clique em uma rota ou alerta para ver os detalhes.'

  return (
    <div>
      <SectionTitle
        titulo="Mapa de rotas da comunidade"
        descricao="Os próprios moradores desenham os caminhos que usam e sinalizam os problemas do território."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-slate-300 bg-white p-1">
          {(
            [
              ['navegar', 'Navegar'],
              ['rota', 'Desenhar rota'],
              ['alerta', 'Marcar alerta'],
            ] as [Modo, string][]
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              onClick={() => {
                setModo(valor)
                if (valor !== 'rota') setRascunho([])
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                modo === valor
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {modo === 'rota' && (
          <>
            <Botao
              variante="secundario"
              onClick={() => setRascunho((p) => p.slice(0, -1))}
              disabled={rascunho.length === 0}
            >
              Desfazer ponto
            </Botao>
            <Botao onClick={() => setModalRota(true)} disabled={rascunho.length < 2}>
              Descrever e salvar
            </Botao>
          </>
        )}

        <Select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="ml-auto !w-auto"
        >
          <option value="todos">Todos os tipos de rota</option>
          {TIPOS_ROTA.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Checkbox
          label="Ver resolvidos"
          checked={mostrarResolvidos}
          onChange={setMostrarResolvidos}
        />
      </div>

      <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
        {instrucao}
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="h-[560px] overflow-hidden">
          <MapContainer
            center={[centro.lat, centro.lng]}
            zoom={16}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CapturaClique onClique={aoClicarNoMapa} />

            {rotasVisiveis.map((r) => (
              <Polyline
                key={r.id}
                positions={r.pontos.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color: corDaCondicao(r.condicao),
                  weight: 5,
                  opacity: r.status === 'validada' ? 0.95 : 0.55,
                  dashArray: r.status === 'validada' ? undefined : '8 8',
                }}
              >
                <Popup>
                  <strong>{r.nome}</strong>
                  <br />
                  {r.tipo} · condição {r.condicao.toLowerCase()}
                  <br />
                  {formatarDistancia(comprimentoRota(r))} · por {r.autor}
                  <br />
                  {r.descricao}
                </Popup>
              </Polyline>
            ))}

            {rascunho.length > 1 && (
              <Polyline
                positions={rascunho.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{ color: '#2563eb', weight: 4, dashArray: '4 6' }}
              />
            )}
            {rascunho.map((p, i) => (
              <CircleMarker
                key={i}
                center={[p.lat, p.lng]}
                radius={5}
                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1 }}
              />
            ))}

            {alertasVisiveis.map((a) => (
              <CircleMarker
                key={a.id}
                center={[a.ponto.lat, a.ponto.lng]}
                radius={9}
                pathOptions={{
                  color: a.resolvido ? '#94a3b8' : COR_GRAVIDADE[a.gravidade],
                  fillColor: a.resolvido ? '#cbd5e1' : COR_GRAVIDADE[a.gravidade],
                  fillOpacity: 0.75,
                }}
              >
                <Popup>
                  <strong>{a.tipo}</strong>
                  <br />
                  Gravidade {a.gravidade.toLowerCase()}
                  <br />
                  {a.descricao}
                  <br />
                  por {a.autor} em {formatarData(a.criadoEm)}
                </Popup>
              </CircleMarker>
            ))}

            {estado.comercios
              .filter((c) => c.ponto)
              .map((c) => (
                <CircleMarker
                  key={c.id}
                  center={[c.ponto!.lat, c.ponto!.lng]}
                  radius={6}
                  pathOptions={{ color: '#7c3aed', fillColor: '#a78bfa', fillOpacity: 0.9 }}
                >
                  <Popup>
                    <strong>{c.nome}</strong>
                    <br />
                    {c.categoria} · {c.horario}
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        </Card>

        <div className="flex max-h-[560px] flex-col gap-3 overflow-y-auto pr-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Rotas ({rotasVisiveis.length})
          </h2>
          {rotasVisiveis.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma rota com esse filtro.</p>
          )}
          {rotasVisiveis.map((r) => {
            const confirmou = r.confirmacoes.includes(estado.usuario)
            return (
              <Card key={r.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.nome}</p>
                    <p className="text-xs text-slate-500">
                      {r.tipo} · {formatarDistancia(comprimentoRota(r))}
                    </p>
                  </div>
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ background: corDaCondicao(r.condicao) }}
                    title={`Condição: ${r.condicao}`}
                  />
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-600">{r.descricao}</p>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge
                    className={
                      r.status === 'validada'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }
                  >
                    {r.status === 'validada' ? 'validada' : 'aguardando validação'}
                  </Badge>
                  {!r.iluminacao && (
                    <Badge className="bg-slate-100 text-slate-600">sem iluminação</Badge>
                  )}
                  {r.acessivel && (
                    <Badge className="bg-sky-100 text-sky-800">acessível</Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-xs text-slate-400">
                    {r.confirmacoes.length} confirmação(ões)
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => confirmarRota(r.id)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        confirmou
                          ? 'bg-emerald-600 text-white'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {confirmou ? 'Confirmada' : 'Confirmar'}
                    </button>
                    {r.status !== 'validada' && (
                      <button
                        onClick={() => updateRota(r.id, { status: 'validada' })}
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Validar
                      </button>
                    )}
                    <button
                      onClick={() => removeRota(r.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}

          <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Alertas ({alertasVisiveis.length})
          </h2>
          {alertasVisiveis.map((a) => {
            const confirmou = a.confirmacoes.includes(estado.usuario)
            return (
              <Card key={a.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{a.tipo}</p>
                  <Badge
                    className={
                      a.resolvido
                        ? 'bg-slate-100 text-slate-600'
                        : a.gravidade === 'Alta'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    }
                  >
                    {a.resolvido ? 'resolvido' : a.gravidade}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{a.descricao}</p>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-xs text-slate-400">
                    {a.confirmacoes.length} confirmação(ões)
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => confirmarAlerta(a.id)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        confirmou
                          ? 'bg-emerald-600 text-white'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {confirmou ? 'Confirmado' : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => updateAlerta(a.id, { resolvido: !a.resolvido })}
                      className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      {a.resolvido ? 'Reabrir' : 'Resolver'}
                    </button>
                    <button
                      onClick={() => removeAlerta(a.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <Modal
        aberto={modalRota}
        titulo="Descrever a rota"
        onFechar={() => setModalRota(false)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome da rota" className="sm:col-span-2">
            <Input
              value={formRota.nome}
              onChange={(e) => setFormRota({ ...formRota, nome: e.target.value })}
              placeholder="Ex.: Beco da Escada — acesso principal"
            />
          </Campo>
          <Campo label="Tipo">
            <Select
              value={formRota.tipo}
              onChange={(e) =>
                setFormRota({ ...formRota, tipo: e.target.value as TipoRota })
              }
            >
              {TIPOS_ROTA.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Campo>
          <Campo label="Condição">
            <Select
              value={formRota.condicao}
              onChange={(e) =>
                setFormRota({ ...formRota, condicao: e.target.value as Condicao })
              }
            >
              {CONDICOES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Campo>
          <Campo label="Descrição" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={formRota.descricao}
              onChange={(e) => setFormRota({ ...formRota, descricao: e.target.value })}
              placeholder="O que o morador precisa saber sobre esse caminho?"
            />
          </Campo>
          <div className="flex gap-5 sm:col-span-2">
            <Checkbox
              label="Tem iluminação"
              checked={formRota.iluminacao}
              onChange={(v) => setFormRota({ ...formRota, iluminacao: v })}
            />
            <Checkbox
              label="Acessível (cadeira de rodas / carrinho)"
              checked={formRota.acessivel}
              onChange={(v) => setFormRota({ ...formRota, acessivel: v })}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setModalRota(false)}>
            Cancelar
          </Botao>
          <Botao onClick={salvarRota} disabled={!formRota.nome.trim()}>
            Salvar rota
          </Botao>
        </div>
      </Modal>

      <Modal
        aberto={modalAlerta}
        titulo="Marcar um problema"
        onFechar={() => {
          setModalAlerta(false)
          setPontoAlerta(null)
        }}
        largura="max-w-lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Tipo">
            <Select
              value={formAlerta.tipo}
              onChange={(e) =>
                setFormAlerta({ ...formAlerta, tipo: e.target.value as TipoAlerta })
              }
            >
              {TIPOS_ALERTA.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Campo>
          <Campo label="Gravidade">
            <Select
              value={formAlerta.gravidade}
              onChange={(e) =>
                setFormAlerta({ ...formAlerta, gravidade: e.target.value as Gravidade })
              }
            >
              {GRAVIDADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Campo>
          <Campo label="O que está acontecendo?" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={formAlerta.descricao}
              onChange={(e) => setFormAlerta({ ...formAlerta, descricao: e.target.value })}
            />
          </Campo>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Botao
            variante="secundario"
            onClick={() => {
              setModalAlerta(false)
              setPontoAlerta(null)
            }}
          >
            Cancelar
          </Botao>
          <Botao onClick={salvarAlerta} disabled={!formAlerta.descricao.trim()}>
            Publicar alerta
          </Botao>
        </div>
      </Modal>
    </div>
  )
}
