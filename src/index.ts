import { DocumentNode } from "graphql";
import ApolloClient, { ObservableQuery } from "apollo-client";
import { getOperationName } from "apollo-utilities";
import isMatch from "lodash/isMatch";
import isString from "lodash/isString";

export type QueryTarget =
  | string
  | { query: string | DocumentNode; variables?: Record<string, any> };

export default function refetchQueries(client: ApolloClient<any>, targets: QueryTarget[]) {
  const observableQueries: ObservableQuery[] = [];
  (client as any).queryManager.queries.forEach((query: any) => {
    if (query.observableQuery) {
      const obs: ObservableQuery = query.observableQuery;
      for (const target of targets)
        if (isString(target)) target === obs.queryName && observableQueries.push(obs);
        else {
          const name = isString(target.query)
            ? target.query
            : getOperationName(target.query);
          name === obs.queryName &&
          isMatch(obs.variables, target.variables ?? {}) &&
          observableQueries.push(obs)
        }
    }
  });
  return Promise.all(observableQueries.map(obs => obs.refetch()))
}