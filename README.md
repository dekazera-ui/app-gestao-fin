# 💰 Gestão Financeira

App pessoal de gestão financeira mensal — **100% offline, sem backend,
sem coleta de dados**. Todos os lançamentos, salário e valores ficam
salvos localmente no próprio dispositivo (IndexedDB), nunca em um
servidor.

🔗 **[Testar a demo](https://dekazera-ui.github.io/app-gestao-fin/)**
📱 **[Baixar o APK Android](../../releases)** (posteriormente será adicionado)

---

## Sobre o projeto

Este projeto nasceu de uma necessidade bem prática: substituir uma
planilha de Excel de controle financeiro mensal por algo mais rápido
de usar no dia a dia, direto do celular. A ideia central é simples —
o salário do mês é distribuído entre categorias (Contas Fixas, Contas
Variáveis, Guardar e um vale/benefício), e o app calcula
automaticamente quanto sobra ("Livre") e quanto cada
categoria representa do total.

## Funcionalidades

- 📊 Visão geral com gráfico de rosca mostrando a distribuição do
  orçamento do mês (calculada automaticamente, não são metas fixas)
- 🗓️ Navegação por mês — cada mês tem seu próprio salário, valores e
  lançamentos, independentes entre si
- ➕ Adicionar lançamentos com valor, categoria e nome opcional
  (ex: "Aluguel", "Mercado")
- ✏️ Editar e excluir lançamentos já adicionados
- 🍱 Categoria de benefício (ex: Alelo/Vale Refeição) com nome
  customizável por mês e barra de progresso própria
- 🔒 Nenhum dado sai do dispositivo — sem servidor, sem contas, sem
  rastreamento
- 📲 Instalável tanto como **PWA** (direto do navegador) quanto como
  **app Android nativo** (.apk, via Capacitor)

## Capturas de tela

<p align="center">
  <img src="screenshots/Tela inicial.png" width="220" alt="Tela inicial" />
  <img src="screenshots/Tela Lançamento.png" width="220" alt="Adicionar lançamento" />
</p>

## Tecnologias utilizadas

- **HTML5, CSS3 e JavaScript puro** — sem frameworks, sem build step
  na versão web
- **IndexedDB** — persistência de dados 100% local, no navegador/app
- **Service Worker + Web App Manifest** — funcionamento offline e
  instalação como PWA
- **[Capacitor](https://capacitorjs.com/)** — empacotamento como app
  Android nativo, reaproveitando o mesmo código web

## Estrutura do repositório

```
gestao-financeira/
├── docs/               # App web (PWA) — servido via GitHub Pages
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── manifest.json
│   ├── sw.js
│   └── icon.svg
├── mobile/              # Projeto Capacitor (app Android nativo)
│   ├── www/              # mesmo app, sem manifest/service worker
│   ├── package.json
│   ├── capacitor.config.json
│   └── README.md         # passo a passo completo pra gerar o .apk
└── screenshots/
```

## Rodando localmente (versão web)

Não tem build step — é só servir os arquivos estáticos:

```bash
cd docs
python -m http.server 8000
```

Acesse `http://localhost:8000` no navegador.

## Gerando o app Android (.apk)

O passo a passo completo (instalação de dependências, comandos do
Capacitor, geração do APK) está em [`mobile/README.md`](mobile/README.md).

## Privacidade

Este app não tem backend, não faz nenhuma chamada de rede para salvar
dados, e não usa nenhum serviço de analytics ou rastreamento. Tudo o
que você digita fica salvo apenas no armazenamento local do seu
próprio navegador/dispositivo. Isso vale também para a demo pública:
cada visitante tem seus próprios dados, isolados, e ninguém mais tem
acesso a eles.

## Licença

Distribuído sob a licença MIT — veja [`LICENSE`](LICENSE) para mais
detalhes. Sinta-se à vontade para usar, estudar e adaptar este
projeto.

## Autor

Feito por **Diego**.
[LinkedIn](#) · [GitHub](#)
