import type { paths } from './generated';
import type { ApiClient, ApiRequestOptions } from './transport';

type ContractMethod = 'get' | 'post' | 'patch' | 'delete';
type ContractPath = keyof paths & string;

type PathForMethod<Method extends ContractMethod> = {
  [Path in ContractPath]: NonNullable<paths[Path][Method]> extends never ? never : Path;
}[ContractPath];

type StripApiPrefix<Path extends string> = Path extends `/api/v1${infer Relative}` ? Relative : never;

type ExpandPathParameters<Path extends string> =
  Path extends `${infer Prefix}{${string}}${infer Suffix}`
    ? `${Prefix}${string}${ExpandPathParameters<Suffix>}`
    : Path;

type RuntimePath<Path extends ContractPath> =
  | ExpandPathParameters<StripApiPrefix<Path>>
  | `${ExpandPathParameters<StripApiPrefix<Path>>}?${string}`;

type TrialOnlyPostPath = `/test/payments/${string}/${'confirm' | 'fail'}`;

export type ContractRequestPath<Method extends ContractMethod> =
  | RuntimePath<PathForMethod<Method>>
  // Trial payment controllers are deliberately absent from production OpenAPI generation.
  | (Method extends 'post' ? TrialOnlyPostPath : never);

/**
 * Restricts feature requests to endpoint and method combinations emitted by OpenAPI.
 * Response JSON stays unknown by default because it must still cross a runtime Zod boundary.
 */
export interface ContractApiClient {
  get<
    Response = unknown,
    Path extends ContractRequestPath<'get'> = ContractRequestPath<'get'>,
  >(
    path: Path,
    options?: Omit<ApiRequestOptions, 'body'>,
  ): Promise<Response>;
  post<
    Response = unknown,
    Path extends ContractRequestPath<'post'> = ContractRequestPath<'post'>,
  >(
    path: Path,
    body?: unknown,
    options?: Omit<ApiRequestOptions, 'body'>,
  ): Promise<Response>;
  patch<
    Response = unknown,
    Path extends ContractRequestPath<'patch'> = ContractRequestPath<'patch'>,
  >(
    path: Path,
    body?: unknown,
    options?: Omit<ApiRequestOptions, 'body'>,
  ): Promise<Response>;
  delete<
    Response = unknown,
    Path extends ContractRequestPath<'delete'> = ContractRequestPath<'delete'>,
  >(
    path: Path,
    options?: ApiRequestOptions,
  ): Promise<Response>;
}

export function createContractApiClient(client: ApiClient): ContractApiClient {
  return {
    get: (path, options) => client.get(path, options),
    post: (path, body, options) => client.post(path, body, options),
    patch: (path, body, options) => client.patch(path, body, options),
    delete: (path, options) => client.delete(path, options),
  };
}
