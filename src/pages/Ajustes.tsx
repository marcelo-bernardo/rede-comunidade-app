import { useState } from 'react'
import {
  Botao,
  Campo,
  Card,
  Input,
  SectionTitle,
  Textarea,
} from '../components/ui'
import { useApp } from '../store/AppStore'

export default function Ajustes() {
  const { estado, setUsuario, restaurarDemo, limparTudo, exportarJson, importarJson } =
    useApp()
  const [nome, setNome] = useState(estado.usuario)
  const [json, setJson] = useState('')
  const [aviso, setAviso] = useState('')

  function baixar() {
    const blob = new Blob([exportarJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rede-comunidade-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importar() {
    const r = importarJson(json)
    setAviso(r.ok ? 'Dados importados com sucesso.' : `Falhou: ${r.erro}`)
    if (r.ok) setJson('')
  }

  return (
    <div className="max-w-3xl">
      <SectionTitle
        titulo="Ajustes"
        descricao="Identidade do contribuinte e gestão dos dados locais."
      />

      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Quem está contribuindo
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <Campo label="Seu nome" className="flex-1 min-w-56">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Botao onClick={() => nome.trim() && setUsuario(nome.trim())}>Salvar</Botao>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Esse nome é registrado como autor das rotas e alertas que você cadastrar.
        </p>
      </Card>

      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Backup dos dados
        </h2>
        <p className="mb-3 text-sm text-slate-600">
          Tudo é guardado no navegador deste dispositivo (localStorage). Exporte um
          arquivo para levar os dados para outro computador.
        </p>
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" onClick={baixar}>
            Baixar JSON
          </Botao>
        </div>
        <Campo label="Colar um JSON para importar" className="mt-4">
          <Textarea
            rows={4}
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder='{"rotas": [], "familias": [] ...}'
          />
        </Campo>
        <div className="mt-3 flex items-center gap-3">
          <Botao onClick={importar} disabled={!json.trim()}>
            Importar
          </Botao>
          {aviso && <span className="text-sm text-slate-600">{aviso}</span>}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Zona de risco
        </h2>
        <div className="flex flex-wrap gap-2">
          <Botao
            variante="secundario"
            onClick={() =>
              confirm('Substituir tudo pelos dados de demonstração?') && restaurarDemo()
            }
          >
            Restaurar dados de demonstração
          </Botao>
          <Botao
            variante="perigo"
            onClick={() =>
              confirm('Apagar TODOS os cadastros? Não há como desfazer.') && limparTudo()
            }
          >
            Apagar todos os dados
          </Botao>
        </div>
      </Card>
    </div>
  )
}
