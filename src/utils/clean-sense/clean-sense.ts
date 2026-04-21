/**
 * Options controlling which "empty" values are preserved during filtering.
 * By default, all listed value types are removed.
 */
export interface CleanOptions {
    /**
     * Preserve empty strings `""`.
     **/
    allowEmptyString?: boolean;

    /**
     * Preserve `NaN` values.
     **/
    allowNaN?: boolean;

    /**
     * Preserve `null` values.
     **/
    allowNull?: boolean;

    /**
     * Preserve strings equal to `"null"`.
     **/
    allowNullString?: boolean;

    /**
     * Preserve `undefined` values.
     **/
    allowUndefined?: boolean;

    /**
     * Preserve empty arrays `[]`.
     **/
    allowEmptyArray?: boolean;

    /**
     * Preserve empty objects `{}`.
     **/
    allowEmptyObject?: boolean;
}

/**
 * Arbitrary key/value bag passed to {@link CleanSense.process} and forwarded
 * to every function-based rule matcher.
 *
 * @example
 * // Typical Axios usage
 * cleaner.process(config.data, { url: config.url, method: config.method });
 */
export interface RuleContext {
    /**
     * Request URL or any string key to match against string / RegExp matchers.
     **/
    url?: string;
    [key: string]: unknown;
}

/**
 * Determines which requests a rule applies to.
 *
 * - **string** — matched against `ctx.url` after replacing `:param` segments
 *   with `[^/]+`, so `"/users/:id/posts"` matches `"/users/42/posts"`.
 * - **RegExp** — tested against `ctx.url ?? ""`.
 * - **function** — receives the full {@link RuleContext}; return `true` to apply
 *   the rule.
 *
 * @example
 * // String with path param
 * cleaner.addRule("/users/:id", { allowNull: true });
 *
 * // RegExp
 * cleaner.addRule(/^\/admin\//, { allowEmptyString: true });
 *
 * // Function — match by HTTP method
 * cleaner.addRule((ctx) => ctx.method === "PATCH", { allowNull: true });
 */
export type Matcher = string | RegExp | ((ctx: RuleContext) => boolean);

interface Rule {
    matcher: Matcher;
    options: CleanOptions;
}

function matchRule(matcher: Matcher, ctx: RuleContext): boolean {
    if (typeof matcher === "string") {
        if (!ctx.url) return false;
        const pattern = matcher.replace(/:[^/]+/g, "[^/]+");
        return new RegExp(`^${pattern}$`).test(ctx.url);
    }
    if (matcher instanceof RegExp) {
        return matcher.test(ctx.url ?? "");
    }
    return matcher(ctx);
}

function shouldDelete(value: unknown, opts: CleanOptions): boolean {
    if (value === undefined) return !opts.allowUndefined;
    if (value === null) return !opts.allowNull;

    if (typeof value === "string") {
        if (value.length === 0 && !opts.allowEmptyString) return true;
        if (value === "null" && !opts.allowNullString) return true;
    }

    if (typeof value === "number" && Number.isNaN(value) && !opts.allowNaN) {
        return true;
    }

    if (Array.isArray(value)) {
        return value.length === 0 && !opts.allowEmptyArray;
    }

    if (typeof value === "object" && value !== null) {
        return Object.keys(value).length === 0 && !opts.allowEmptyObject;
    }

    return false;
}

function filterInternal<T>(input: T, opts: CleanOptions): T {
    if (input === undefined || input === null || input instanceof FormData) {
        return input;
    }

    if (Array.isArray(input)) {
        return input
            .map((item) => {
                const processed =
                    typeof item === "object" && item !== null
                        ? filterInternal(item, opts)
                        : item;
                return shouldDelete(processed, opts) ? undefined : processed;
            })
            .filter((item) => item !== undefined) as T;
    }

    if (typeof input === "object") {
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(input as object)) {
            const processed =
                typeof value === "object" && value !== null
                    ? filterInternal(value, opts)
                    : value;

            if (!shouldDelete(processed, opts)) {
                result[key] = processed;
            }
        }

        if (shouldDelete(result, opts)) return undefined as T;
        return result as T;
    }

    return shouldDelete(input, opts) ? (undefined as T) : input;
}

