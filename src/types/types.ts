// biome-ignore lint/suspicious/noExplicitAny: this type is allow any type, because is the expected behavior
export type ExpectedAny = any;

/**
 * Represents a value that may be of type `T`, or `null`.
 */
export type Nullable<T> = T | null;

/**
 * Represents a value that may be of type `T`, or `null`, or `undefined`.
 */
export type Nullish<T> = Nullable<T> | undefined;

/**
 * Makes every property of `T` — including nested ones — optional.
 */
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
