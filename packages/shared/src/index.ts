/**
 * @mango/shared — main entry.
 *
 * Exports the hand-written, framework-agnostic pieces of the contract:
 *   - Setu status vocabulary + classifier (used by api and web)
 *   - zod form schemas (used by web forms only)
 *
 * The wire request/response types are generated from the NestJS OpenAPI spec and
 * live behind the separate `@mango/shared/api` entry point.
 */
export * from './setu-status';
export * from './forms/upload-contract';
