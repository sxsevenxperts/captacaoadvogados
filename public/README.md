# Arquivos estáticos

Tudo aqui é servido a partir da raiz do site. `public/foto.jpg` vira
`https://seusite.com/foto.jpg`.

Esta pasta precisa de pelo menos um arquivo versionado para existir no
repositório: o git não guarda diretório vazio, e sem isso a pasta some no
clone e no build do deploy.

## Arquivos

| Arquivo | Onde aparece | Especificação |
|---|---|---|
| `sergio-ponte.jpg` | Seção "Quem estrutura a operação" | 1080×1920 (9:16), JPG |

A foto é vertical e o quadro da bio é quadrado, então o recorte usa
`object-fit: cover` com `object-position: 50% 0%` — ancorado no topo, para não
cortar a cabeça. Ao trocar a foto por uma de proporção diferente, conferir esse
valor em `app/landing.css`.

Se o arquivo faltar, a página mostra as iniciais "SP" em turquesa no lugar: não
quebra nem exibe ícone de imagem quebrada.
