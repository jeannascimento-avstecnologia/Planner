// Posicao para ordenacao de colunas/cards.
// MVP/S2: substituir por fractional indexing real (lib fractional-indexing)
// para mover itens com 1 write O(1). Por ora gera chave monotonica estavel.
export function lexoPosition(): string {
  return "z" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
