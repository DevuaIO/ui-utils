import type { ExpectedAny } from "@/types";

/**
 * Describes the shape of a single key-value pair extracted from an enum.
 */
type ExtractOutput = {
  /**
   * The string key of the enum member (e.g., "Pending").
   **/
  key: string;
  /**
   * The assigned value of the enum member (e.g., 0 or "PENDING").
   **/
  value: number | string;
};

/**
 * A utility class providing static methods for working with TypeScript enums.
 */
export class Enums {
  /**
   * Extracts the key-value pairs from a TypeScript enum into a structured array.
   *
   * This method correctly handles the reverse mapping that TypeScript creates for
   * numeric enums (e.g., `{ 0: "Pending", Pending: 0 }`), ensuring that only
   * the intended string keys are included in the output.
   *
   * @param {ExpectedAny} target The enum object to extract values from.
   * @returns {ExtractOutput[]} An array of `{ key, value }` objects representing the enum members.
   *
   * @example
   * // For a numeric enum
   * enum Status { Pending, Approved }
   * const statusArray = Enums.extract(Status);
   * // statusArray is: [{ key: 'Pending', value: 0 }, { key: 'Approved', value: 1 }]
   *
   * // For a string enum
   * enum Direction { Up = "UP", Down = "DOWN" }
   * const directionArray = Enums.extract(Direction);
   * // directionArray is: [{ key: 'Up', value: 'UP' }, { key: 'Down', value: 'DOWN' }]
   */
  public static extract(target: ExpectedAny): ExtractOutput[] {
    if (typeof target !== "object") {
      return [];
    }

    const keys = Object.keys(target);
    const output = [];

    // Filter out the numeric keys that TypeScript adds for numeric enum reverse mapping.
    const filteredKeys = keys.filter((key) => Number.isNaN(Number(key)));

    for (let i = 0; i < filteredKeys.length; i++) {
      output.push({
        key: filteredKeys[i],
        value: target[filteredKeys[i]],
      });
    }

    return output;
  }
}
