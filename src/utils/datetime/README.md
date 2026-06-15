# DateTime

Format a date as an absolute string or a relative time — timezone-aware, nullish-safe.

`DateTime.toFormatedDateTime` accepts a `Date` object or an ISO 8601 string and returns either a formatted absolute
timestamp (`dd.MM.yyyy HH:mm:ss`) or a locale-aware relative phrase ("in 2 hours", "3 days ago"). Nullish and invalid
inputs return `null` — no exceptions thrown.

---

## Quick start

```ts
import {DateTime} from "@devua-lab/ui-utils";

// absolute — default format
DateTime.toFormatedDateTime(new Date("2024-06-15T14:30:00Z"));
// → "15.06.2024 14:30:00"

// absolute — custom format
DateTime.toFormatedDateTime("2024-06-15T14:30:00Z", {format: "dd/MM/yyyy"});
// → "15/06/2024"

// relative
DateTime.toFormatedDateTime(new Date(Date.now() + 7200_000), {isRelative: true});
// → "in 2 hours"

// nullish input
DateTime.toFormatedDateTime(null);     // → null
DateTime.toFormatedDateTime(undefined); // → null
```

---

## API

### `DateTime.toFormatedDateTime(value, options?)`

```ts
static toFormatedDateTime(value: Nullish<Date | string>, options?: Options): string | null
```

- `value` — a `Date` object, an ISO 8601 string, or `null`/`undefined`. Returns `null` for nullish or unparseable input.
- `options` — optional formatting configuration (see below).
- Returns the formatted string, or `null` if the input is nullish or invalid.

### `Options`

| Option       | Type      | Default                     | Description                                                    |
|--------------|-----------|-----------------------------|----------------------------------------------------------------|
| `isRelative` | `boolean` | `false`                     | Format as relative time ("in 2 hours") instead of absolute.   |
| `locale`     | `string`  | `navigator.language`        | BCP 47 locale tag for relative formatting (e.g. `"de-DE"`).   |
| `format`     | `string`  | `"dd.MM.yyyy HH:mm:ss"`     | Format string for absolute output (see [tokens](#format-tokens)). |

#### Format tokens

| Token  | Part        | Example  |
|--------|-------------|----------|
| `yyyy` | Full year   | `2024`   |
| `MM`   | Month       | `06`     |
| `dd`   | Day         | `15`     |
| `HH`   | Hour (24h)  | `14`     |
| `mm`   | Minute      | `30`     |
| `ss`   | Second      | `00`     |

Tokens not present in the list are passed through unchanged, so `"yyyy-MM-dd"` and `"HH:mm"` both work as expected.

---

## Behavior reference

### Absolute output

Uses `Intl.DateTimeFormat` internally for correct timezone handling, then maps the parts onto the format string.

```ts
DateTime.toFormatedDateTime("2024-06-15T14:30:00Z");
// → "15.06.2024 14:30:00"

DateTime.toFormatedDateTime("2024-06-15T14:30:00Z", {format: "yyyy-MM-dd"});
// → "2024-06-15"

DateTime.toFormatedDateTime("2024-06-15T14:30:00Z", {format: "HH:mm"});
// → "14:30"
```

### Timezone

For absolute output, the timezone is read from `localStorage.getItem("timezone")` on the client. If the stored value is
`"default"` or not set, the local system timezone is used. On the server (no `window`) the system timezone applies.

If an unknown timezone string is stored and `Intl.DateTimeFormat` throws, the method retries without it; as a final
fallback it returns `date.toISOString()`.

### Relative output

Powered by `Intl.RelativeTimeFormat` with `{ numeric: "auto" }`, so short distances produce natural phrases
("yesterday", "last month") instead of numbers where the locale supports it.

```ts
// ~2 hours in the future
DateTime.toFormatedDateTime(new Date(Date.now() + 7200_000), {isRelative: true});
// → "in 2 hours"

// ~3 days ago
DateTime.toFormatedDateTime(new Date(Date.now() - 259200_000), {isRelative: true});
// → "3 days ago"

// custom locale
DateTime.toFormatedDateTime(new Date(Date.now() + 86400_000), {isRelative: true, locale: "de-DE"});
// → "morgen"
```

The unit is chosen by the largest non-zero distance: years → months → days → hours → minutes → seconds.

### Nullish and invalid input

Both nullish values and dates that fail to parse return `null` — nothing is thrown:

```ts
DateTime.toFormatedDateTime(null);           // → null
DateTime.toFormatedDateTime(undefined);      // → null
DateTime.toFormatedDateTime("not-a-date");   // → null
```

---

## Common use: conditional display

```ts
const label = DateTime.toFormatedDateTime(entity.createdAt) ?? "—";
```

```ts
// relative time with absolute fallback via title
<time title={DateTime.toFormatedDateTime(date) ?? ""}>
    {DateTime.toFormatedDateTime(date, {isRelative: true}) ?? "—"}
</time>
```
