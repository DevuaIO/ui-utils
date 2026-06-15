# Money

Cents ↔ float conversion — precise, nullish-safe, string-aware.

`Money.toCents` and `Money.fromCents` move between a floating-point amount (e.g. `12.34`) and its integer cents
representation (`1234`). Both methods accept strings and nullish values, returning `NaN` for anything that can't be
converted — so callers can guard with a single `Number.isNaN` check instead of validating before every call.

---

## Quick start

```ts
import {Money} from "@devua-lab/ui-utils";

Money.toCents(12.34);    // → 1234
Money.fromCents(1234);   // → 12.34

// string input
Money.toCents("12.34");  // → 1234
Money.fromCents("1234"); // → 12.34

// nullish input
Money.toCents(null);     // → NaN
Money.fromCents(null);   // → NaN
```

---

## API

### `Money.fromCents(amount, precision?)`

```ts
static fromCents(amount: Nullish<number | string>, precision?: number): number
```

Converts a cents value to a floating-point number.

- `amount` — cents as a number or numeric string. `null` and `undefined` return `NaN`.
- `precision` — decimal places in the result. Defaults to `2`.
- Returns the converted float, or `NaN` if `amount` is nullish or not a valid number.

```ts
Money.fromCents(1234);       // → 12.34
Money.fromCents(1234, 0);    // → 12
Money.fromCents(1234, 4);    // → 12.3400
Money.fromCents("1234");     // → 12.34
Money.fromCents("abc");      // → NaN
Money.fromCents(undefined);  // → NaN
```

### `Money.toCents(amount)`

```ts
static toCents(amount: Nullish<number | string>): number
```

Converts a floating-point amount to cents, rounded to the nearest integer.

- `amount` — a float or numeric string. `null` and `undefined` return `NaN`.
- Returns the amount in cents as an integer, or `NaN` if `amount` is nullish or not a valid number.

```ts
Money.toCents(12.34);      // → 1234
Money.toCents(12.345);     // → 1235  (Math.round)
Money.toCents("12.34");    // → 1234
Money.toCents("abc");      // → NaN
Money.toCents(null);       // → NaN
```

---

## Behavior reference

### Rounding

`toCents` uses `Math.round`, so half-cent values round up:

```ts
Money.toCents(12.345); // → 1235
Money.toCents(12.344); // → 1234
```

`fromCents` uses `Number.toFixed(precision)` and converts back to a number, so trailing zeros are dropped:

```ts
Money.fromCents(1000, 2); // → 10     (not 10.00)
Money.fromCents(1001, 2); // → 10.01
```

### String input

Both methods parse strings with `Number.parseFloat`. Strings that are not valid numbers return `NaN`:

```ts
Money.toCents("12.34abc"); // → 1234  (parseFloat stops at the first non-numeric character)
Money.toCents("abc12.34"); // → NaN
```

### Nullish input

`null` and `undefined` always return `NaN` — no exception is thrown:

```ts
Money.toCents(null);      // → NaN
Money.toCents(undefined); // → NaN
Money.fromCents(null);    // → NaN
Money.fromCents(undefined); // → NaN
```

Guard with `Number.isNaN` before displaying:

```ts
const value = Money.fromCents(raw);
if (Number.isNaN(value)) return "—";
return value.toLocaleString();
```

---

## Common use: round-trip

```ts
const cents = Money.toCents(12.34);    // 1234  — store / send to API
const float = Money.fromCents(cents);  // 12.34 — display to user
```
