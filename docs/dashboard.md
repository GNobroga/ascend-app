# Dashboard da home: requisitos

Levantamento para transformar a home do negócio (`/b/:businessId`) em um dashboard com indicadores e gráficos. Este documento não é implementação: define o que mostrar, para quem, com quais regras e o que falta na API. As decisões estão marcadas como **Decidido**.

## 1. Situação atual

O que já existe na home:

- **Checklist de ativação** (só `owner`/`admin`), enquanto houver etapa pendente.
- **Resumo do dia** (`TodayOverview`): agendamentos de hoje, em atendimento agora, recebido hoje e a receber dos concluídos. É calculado no front, a partir da lista de agendamentos do dia.
- **Pendentes de confirmação** (`PendingConfirmations`).

O que não existe:

- **Métricas na API:** nenhum endpoint de agregação. Qualquer número de período maior que o dia teria que ser calculado no front a partir de listas, o que não escala (a agenda limita o intervalo a 31 dias, de propósito).
- **Gráficos:** nenhuma biblioteca de gráficos no `apps/web` nem no `@packages/ui`.
- **Dados que faltam gravar:**
  - **Origem do agendamento** (online ou equipe): existe só no evento `AppointmentOrigin`, não é gravada no agendamento.
  - **Data do recebimento:** o pagamento não tem data própria, só o `createdAt`. Um pagamento lançado depois do atendimento conta no dia em que foi lançado.

## 2. Objetivos

O dashboard responde, em poucos segundos, às perguntas que o dono e a equipe fazem toda semana:

1. Como está o movimento? (agendamentos e atendimentos no período, comparados ao período anterior)
2. Quanto entrou e quanto falta receber?
3. Onde estou perdendo? (faltas, cancelamentos, horários ociosos)
4. Quem e o que mais rende? (profissionais e serviços)
5. Os clientes estão voltando e gostando? (novos e recorrentes, nota)
6. O agendamento online está funcionando? (participação do online)

Fora do escopo do dashboard: relatórios detalhados e exportação, que ficam em "Relatórios" (item 1 do `docs/next-features.md`). O dashboard resume; o relatório detalha. Os dois devem usar as mesmas definições de métrica (seção 5).

## 3. Público e permissões

| Papel | O que vê |
|---|---|
| `owner` / `admin` | O negócio inteiro: todos os indicadores, com filtro por profissional. |
| `professional` (sem papel de gestão) | Só os próprios números: os próprios atendimentos, faturamento e comissão, nota e faltas dos próprios clientes. Sem ranking da equipe nem dados financeiros do negócio. |

- A API aplica o recorte. O front não recebe dado que o papel não pode ver.
- **Decidido:** o `professional` vê a própria comissão no dashboard.

## 4. Filtros

Seguindo a regra de "uma linha de filtros acima de tudo, e todos os números respondem ao mesmo recorte":

- **Período**, com atalhos: Hoje, Últimos 7 dias, Este mês, Mês passado, Últimos 30 dias, Últimos 90 dias, além de um intervalo personalizado.
  - Sempre no **fuso do negócio** (`business.timezone`), inclusive os limites de dia e mês.
  - **Decidido:** o período padrão ao abrir é "Últimos 30 dias"; o resumo de hoje continua fixo no topo.
- **Comparação** com o período anterior de mesma duração (ex.: últimos 30 dias contra os 30 anteriores), mostrada como variação nos cartões.
- **Profissional** (só gestores): todos ou um.
- Filtros ficam na URL (`nuqs`), para o link ser compartilhável e o voltar do navegador funcionar.
- Ao trocar o filtro, os gráficos mantêm o desenho anterior esmaecido enquanto recarregam, sem esqueleto nem salto de layout.

## 5. Definições das métricas

Cada número precisa de uma definição única, documentada no `docs/business-rules.md` e usada pelo dashboard e pelos relatórios.

