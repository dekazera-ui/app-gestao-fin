# Gestão Financeira — App Android (.apk)

App 100% offline. Todos os dados (lançamentos, salário, Alelo) ficam
salvos **dentro do próprio celular** (SQLite/IndexedDB via WebView local).
Não existe servidor, não existe internet envolvida em nenhum momento
depois de instalado.

Este projeto usa o **Capacitor** para empacotar o app (HTML/CSS/JS que
já construímos, dentro da pasta `www/`) como um app Android nativo de
verdade.

---

## O que você precisa instalar (uma vez só, na sua máquina)

1. **Node.js** (versão LTS) — https://nodejs.org
2. **Android Studio** — https://developer.android.com/studio
   - Abra o Android Studio uma vez depois de instalar e deixe ele
     baixar o Android SDK (ele pede automaticamente na primeira vez).
   - Não precisa criar nenhum projeto nele, é só pra ter o SDK/Gradle
     disponíveis no seu computador.
3. **Java (JDK)** — normalmente já vem junto com o Android Studio,
   não precisa instalar separado.

---

## Passo a passo pra gerar o .apk

Abra um terminal **dentro desta pasta** (`gestao-financeira-apk`) e
rode, em ordem:

```bash
# 1. Instala as dependências do Capacitor (baixa da internet, só essa vez)
npm install

# 2. Adiciona a plataforma Android ao projeto (cria a pasta android/)
npx cap add android

# 3. Copia os arquivos do app (www/) para dentro do projeto Android
npx cap sync android
```

Depois disso, você tem duas formas de gerar o `.apk`:

### Opção A — Linha de comando (mais rápido, sem abrir o Android Studio)

```bash
cd android
./gradlew assembleDebug        # Mac/Linux
gradlew.bat assembleDebug      # Windows
```

O `.apk` vai aparecer em:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Copie esse arquivo pro celular (por cabo, e-mail pra você mesmo, Google
Drive, etc.) e instale abrindo ele no celular — o Android vai pedir
pra permitir "instalar de fontes desconhecidas" na primeira vez, é
só autorizar.

### Opção B — Pelo Android Studio (interface gráfica)

```bash
npx cap open android
```

Isso abre o projeto no Android Studio. Espere o Gradle sincronizar
(barra de progresso embaixo) e depois vá em:
`Build → Build Bundle(s) / APK(s) → Build APK(s)`

O `.apk` fica no mesmo caminho da Opção A.

---

## Quando você atualizar o app (novo `app.js`, `index.html`, etc.)

1. Substitua os arquivos dentro da pasta `www/`.
2. Rode de novo: `npx cap sync android`
3. Gere o `.apk` de novo (Opção A ou B acima).

Não precisa repetir o `npm install` nem o `cap add android` — isso é
só na primeira vez.

---

## Sobre o ícone do app

Por enquanto o app vai usar o ícone padrão do Capacitor. Se quiser
trocar pelo ícone do "Gestão Financeira" (o SVG que já temos no
projeto web), o jeito mais fácil é usar o gerador de ícones do
próprio Android Studio: clique com o botão direito na pasta
`android/app/src/main/res` → `New → Image Asset` → escolha a imagem
e ele gera todos os tamanhos automaticamente.

---

## Estrutura deste projeto

```
gestao-financeira-apk/
├── package.json           # dependências do Capacitor
├── capacitor.config.json  # configuração do app (nome, id, pasta web)
├── www/                   # o app em si (HTML/CSS/JS) — igual ao web,
│                           # só sem manifest/service worker (não são
│                           # necessários dentro de um app nativo)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── android/                # criado automaticamente pelo "cap add android"
```
