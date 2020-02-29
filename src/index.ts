import { useEffect, useRef } from "react";
import { ApolloQueryResult, PureQueryOptions } from "apollo-client";
import { getOperationName } from "apollo-utilities";
import {
  useQuery as useQueryBase,
  QueryHookOptions
} from "@apollo/react-hooks";
import { OperationVariables } from "@apollo/react-common";
import { DocumentNode } from "graphql";
import { isEqual, isMatch, isString } from "lodash";

// Types

type Store = Record<string, QueryInfo[]>;

type QueryInfo = {
  variables: OperationVariables;
  refetch(variables?: OperationVariables): Promise<ApolloQueryResult<any>>;
};

// The store

const refetchStore: Store = Object.create(null);

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

// refetchQueries function

export function refetchQueries(
  queries: (string | PureQueryOptions)[]
): Promise<void> {
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

// Utils

function useMemoizedVariables(variables: OperationVariables) {
  const mem = useRef<OperationVariables>();
  if (!isEqual(mem.current, variables)) mem.current = variables;
  return mem.current!;
}
