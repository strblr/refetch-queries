# refetch-queries

Refetch Apollo queries anywhere by name and partial variables (ideal for refetching paginated queries).

## Description

This module serves as an extension for Apollo's mutation `refetchQueries` functionality. While this functionality is great and generally sufficient, it has shown some limitations when it comes to two cases :

- Refetching paginated / filtered queries.
- Refetching queries anywhere (not just after a mutation)

The first problem is solved by being able to target observable queries by partial variable match rather than deep equality. The second is solved by the fact you'll basically be given a function that you can call from anywhere.

## Exports and signatures

```typescript
export type QueryTarget = string | {
  query: string | DocumentNode;
  variables?: Record<string, any>
};

export default function refetchQueries(
  client: ApolloClient<any>,
  targets: QueryTarget[]
): Promise<ApolloQueryResult<any>[]>
```

(`refetchQueries` returns a promise that resolves to the array of all the refetched query results.)

## Example

Let's say you have the following query being made :

```javascript
const TodosQuery = gql`
  query Todos($list: ID!, $limit: Int!, $page: Int!) {
    todos(list: $list, limit: $limit, page: $page)
      @connection(key: "todos", filter: ["list"]) {
      id
      label
    }
  }
`;

useQuery(TodosQuery);
```

Now, you want to refetch the query after a mutation, but without keeping track of secondary variables like `limit` and `page`. The following does not work because of missing variables :

```javascript
const addTodo = useMutation(AddTodoMutation, {
  refetchQueries: [
    {
      query: TodosQuery,
      variables: { list: "1" }
    }
  ]
});
```

The following works but is not ideal if you have several rendered `Todos` queries with a different `list` argument and don't want to refetch them all :

```javascript
const addTodo = useMutation(AddTodoMutation, {
  refetchQueries: ["Todos"]
});
```

## Solution

Import the refetch function and call it after the mutation is done :

```javascript
import refetchQueries from 'refetch-queries'

const client = useApolloClient();

const addTodo = useMutation(AddTodoMutation, {
  onCompleted() {
    refetchQueries(client, [
      {
        query: TodosQuery,
        variables: { list: "1" }
      }
    ])
  } 
});
```

You can of course refetch by name :

```javascript
refetchQueries(client, ["Todos"])
```

And even :

```javascript
refetchQueries(client, [
  {
    query: "Todos",
    variables: { list: "1" }
  }
])
```

