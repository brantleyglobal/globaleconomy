import { GenericContractsDeclaration } from "~~/utils/globalEco/contract";

/**
 * @example
 * const externalContracts = {
 *   1: {
 *     DAI: {
 *       address: "0x...",
 *       abi: [...],
 *     },
 *   },
 * } as const;
 */
const externalContracts = {} as const;

export default externalContracts satisfies GenericContractsDeclaration;
