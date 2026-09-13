import { type ValidatedModifierSelection } from "../catalog/modifier-selection.js";
import { type Money } from "../money/money.js";
import { type BrandId, type LocationId, type ProductId } from "../shared/identifier.js";
import { type SpecialInstructions } from "./instructions.js";
import { type CartLineKey } from "./line-key.js";

export const CART_LIFETIME_MILLISECONDS = 24 * 60 * 60 * 1_000;
export const MAX_CART_LINE_QUANTITY = 20;
export const MAX_CART_TOTAL_QUANTITY = 50;

export type CartLine = Readonly<{
  key: CartLineKey;
  brandId: BrandId;
  locationId: LocationId;
  productId: ProductId;
  modifierSelections: readonly ValidatedModifierSelection[];
  instructions?: SpecialInstructions;
  unitPrice: Money;
  quantity: number;
}>;

export type Cart = Readonly<{
  brandId: BrandId;
  locationId: LocationId;
  createdAt: number;
  expiresAt: number;
  lines: readonly CartLine[];
}>;

export type CartLineSubtotal = Readonly<{
  lineKey: CartLineKey;
  subtotal: Money;
}>;

export type CartTotals = Readonly<{
  totalQuantity: number;
  lineSubtotals: readonly CartLineSubtotal[];
  subtotal: Money;
}>;
