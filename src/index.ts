import { useCallback, useEffect, useRef } from "react";
import { DocumentNode } from "graphql";
import { ApolloQueryResult, PureQueryOptions } from "apollo-client";
import { getOperationName } from "apollo-utilities";
import {
  MutationHookOptions,
  MutationTuple,
  useMutation as useMutationBase,
  useQuery as useQueryBase,
  QueryHookOptions
} from "@apollo/react-hooks";
import {
  ExecutionResult,
  MutationFunctionOptions,
  MutationResult,
  OperationVariables
} from "@apollo/react-common";
import isEqual from "lodash/isEqual";
import isMatch from "lodash/isMatch";
import isString from "lodash/isString";

// Types

export type QueryTargets = (string | PureQueryOptions)[];

export type ExtendedMutationHookOptions<
  TData = any,
  TVariables = OperationVariables
> = MutationHookOptions<TData, TVariables> & {
  refetchQueriesMatch?: QueryTargets;
};

export type ExtendedMutationFunctionOptions<
  TData = any,
  TVariables = OperationVariables
> = MutationFunctionOptions<TData, TVariables> & {
  refetchQueriesMatch?: QueryTargets;
};

export type ExtendedMutationTuple<TData, TVariables> = [
  (
    options?: ExtendedMutationFunctionOptions<TData, TVariables>
  ) => Promise<ExecutionResult<TData>>,
  MutationResult<TData>
];

// The store

const refetchStore: Record<string, QueryInfo[]> = Object.create(null);

// useQuery hook

export function useQuery<TData = any, TVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>
) {
  const result = useQueryBase(query, options);
  const name = getOperationName(query)!;
  const variables = useMemoizedVariables(options?.variables || {});

  useEffect(() => {
    if (!(name in refetchStore)) refetchStore[name] = [];
    const infos = refetchStore[name];
    const info = {
      variables,
      refetch: result.refetch
    };
    infos.push(info);
    return () => {
      infos.splice(infos.indexOf(info), 1);
    };
  }, [name, variables, result.refetch]);

  return result;
}

// useMutation hook

export function useMutation<TData = any, TVariables = OperationVariables>(
  mutation: DocumentNode,
  options?: ExtendedMutationHookOptions<TData, TVariables>
): ExtendedMutationTuple<TData, TVariables> {
  const { refetchQueriesMatch, onCompleted, ...baseOptions } = options || {};
  const [baseCallback, result] = useMutationBase(mutation, {
    ...baseOptions,
    onCompleted(data) {
      refetchQueriesMatch && refetchQueries(refetchQueriesMatch);
      return onCompleted && onCompleted(data);
    }
  });

  const callback = useCallback(
    (options?: ExtendedMutationFunctionOptions<TData, TVariables>) => {
      const { refetchQueriesMatch, ...baseOptions } = options || {};
      return baseCallback(baseOptions).then(result => {
        refetchQueriesMatch && refetchQueries(refetchQueriesMatch);
        return result;
      });
    },
    [baseCallback]
  );

  return [callback, result];
}

// Utils

type QueryInfo = {
  variables: OperationVariables;
  refetch(variables?: OperationVariables): Promise<ApolloQueryResult<any>>;
};

function useMemoizedVariables(variables: OperationVariables) {
  const mem = useRef<OperationVariables>();
  if (!isEqual(mem.current, variables)) mem.current = variables;
  return mem.current!;
}

function refetchQueries(queries: QueryTargets): Promise<void> {
  return Promise.all(
    queries.map(query => {
      if (isString(query)) {
        if (query in refetchStore)
          return Promise.all(
            refetchStore[query].map(({ refetch }) => refetch())
          );
      } else {
        const name = getOperationName(query.query)!;
        if (name in refetchStore)
          return Promise.all(
            refetchStore[name]
              .filter(({ variables }) =>
                isMatch(variables, query.variables || {})
              )
              .map(({ refetch }) => refetch())
          );
      }
      return Promise.resolve(undefined);
    })
  ).then(() => undefined);
}
