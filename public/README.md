# Arquivos estáticos

Tudo aqui é servido a partir da raiz do site. `public/foto.jpg` vira
`https://seusite.com/foto.jpg`.

Esta pasta precisa de pelo menos um arquivo versionado para existir no
repositório: o git não guarda diretório vazio, e sem isso a pasta some no
clone e no build do deploy.

## Pendente

| Arquivo | Onde aparece | Especificação |
|---|---|---|
| `sergio-ponte.jpg` | Seção "Quem estrutura a operação" | Quadrada (1:1), mínimo 600×600, JPG |

A seção da bio já está no ar. Enquanto o arquivo não estiver aqui, a página
mostra as iniciais "SP" em turquesa no lugar — não quebra nem exibe ícone de
imagem quebrada. Assim que o arquivo existir com esse nome exato, a foto
aparece sozinha, sem precisar mexer em código.

O recorte é `object-fit: cover` num quadro quadrado, então imagem muito
retangular perde as bordas.
