import type { Nullish } from "@/types";

export class Money {
  /**
   * Converts a value from cents to a floating-point number with the specified precision, handling nullish values and strings.
   *
   * @description
   * ```ts
   * const input = 1234;
   * const output = Money.fromCents(input, 2);
   * console.log(output); // 12.34
   *
   * const input2 = "1234";
   * const output2 = Money.fromCents(input2, 2);
   * console.log(output2); // 12.34
   *
   * const input3 = null;
   * const output3 = Money.fromCents(input3, 2);
   * console.log(output3); // NaN
   * ```
   *
   * @param amount - The value to convert.
   * @param [precision] - The number of decimal places to include.
   * @returns The amount as a floating-point number, or NaN if the input is nullish or invalid.
   */
  public static fromCents(amount: Nullish<number | string>, precision: number = 2): number {
    if (typeof amount !== "number" && typeof amount !== "string") {
      return NaN;
    }

    if (typeof amount === "number") {
      return Money.unsafe_fromCents(amount, precision);
    }

    const parsed = Number.parseFloat(amount);

    if (Number.isNaN(parsed)) {
      return NaN;
    }

    return Money.unsafe_fromCents(parsed, precision);
  }

  /**
   * Converts a value to an amount in cents, handling nullish values and strings.
   *
   * @description
   * ```ts
   * const input = "12.34";
   * const output = Money.toCents(input);
   * console.log(output); // 1234
   *
   * const input2 = 12.34;
   * const output2 = Money.toCents(input2);
   * console.log(output2); // 1234
   *
   * const input3 = null;
   * const output3 = Money.toCents(input3);
   * console.log(output3); // NaN
   * ```
   *
   * @param amount - The value to convert.
   * @returns The amount in cents, or NaN if the input is nullish or invalid.
   */
  public static toCents(amount: Nullish<number | string>): number {
    if (typeof amount !== "number" && typeof amount !== "string") {
      return NaN;
    }

    if (typeof amount === "number") {
      return Money.unsafe_toCents(amount);
    }

    const parsed = Number.parseFloat(amount);

    if (Number.isNaN(parsed)) {
      return NaN;
    }

    return Money.unsafe_toCents(parsed);
  }

  /**
   * Converts an amount in cents to a floating-point number with the specified precision.
   *
   * @param amount - The amount in cents.
   * @param precision - The number of decimal places to include.
   * @returns The amount as a floating-point number.
   */
  private static unsafe_fromCents(amount: number, precision: number): number {
    return Number((amount / 100).toFixed(precision));
  }

  /**
   * Converts a floating-point number to an amount in cents.
   *
   * @param amount - The amount as a floating-point number.
   * @returns The amount in cents.
   */
  private static unsafe_toCents(amount: number): number {
    return Math.round(amount * 100);
  }
}
