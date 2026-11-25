# WenLux Pricer

Sistema interno de formação de preços e apoio à gestão operacional da WenLux.

O WenLux Pricer combina planejamento financeiro, estimativa do esforço de cada serviço, custos de equipamentos e despesas operacionais para apoiar a definição de preços. O projeto está em desenvolvimento e seus parâmetros de cálculo devem ser calibrados com dados reais da operação.

## Funcionalidades disponíveis

- Interface administrativa responsiva com identidade visual própria.
- Dashboard inicial.
- Cadastro, edição e exclusão de equipamentos.
- Registro de aquisição, vida útil, valor residual e horas produtivas.
- Cálculo de depreciação mensal e por hora.
- Cadastro e edição de serviços.
- Divisão dos serviços em etapas de execução.
- Estimativa de horas, complexidade, especialização e responsabilidade por etapa.
- Associação de equipamentos e cálculo de depreciação utilizada.
- Planejamento de remuneração, capacidade produtiva, custos fixos e metas de lucro.
- Memória de cálculo com custo estimado, preço mínimo sustentável e preço recomendado.
- Migração do banco local para incluir as configurações de planejamento, preservando as tabelas existentes.

## Como a precificação funciona atualmente

A remuneração mensal desejada é dividida pelas horas produtivas mensais para obter uma referência de custo-base por hora. Cada etapa do serviço aplica ajustes iniciais de esforço: nível médio acrescenta 5% e nível alto acrescenta 15% por critério (complexidade, especialização e responsabilidade).

O custo estimado do serviço reúne:

- Mão de obra estimada por etapa.
- Rateio dos custos fixos conforme as horas produtivas.
- Depreciação dos equipamentos associados ao serviço.

O preço mínimo sustentável considera os percentuais de tributos e outros custos variáveis informados no planejamento. O preço recomendado também considera a margem desejada por serviço.

**Importante:** os percentuais de esforço são parâmetros iniciais de modelagem, não uma tabela de mercado ou uma avaliação objetiva universal. Devem ser revistos à medida que a WenLux acumular dados de execução. O preço calculado não substitui pesquisa de mercado, análise de escopo ou orientação contábil.

## Planejamento financeiro

Na seção **Metas e planejamento**, podem ser configurados:

- Remuneração mensal desejada.
- Referência mínima de remuneração (opcional e ajustável pelo usuário).
- Horas produtivas mensais.
- Custos fixos mensais.
- Meta de lucro mensal.
- Margem de lucro desejada por serviço.
- Percentuais estimados de tributos e outros custos variáveis.

A referência de faturamento mensal é uma estimativa para cobrir remuneração, custos fixos e meta de lucro, considerando os percentuais informados. Ela não representa previsão de vendas nem substitui o acompanhamento do fluxo de caixa.

## Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS
- Dexie.js
- IndexedDB
- Lucide React

## Armazenamento de dados

O aplicativo utiliza IndexedDB por meio do Dexie.js. Os dados ficam armazenados localmente no navegador e não são sincronizados automaticamente entre dispositivos.

A atualização do banco utiliza a versão 3 do Dexie. Ela mantém as tabelas existentes e, caso encontre configurações de planejamento salvas na tabela usada pela entrega anterior do Pricer, migra esses valores para a estrutura atual. Ainda assim, faça cópias de segurança periódicas dos dados do navegador quando o recurso de backup estiver disponível.

## Instalação e execução

### Pré-requisitos

- Node.js compatível com a versão do Vite utilizada.
- npm.
- Git (opcional, para clonar o repositório).

### 1. Clone o repositório

```bash
git clone URL_DO_REPOSITORIO
```

### 2. Entre na pasta

```bash
cd wenlux-price
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

O Vite exibirá o endereço local, normalmente `http://localhost:5173`.

### 5. Verifique a compilação

```bash
npm run build
```

## Estrutura principal

```text
wenlux-pricer/
├── public/
│   └── wenlux-pricer-mark.png
├── src/
│   ├── database/
│   │   └── db.ts
│   ├── modules/
│   │   ├── equipment/
│   │   ├── planning/
│   │   └── services/
│   ├── utils/
│   │   └── pricing.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

## Status

Em desenvolvimento. O módulo de despesas, orçamento, fluxo de caixa, análise de mercado e acompanhamento de resultados realizados ainda precisa ser integrado ao motor de precificação.

---

Desenvolvido para a **WenLux**.

GitHub: [@WenderG](https://github.com/WenderG)


## Módulo de Manutenção (v0.3.2)

Registre manutenções preventivas e corretivas por equipamento, agende datas, marque registros como concluídos, acompanhe atrasos e custos e consulte o histórico. Os registros são salvos localmente no IndexedDB (Dexie).
