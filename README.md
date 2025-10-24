# extratos-comprovantes

Projeto Next.js com exemplo de como fazer uma requisição GET que utiliza uma chave de API armazenada em variáveis de ambiente.

Passos rápidos:

1. Copie o exemplo de ambiente:

	- Renomeie `.env.local.example` para `.env.local`.
	- Preencha `API_KEY` com sua chave real.

2. Opcional: ajuste `API_BASE_URL` e `API_PATH` no `.env.local` se quiser apontar para outro endpoint.

3. Rode o servidor de desenvolvimento:

```
npm install
npm run dev
```

4. Abra http://localhost:3000 — a página inicial chama `/api/proxy` que injeta a chave do servidor e repassa a resposta.

Segurança:

- Nunca commit seu `.env.local` com chaves reais.
- A requisição externa com a chave é feita pelo servidor (rota `/api/proxy`), assim a chave não é exposta ao cliente.

Como adaptar:

- Você pode mover a lógica para um helper em `lib/` ou usar `app` server components para buscar diretamente o endpoint externo.
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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
