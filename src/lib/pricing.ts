import "server-only";
import { getProduct } from "./products-store";
import type { CartLine } from "./cart";

/** Сумма заказа считается ТОЛЬКО на сервере из каталога — суммам с клиента не верим. */
export async function computeTotalRub(lines: CartLine[]): Promise<number> {
  let total = 0;
  for (const line of lines) {
    const product = await getProduct(line.productId);
    if (!product) continue;
    const qty = Math.min(Math.max(Math.trunc(line.qty), 1), 9);
    total += product.priceRub * qty;
  }
  return total;
}

/** InvId: положительный int32, монотонный (секунды с 2026-01-01 + счётчик в пределах секунды). */
const EPOCH_2026 = Date.UTC(2026, 0, 1) / 1000;
let lastInvId = 0;
export function nextInvId(): number {
  const candidate = Math.floor(Date.now() / 1000 - EPOCH_2026);
  lastInvId = candidate > lastInvId ? candidate : lastInvId + 1;
  return lastInvId;
}
