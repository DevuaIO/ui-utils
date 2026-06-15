# @devua-lab/ui-utils

A collection of utilities, decorators, React hooks, and TypeScript types for building consistent, predictable application layers.

---

## Installation

```bash
npm install @devua-lab/ui-utils
```
```bash
yarn add @devua-lab/ui-utils
```
```bash
pnpm add @devua-lab/ui-utils
```

---

## Utils

| Name | Description |
| :--- | :--- |
| **[CleanSense](./src/utils/clean-sense)** | Recursive empty-value filter with context-aware rule overrides. |
| **[diff](./src/utils/diff)** | Structural diff that returns only what changed, keeping arrays whole. |
| **[Enums](./src/utils/enums)** | Extracts a TypeScript enum into a clean `{ key, value }[]` without reverse-mapping noise. |
| **[error-serialization](./src/utils/error-serialization)** | Standardized error serialization pipeline for Zod, Axios, and native errors. |
| **[Money](./src/utils/money)** | Cents ↔ float conversion — precise, nullish-safe, string-aware. |
| **[DateTime](./src/utils/datetime)** | Format a date as an absolute string or a relative time — timezone-aware, nullish-safe. |

---

## React

| Name | Description |
| :--- | :--- |
| **[useContract](./src/react/hooks/useContract)** | Runs an async procedure as a tracked unit with automatic error serialization. |
| **[useDebounce](./src/react/hooks/useDebounce)** | Debounced state — an immediate value plus a copy that lags behind until updates pause. |
| **[useEvent](./src/react/hooks/useEvent)** | A tiny keyed event bus on zustand to emit payloads from anywhere and subscribe in React. |
| **[usePing](./src/react/hooks/usePing)** | Payload-less event bus to bump a counter so consumers re-run, refetch, or re-render. |
| **[useThrottle](./src/react/hooks/useThrottle)** | Throttled state — an immediate value plus a copy that updates at most once per interval. |
| **[useViewport](./src/react/hooks/useViewport)** | Reactive mobile breakpoint — returns `true` when the viewport is at or below a given width. |

---

## Decorator

| Name | Description |
| :--- | :--- |
| **[@Tracked](./src/decorator/Tracked)** | Tags a function with a stable contract ID and serializer for `useContract` integration. |
| **[@Validate](./src/decorator/Validate)** | Validates a method's arguments positionally against Zod schemas before execution. |

---

## Types

| Name | Description |
| :--- | :--- |
| **[DeepPartial](./src/types/DeepPartial)** | Recursively makes every property optional, preserving arrays and tuples whole. |
| **[ExpectedAny](./src/types/ExpectedAny)** | An intentional, lint-safe escape hatch for `any`. |
| **[Nullable](./src/types/Nullable)** | A value that may be of type `T` or explicitly `null`. |
| **[Nullish](./src/types/Nullish)** | A value that may be of type `T`, `null`, or `undefined`. |
