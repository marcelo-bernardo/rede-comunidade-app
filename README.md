# Rede Comunidade

Plataforma de mapeamento colaborativo para comunidades carentes. Os próprios
moradores desenham as rotas que usam, sinalizam os problemas do território,
catalogam o comércio local e registram famílias e domicílios — gerando um
retrato que normalmente não existe em nenhuma base oficial.

## Módulos

### 🗺️ Mapa colaborativo de rotas

Mapa OpenStreetMap onde qualquer morador contribui:

- **Desenhar rotas** clicando ponto a ponto no mapa. Cada rota tem tipo
  (caminho a pé, acesso de veículo, rota escolar, coleta de lixo, emergência),
  condição, iluminação e acessibilidade.
- **Marcar alertas** georreferenciados: alagamento, buraco, falta de
  iluminação, risco de deslizamento, lixo acumulado, ponto de risco.
- **Validação comunitária**: rotas nascem pendentes (traçado tracejado) e
  ganham confirmações de outros moradores até serem validadas.
- Comprimento das rotas calculado por Haversine; cor da linha reflete a
  condição da via.

### 🏪 Comércios

Catálogo do comércio local, formal e informal: categoria, responsável,
horário, contato, produtos, se aceita fiado, se faz entrega, MEI/CNPJ e
localização opcional (aparece como ponto no mapa).

### ✦ Freelancers

Quem presta serviço na comunidade: profissão, habilidades, disponibilidade
por turno, faixa de preço (hora/diária/serviço), atendimento em domicílio e
transporte próprio. Busca por habilidade e filtro por disponibilidade.

### 🏠 Casas

Cadastro físico dos domicílios: tipo de construção, situação de moradia,
número de cômodos, infraestrutura (água, esgoto, energia, coleta) e riscos
identificados (alagamento, deslizamento, incêndio, estrutural).

### 👨‍👩‍👧 Famílias

Registro familiar completo com composição (nome, nascimento, parentesco,
escolaridade, se estuda/trabalha, PCD, doença crônica, gestante), renda,
benefícios sociais e vínculo com uma casa.

Cada família recebe um **índice de vulnerabilidade (0–100)** que combina renda
per capita, composição familiar e a infraestrutura da moradia — usado para
priorizar visitas e encaminhamentos. É um instrumento de triagem, não
substitui a avaliação técnica do CRAS.

### ◎ Painel

Consolida tudo: total de pessoas, crianças e idosos, quilometragem mapeada,
cobertura de infraestrutura por indicador, ranking de famílias prioritárias e
alertas abertos.

## Stack

- React 19 + TypeScript
- Vite 8
- React Router 7
- Tailwind CSS 4
- Leaflet + React Leaflet (OpenStreetMap, sem chave de API)

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build de produção
npm run preview
```

## Persistência

Os dados ficam no `localStorage` do navegador — a aplicação roda inteira no
cliente, sem backend. A tela **Ajustes** permite exportar/importar o estado em
JSON, restaurar os dados de demonstração ou apagar tudo.

Para colocar em produção com múltiplos contribuintes, o próximo passo é
substituir `src/store/AppStore.tsx` por um cliente de API — a interface do
contexto (`useApp`) já isola todo o acesso a dados.

## Estrutura

```
src/
├── components/     Layout, navegação e biblioteca de UI
├── lib/            tipos do domínio, utilitários e dados de demonstração
├── pages/          Painel, Mapa, Comércios, Freelancers, Casas, Famílias, Ajustes
└── store/          contexto React + persistência em localStorage
```

## Licença

MIT