| Métrica | Definição | Observação |
|---|---|---|
| Agendamentos | Agendamentos com início no período, de qualquer status | Os cancelados contam à parte |
| Atendimentos | Agendamentos `completed` com início no período | |
| Faturamento | Soma do `totalPrice` dos `completed` no período | É o valor atendido; o recebido é outra métrica |
| Recebido | Soma dos pagamentos `paid` com `paidAt` no período; estornos e cancelados não contam | |
| A receber | Saldo (`balance`) dos `completed` ainda não quitados, até o fim do período | |
| Ticket médio | Faturamento ÷ atendimentos | |
| Taxa de faltas | `no_show` ÷ (`completed` + `no_show`) no período | |
| Taxa de cancelamento | `cancelled` ÷ agendamentos no período, separando cancelado pelo cliente e pela equipe | Separar por quem cancelou exige ler o histórico de status |
| Ocupação | Minutos agendados (`completed`, `confirmed`, `in_progress`) ÷ minutos de expediente disponíveis, descontadas as ausências | Cálculo mais pesado; ver seção 9 |
| Clientes atendidos | Clientes distintos com atendimento `completed` no período | |
| Clientes novos | Clientes cujo primeiro atendimento `completed` caiu no período | "Novo" é pelo primeiro atendimento, não pelo cadastro |
| Clientes recorrentes | Clientes atendidos no período que já tinham atendimento antes dele | |
| Nota média | Média das avaliações criadas no período (inclusive com comentário oculto, como na regra atual) | |
| Participação online | Agendamentos com `origin = customer` ÷ agendamentos com origem conhecida | |
| Comissão | Soma da comissão (`totalCommission`) dos `completed` no período | |

## 6. Conteúdo e forma de cada bloco

A forma vem do papel do dado: número isolado vira cartão, evolução no tempo vira linha, comparação entre itens vira barra, e lista com muitos itens vira tabela. Sem pizza, sem gráfico de dois eixos, sem mais de 4 a 6 séries por gráfico.

### 6.1 Topo: hoje (já existe, mantido)

Resumo do dia e pendentes de confirmação, como hoje. Não seguem o filtro de período: são o painel de operação do dia.

### 6.2 Linha de indicadores (cartões)

Seis cartões, cada um com o valor do período, a variação em relação ao período anterior (seta e percentual, sempre com texto, nunca só cor) e uma linha pequena de tendência:

1. Faturamento (atendido); o recebido aparece no gráfico e no detalhe
2. Atendimentos
3. Ticket médio
4. Taxa de faltas (aqui "subir" é ruim: a cor da variação respeita o sentido da métrica)
5. Clientes novos
6. Nota média

Para o `professional`, os cartões são os dele: atendimentos, faturamento atendido, comissão e nota.

### 6.3 Evolução no período

- **Faturamento por dia** (ou por semana, quando o período passar de ~60 dias): linha ou área de uma série só. A dica ao passar o mouse mostra o dia, o valor e a quantidade de atendimentos.
- **Agendamentos por status ao longo do tempo:** colunas empilhadas por dia ou semana com concluídos, faltas e cancelados. Até 4 categorias, com legenda e rótulo direto.

### 6.4 Quem e o que rende (só gestores)

- **Profissionais:** barras horizontais com faturamento atendido por profissional, ordenadas. A dica mostra atendimentos, ticket médio, nota e taxa de faltas. Com mais de 8 profissionais, mostra os 7 maiores e agrupa o resto em "Outros".
- **Serviços mais vendidos:** barras horizontais com os 5 a 10 serviços (e pacotes) com mais faturamento ou quantidade, com seletor "por faturamento / por quantidade".
- **Recebido por forma de pagamento:** barras horizontais (ou uma barra empilhada única, se forem até 4 formas), em vez de pizza.

### 6.5 Horários de pico

- **Mapa de calor dia da semana × hora** com a quantidade de atendimentos (cor em um único tom, do claro ao escuro). Mostra onde a agenda lota e onde há ociosidade, o que ajuda a decidir promoções e escala da equipe.
- **Decidido:** entra na segunda versão (Fase 3 do roadmap).

### 6.6 Clientes

- **Novos e recorrentes no período:** colunas empilhadas por semana ou mês, ou só dois cartões na primeira versão.
- **Clientes que sumiram:** lista curta dos clientes recorrentes sem atendimento há mais de N dias, com link para o detalhe (o histórico de agendamentos já existe). Dá ação ao dono: chamar no WhatsApp.
- **Decidido:** N = 60 dias, configurável no futuro.

### 6.7 Agendamento online

- Cartão com a participação do online no período e a variação, para mostrar ao dono o valor da página pública.
- Depende de gravar a origem do agendamento (seção 8).

## 7. Estados especiais

- **Negócio novo, sem dados:** em vez de gráficos vazios, uma mensagem orientando o próximo passo (checklist de ativação e link da página pública). Os gráficos só aparecem a partir do primeiro atendimento.
- **Período sem dados:** cada bloco mostra "Sem atendimentos neste período", sem eixo vazio.
- **Período em andamento** (ex.: "Este mês" no dia 10): a comparação usa o mesmo número de dias do período anterior, não o mês inteiro, para não mostrar queda falsa.
- **Erro em um bloco:** só aquele bloco mostra erro e "tentar de novo"; o resto da página continua funcionando (`react-error-boundary` por seção).
- **Assinatura `restricted`:** o dashboard continua disponível; só leitura não é bloqueada pela regra atual.

