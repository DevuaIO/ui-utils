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

## Utils

| Name | Description |
| :--- | :--- |
| **[CleanSense](./src/utils/clean-sense/README.md)** | Recursive empty-value filter with context-aware rule overrides. |
| **[diff](./src/utils/diff/README.md)** | Structural diff that returns only what changed, keeping arrays whole. |
| **[Enums](./src/utils/enums/README.md)** | Extracts a TypeScript enum into a clean `{ key, value }[]` without reverse-mapping noise. |
| **[error-serialization](./src/utils/error-serialization/README.md)** | Standardized error serialization pipeline for Zod, Axios, and native errors. |

## React

| Name | Description |
| :--- | :--- |
| **[useContract](./src/react/hooks/useContract/README.md)** | Runs an async procedure as a tracked unit with automatic error serialization. |
| **[useDebounce](./src/react/hooks/useDebounce/README.md)** | Debounced state — an immediate value plus a copy that lags behind until updates pause. |
| **[useEvent](./src/react/hooks/useEvent/README.md)** | A tiny keyed event bus on zustand to emit payloads from anywhere and subscribe in React. |
| **[usePing](./src/react/hooks/usePing/README.md)** | Payload-less event bus to bump a counter so consumers re-run, refetch, or re-render. |
| **[useThrottle](./src/react/hooks/useThrottle/README.md)** | Throttled state — an immediate value plus a copy that updates at most once per interval. |

## Decorator

| Name | Description |
| :--- | :--- |
| **[@Tracked](./src/decorator/Tracked/README.md)** | Tags a function with a stable contract ID and serializer for `useContract` integration. |
| **[@Validate](./src/decorator/Validate/README.md)** | Validates a method's arguments positionally against Zod schemas before execution. |

## Types

| Name | Description |
| :--- | :--- |
| **[DeepPartial](./src/types/DeepPartial/README.md)** | Recursively makes every property optional, preserving arrays and tuples whole. |
| **[ExpectedAny](./src/types/ExpectedAny/README.md)** | An intentional, lint-safe escape hatch for `any`. |
| **[Nullable](./src/types/Nullable/README.md)** | A value that may be of type `T` or explicitly `null`. |
| **[Nullish](./src/types/Nullish/README.md)** | A value that may be of type `T`, `null`, or `undefined`. |