/**
 * Recursively strips "empty" values from objects, arrays, and primitives,
 * with support for URL-based (or context-based) override rules.
 *
 * ---
 *
 * ### Quick start
 *
 * ```ts
 * const cleaner = new CleanSense({ allowNull: true })
 *   .addRule("/api/drafts/:id", { allowEmptyString: true })
 *   .addRule(/^\/admin\//, { allowEmptyObject: true });
 *
 * cleaner.process({ title: "", body: null }, { url: "/api/drafts/5" });
 * // → { body: null }  (title removed — empty string not allowed globally,
 * //                    but allowed by the matched rule → wait, rule wins)
 * // → { title: "", body: null }  ✓ rule allows empty strings for this URL
 * ```
 *
 * ---
 *
 * ### Option resolution order
 *
 * ```
 * constructor defaults
 *   ← overridden by each matching addRule(), in insertion order
 *      (last matching rule wins for any given option key)
 * ```
 *
 * ---
 *
 * ### Axios interceptor example
 *
 * ```ts
 * const cleaner = new CleanSense({ allowNull: true, allowEmptyArray: true })
 *   .addRule("/requisites/:id/fields/:fieldId", { allowEmptyString: true })
 *   .addRule("/requisites/:id/fields/:fieldId/items", { allowEmptyObject: true });
 *
 * export class AxiosFilter {
 *   static async interceptor(config: InternalAxiosRequestConfig) {
 *     config.data   = cleaner.process(config.data,   { url: config.url });
 *     config.params = cleaner.process(config.params);
 *     return config;
 *   }
 * }
 * ```
 */
export class CleanSense {
    private readonly globalOptions: CleanOptions;
    private readonly rules: Rule[] = [];

    /**
     * @param config - Default {@link CleanOptions} applied to every
     *   {@link process} call before any rule overrides are merged in.
     *   Omitting an option is equivalent to passing `false` (the value type
     *   will be removed).
     */
    constructor(config: CleanOptions = {}) {
        this.globalOptions = config;
    }

    /**
     * Registers a scoped override rule.
     *
     * When {@link process} is called, every registered rule whose matcher
     * returns `true` for the supplied {@link RuleContext} contributes its
     * options to the final resolved config.  Rules are evaluated in insertion
     * order; for any option key present in multiple matching rules the **last**
     * registered value wins.
     *
     * Returns `this` to allow fluent chaining.
     *
     * @param matcher - A {@link Matcher} that decides when this rule is active.
     * @param options - Partial {@link CleanOptions} to merge over the global
     *   defaults when the matcher fires.
     *
     * @example
     * cleaner
     *   .addRule("/drafts/:id", { allowEmptyString: true })
     *   .addRule((ctx) => ctx.method === "PATCH", { allowNull: true });
     */
    addRule(matcher: Matcher, options: CleanOptions): this {
        this.rules.push({ matcher, options });
        return this;
    }

    /**
     * Recursively filters empty values from `value` using the resolved options
     * for the given context.
     *
     * **Resolution order:**
     * 1. Global options passed to the constructor.
     * 2. Each matching rule's options, merged left-to-right in insertion order.
     *
     * `FormData` instances are returned as-is without any processing.
     *
     * @param value - The value to clean. May be a primitive, array, plain
     *   object, or `FormData`.
     * @param ctx - Optional {@link RuleContext} used to evaluate matchers.
     *   Typically `{ url: config.url }` in an Axios interceptor.
     * @returns The cleaned value with the same type as the input.
     *
     * @example
     * const result = cleaner.process(
     *   { name: "", age: null, tags: [] },
     *   { url: "/users/42" }
     * );
     */
    process<T = unknown>(value: T, ctx: RuleContext = {}): T {
        const matchedOptions = this.rules
            .filter((rule) => matchRule(rule.matcher, ctx))
            .reduce<CleanOptions>((acc, rule) => ({ ...acc, ...rule.options }), {});

        const resolvedOptions: CleanOptions = {
            ...this.globalOptions,
            ...matchedOptions,
        };

        return filterInternal(value, resolvedOptions);
    }
}