## 8. Mudanças necessárias nos dados

1. **Gravar a origem do agendamento:** coluna `origin` (`team` | `customer`) no agendamento, preenchida na criação.
   - **Decidido:** os antigos são inferidos pelo primeiro registro do histórico de status: criado por membro do negócio é `team`, pelo usuário do cliente é `customer`, e o resto fica nulo (desconhecido).
2. **Data do recebimento:** **Decidido:** o pagamento ganha `paidAt`, que por padrão é o momento do lançamento e pode ser informado pela equipe quando lança depois. Os pagamentos antigos recebem `paidAt = createdAt`.
3. **Índices para agregação:** revisados. Agendamentos do negócio no período saem de `customers (businessId, …)` seguido de `appointments (customerId, startAt)`, e com filtro de profissional de `appointments (professionalId, startAt)`; ambos já existiam. Foram criados `payments (paidAt)` e `reviews (businessId, createdAt)`. Se os testes de volume (Fase 3) mostrarem lentidão, o próximo passo é gravar o `businessId` no agendamento.

## 9. API proposta

Endpoints de leitura, todos com `from`/`to` (datas locais no fuso do negócio), `professionalId` opcional e o recorte por papel aplicado no servidor:

- `GET /businesses/:id/dashboard/summary`: os valores dos cartões no período e no de comparação. Sem `compareFrom`/`compareTo`, compara com os dias imediatamente anteriores, de mesma duração; o front envia a comparação explícita nos atalhos de mês ("Este mês" no dia 10 contra os 10 primeiros dias do mês passado).
- `GET /businesses/:id/dashboard/timeseries?interval=day|week|month`: todas as séries de uma vez (agendamentos por status, faturamento, recebido, comissão, clientes novos e nota), um item por dia, semana ou mês, inclusive os vazios. Sem `interval`, escolhe pela duração.
- `GET /businesses/:id/dashboard/professionals`, `/services` e `/payment-methods` (só gestores): comparação entre itens. Ficaram em rotas separadas porque cada uma devolve campos diferentes.
- `GET /businesses/:id/dashboard/heatmap`: dia da semana × hora de início dos atendimentos.
- `GET /businesses/:id/dashboard/occupancy`: ocupação da agenda no período e no de comparação, no total e por profissional.
- `GET /businesses/:id/dashboard/inactive-customers` (só gestores): a lista de clientes que sumiram. Novos e recorrentes já vêm no `summary`, e a evolução de novos no `timeseries`.

Requisitos não funcionais:

- **Agregação no banco** (SQL com `GROUP BY` e `date_trunc` no fuso do negócio), nunca trazendo listas para somar na aplicação.
- **Período máximo** (sugestão: 12 meses) e intervalo escolhido pela duração, para limitar o custo.
- **Cache** em Redis por 2 minutos, por negócio, rota e filtro, separado entre gestores e cada profissional. Agendamento criado, remarcado ou com status mudado, pagamento registrado, estornado ou cancelado e avaliação nova invalidam o cache do negócio na hora; o resto (troca de serviços, edição de catálogo) espera os 2 minutos. Se o Redis cair, a rota calcula direto.
- **Documentados no Swagger** com as definições da seção 5 nas descrições.
- **Valores monetários** com 2 casas, como no resto da API.

## 10. Front

- **Biblioteca de gráficos:** não existe hoje.
  - **Decidido:** o componente `chart` do shadcn (sobre Recharts), instalado no `@packages/ui`, por já seguir o tema e o modo escuro do design system.
- **Paleta:** cores dos gráficos como tokens no tema do `@packages/ui` (`--chart-1` a `--chart-8`, claro e escuro definidos separadamente), validadas para daltonismo sobre a superfície do card: a ordem passa a separação entre vizinhos nos dois modos, e as três primeiras passam entre todos os pares (gráficos com mais de três séries sem vizinhança fixa agrupam o resto em "Outros"). O slot 1 é o violeta da marca. No claro, `--chart-3`, `--chart-4` e `--chart-5` ficam abaixo de 3:1 sobre o branco, então os gráficos que os usam levam rótulo direto ou a tabela. A variação dos cartões usa `--chart-positive` e `--chart-negative`, sempre com seta e texto. A cor de cada série segue a entidade (um profissional mantém a cor mesmo quando o filtro muda) e as cores de status (bom, atenção, crítico) não são reaproveitadas como cor de série.
- **Interação:** dica ao passar o mouse e ao focar pelo teclado em todo gráfico; em linhas, a dica acompanha o dia mais próximo do cursor.
- **Acessibilidade:**
  - Nenhuma informação só pela cor: variação com seta e texto, séries com legenda.
  - Cada gráfico tem uma alternativa em tabela ("ver dados").
