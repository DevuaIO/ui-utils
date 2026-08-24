import type { ZodType } from "zod";
import type { Nullish } from "@/types";

type Schemas = ReadonlyArray<Nullish<ZodType>>;

/**
 * Method decorator that validates arguments positionally against Zod schemas.
 * Pass `null`/`undefined` to skip a parameter.
 *
 * @remarks
 * Throws the original `ZodError` on failure. On a `@Tracked` method, or inside a
 * `contract` procedure, that error is caught, serialized and surfaced via
 * `useContract`.
 *
 * @example
 * ```ts
 * @Validate(userSchema)              createUser(data: User) {}
 * @Validate(null, idSchema)          update(ctx: Ctx, id: string) {}
 * ```
 *
 * @public
 */
export function Validate(...schemas: Schemas) {
  return <This, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Return,
    _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
  ) =>
    function (this: This, ...args: Args): Return {
      const validated = [...args] as unknown[];

      for (let i = 0; i < schemas.length; i++) {
        const schema = schemas[i];
        if (!schema) continue;
        validated[i] = schema.parse(args[i]);
      }

      return originalMethod.apply(this, validated as Args);
    };
}
