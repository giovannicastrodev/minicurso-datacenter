This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Chat de dúvidas do minicurso

Para rodar esta branch em uma máquina com Git, Node.js 22 e npm:

```bash
git clone --branch feature/chatbot-minicurso https://github.com/giovannicastrodev/minicurso-datacenter.git
cd minicurso-datacenter
npm ci
```

Configure estas variáveis no `.env.local` e, se publicar o recurso, no ambiente de hospedagem.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=chave_publica_do_supabase
GROQ_API_KEY=chave_privada_da_groq
# Opcional. Separe por vírgulas as origens HTTPS confiáveis dos PDFs externos.
# CHAT_PDF_ORIGINS=https://arquivos.exemplo.edu.br
```

Use os valores do projeto Supabase que já contém as aulas, os materiais e as contas do minicurso. O `seed.sql` apaga registros existentes antes de carregar os exemplos. Para testar com a base atual, conecte-se a ela diretamente.

Rode `npm run dev` e abra [localhost:3000](http://localhost:3000). Entre com uma conta de aluno e clique em **Chat do curso**, no canto inferior direito do painel. O botão acompanha a navegação entre a apresentação, o roteiro e as aulas. A conversa continua disponível ao fechar e reabrir o chat no painel.

A API usa a sessão do aluno para consultar as tabelas `aulas` e `materiais` sob as políticas do Supabase. O chat consulta as descrições e o texto dos PDFs cadastrados. A explicação baseada no curso apresenta trechos conferidos no servidor, com título e página para PDFs. O painel sinaliza explicações e exemplos gerais sobre temas técnicos relacionados como **Contexto complementar**. Cada pergunta é consultada de forma independente.

Perguntas sobre a ementa ou o que se aprende no minicurso consultam diretamente os títulos e as descrições das aulas, na ordem da trilha.

O Storage público do mesmo projeto e URLs assinadas válidas no Supabase são aceitos por padrão. Para PDFs em outros domínios, configure cada origem em `CHAT_PDF_ORIGINS`. Use URLs diretas e PDFs com texto selecionável. A consulta tem limite de 20 arquivos por pergunta e cada PDF pode ter até 12 MiB, 150 páginas e 250 mil caracteres extraídos. O chat avisa quando algum PDF fica fora da consulta. O arquivo `supabase/seed.sql` aponta para PDFs de exemplo. Use os materiais reais para validar respostas do minicurso.

A pergunta e os trechos selecionados são enviados pelo servidor ao modelo `openai/gpt-oss-20b` da Groq. Uma segunda chamada confere se a explicação é sustentada pelas citações. A chave fica no servidor e o plano gratuito tem limites de uso. Para validar, faça uma pergunta cuja resposta esteja em um PDF real e abra a página citada. Depois pergunte sobre um tema ausente do conteúdo.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
