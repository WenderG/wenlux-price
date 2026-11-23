
# WenLux Price

Sistema interno de gestão e precificação de serviços desenvolvido para a WenLux.

O WenLux Price tem como objetivo auxiliar na organização dos custos operacionais, equipamentos, serviços e formação de preços, oferecendo uma visão mais clara sobre os custos envolvidos em cada atividade da empresa.

O projeto está em desenvolvimento e será aprimorado gradualmente conforme as necessidades operacionais da WenLux.

## Objetivos

- Centralizar informações sobre equipamentos e ativos.
- Registrar custos e despesas operacionais.
- Calcular custos relacionados à utilização de equipamentos.
- Organizar serviços e mão de obra.
- Auxiliar na elaboração de orçamentos.
- Apoiar a análise de custos, receitas e rentabilidade.

## Funcionalidades

### Implementadas
- [x] Interface administrativa com tema escuro.
- [x] Dashboard inicial.
- [x] Cadastro de equipamentos.
- [x] Edição e exclusão de equipamentos.
- [x] Registro de valor de aquisição e vida útil.
- [x] Cálculo de depreciação mensal.
- [x] Estimativa de depreciação por hora.

### Em desenvolvimento
- [ ] Cadastro e gerenciamento de serviços.
- [ ] Associação de equipamentos aos serviços.
- [ ] Cálculo de custos operacionais por serviço.
- [ ] Gestão de despesas fixas e variáveis.
- [ ] Gestão de manutenção.
- [ ] Gestão de mão de obra.
- [ ] Elaboração e acompanhamento de orçamentos.
- [ ] Relatórios e indicadores financeiros.
- [ ] Exportação e restauração de backups.

## Tecnologias utilizadas

- React
- TypeScript
- Vite
- Tailwind CSS
- Dexie.js
- IndexedDB
- Lucide React
- Recharts

## Armazenamento de dados

O projeto utiliza IndexedDB, por meio da biblioteca Dexie.js, para armazenar informações localmente no navegador.

Atualmente, o sistema não realiza movimentações financeiras reais nem depende de um servidor externo para armazenar os dados.

**Atenção:** os dados são armazenados no navegador utilizado. Limpar os dados do site ou trocar de navegador pode resultar na perda das informações. Implemente e utilize backups antes de cadastrar informações importantes.

## Instalação e execução

### Pré-requisitos

- Node.js
- npm
- Git

### 1. Clone o repositório

```bash
git clone URL_DO_REPOSITORIO
```

### 2. Entre na pasta do projeto

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

O Vite exibirá o endereço local para acessar a aplicação, normalmente:

```text
http://localhost:5173
```

## Estrutura do projeto

```text
wenlux-price/
├── public/
├── src/
│   ├── database/
│   │   └── db.ts
│   ├── modules/
│   │   ├── equipment/
│   │   └── services/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

A estrutura poderá ser ampliada conforme novos módulos forem desenvolvidos.

## Status do projeto

Em desenvolvimento.

O WenLux Price é um projeto proprietário de uso interno da WenLux, criado para estruturar processos de gestão, controle de custos e formação de preços.

---

Desenvolvido por **WenLux**.

GitHub: [@WenderG](https://github.com/WenderG)