- **Celular:** os cartões em duas colunas, os gráficos em uma coluna, os de barras na horizontal, e o mapa de calor pode virar uma lista dos horários de pico.
- **Desempenho:** cada bloco carrega independente (`prefetchQuery` no loader + `Suspense` por seção), para o topo aparecer rápido.

## 11. Roadmap

### Fase 0: decisões e dados

- [x] Fechar as decisões marcadas neste documento
- [x] Documentar as definições das métricas no `docs/business-rules.md`
- [x] Gravar a origem do agendamento (coluna, migration, criação pela equipe e pelo cliente)
- [x] Decidir a data do recebimento (`createdAt` ou `paidAt`) e, se for o caso, adicionar o campo
- [x] Revisar os índices para as consultas de período
- [x] Escolher e instalar a biblioteca de gráficos no `@packages/ui`, com a paleta validada (claro e escuro)

### Fase 1: primeira versão

- [x] API: `summary` com período anterior e recorte por papel
- [x] API: `timeseries` de faturamento e de agendamentos por status
- [x] Web: filtros de período e profissional na URL
- [x] Web: linha de cartões com variação e tendência
- [x] Web: gráfico de faturamento no tempo
- [x] Web: gráfico de agendamentos por status
- [x] Web: estados de negócio novo, período vazio e erro por bloco
- [x] Web: versão do `professional` (só os próprios números)

### Fase 2: comparação e clientes

- [x] API: `breakdown` por profissional, serviço e forma de pagamento
- [x] API: `customers` (novos, recorrentes, clientes que sumiram)
- [x] Web: ranking de profissionais
- [x] Web: serviços mais vendidos
- [x] Web: recebido por forma de pagamento
- [x] Web: clientes novos e recorrentes e a lista dos que sumiram
- [x] Web: participação do agendamento online

### Fase 3: aprofundamento

- [x] API e web: mapa de calor dos horários de pico
- [x] API e web: taxa de ocupação da agenda
- [x] Web: alternativa em tabela para cada gráfico
- [x] Cache das consultas e testes de desempenho com volume grande de dados

## 12. Desempenho medido

Medido em outubro de 2026 com PGlite (Postgres em WASM, uma thread só, então os tempos absolutos são maiores que num Postgres de verdade), com os índices da produção: 200 negócios, 939 mil agendamentos, 750 mil pagamentos e 209 mil avaliações. O negócio grande tem 43,8 mil agendamentos e 2 mil clientes em dois anos; o pequeno, 4,5 mil e 150.

| Rota (sem cache) | Grande, 30 dias | Grande, 1 ano | Pequeno, 30 dias | Pequeno, 1 ano |
|---|---|---|---|---|
| `summary` | 1,4 s | 2,5 s | 134 ms | 142 ms |
| `timeseries` | 134 ms | 644 ms | 46 ms | 49 ms |
| `professionals` | 25 ms | 338 ms | 6 ms | 19 ms |
| `services` | 88 ms | 572 ms | 6 ms | 79 ms |
| `payment-methods` | 72 ms | 195 ms | 24 ms | 20 ms |
| `heatmap` | 19 ms | 237 ms | 4 ms | 10 ms |
| `occupancy` | 36 ms | 541 ms | 16 ms | 193 ms |
| `inactive-customers` | 77 ms | | 9 ms | |

- A ocupação lia o histórico inteiro do negócio para achar os agendamentos que cruzam o período; com o limite inferior (início até 5 dias antes do período, a duração máxima de um agendamento), caiu de 634 ms para 36 ms em 30 dias.
- O `summary` é o mais caro porque "A receber" e "Clientes novos" precisam do histórico inteiro de atendimentos do negócio. Com o cache, isso acontece no máximo uma vez a cada 2 minutos por filtro.
- Se o tempo crescer na produção, o próximo passo é gravar o `businessId` no agendamento (hoje o negócio vem pelo cliente) e indexar `(businessId, status, startAt)`.

