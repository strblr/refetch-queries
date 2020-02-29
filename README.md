# refetch-queries

Refetch Apollo queries by name and partial variables (ideal for refetching paginated queries).

## Description

This module serves as a replacement for Apollo's mutation `refetchQueries` functionality. While this functionality is great and generally sufficient, it has shown some limitations when it comes to refetching paginated / filtered queries.

Basically, you would be able to do two things :

- Refetching all the queries with the same operation name ;
- Refetching a specific query, targeted by a GraphQL document and a set of variables.

But with complex paginated / filtered queries, you might not know nor want to keep track of the "secondary" variables (`page`, `limit`, `offset`, etc.) but still want to target a specific query. Updating the cache manually with `update` might not always be possible.

This is a common demand :

- [(stackoverflow) how to match queries with apollo's refetchQuery](https://stackoverflow.com/questions/55306424/how-to-match-queries-with-apollos-refetchquery)
- [(stackoverflow) React Apollo: Update lists cache (with variables) when new item is added](https://stackoverflow.com/questions/54522503/react-apollo-update-lists-cache-with-variables-when-new-item-is-added)
- [(stackoverflow) How to update a paginated list after a mutation?](https://stackoverflow.com/questions/48242062/how-to-update-a-paginated-list-after-a-mutation)
- [(stackoverflow) Deleting Apollo Client cache for a given query and every set of variables](https://stackoverflow.com/questions/48596265/deleting-apollo-client-cache-for-a-given-query-and-every-set-of-variables)
- [(medium) How to invalidate cached data in Apollo and handle updating paginated queries](https://medium.com/@martinseanhunt/how-to-invalidate-cached-data-in-apollo-and-handle-updating-paginated-queries-379e4b9e4698)
- [(github) [Feat] refetchQueries with "reuse variables" option](https://github.com/apollographql/react-apollo/issues/817)

This module solves the issue by allowing to find queries by **partial** variables and refetch them.

## Problem

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

The following works but is not ideal if you have several rendered `Todos` queries with a different `list` value and don't want to refetch them all :

```javascript
const addTodo = useMutation(AddTodoMutation, {
  refetchQueries: ["Todos"]
});
```

## Solution

#### Step 1 - Use this module's `useQuery` instead of Apollo's.

This module exports a `useQuery` hooks that has the exact same signature as Apollo's `useQuery`, and basically does the same thing except that it stores some informations as a side-effect on each query.

```javascript
import { useQuery } from "refetch-queries";

useQuery(TodosQuery, {
  variables: {
    list: "1",
    limit: 10,
    page: 1
  }
  // all options from Apollo's useQuery are compatible
});
```

#### Step 2 - Use the `refetchQueries` function to refetch by partial variables

```javascript
import { refetchQueries } from "refetch-queries";

const addTodo = useMutation(AddTodoMutation, {
  onCompleted() {
    refetchQueries([
      {
        query: TodosQuery,
        variables: { list: "1" }
      }
    ]);
  }
});
```

And that's it.

Please note that what's possible with Apollo's `refetchQueries` is also possible with this function. So, the following works too and refetches all `Todos` queries :

```javascript
import { refetchQueries } from "refetch-queries";

const addTodo = useMutation(AddTodoMutation, {
  onCompleted() {
    refetchQueries(["Todos"]);
  }
});
```

Also note that you can wait on all the queries being refetched (`refetchQueries` returns a `Promise`) :

```javascript
const addTodo = useMutation(AddTodoMutation, {
  onCompleted() {
    refetchQueries([
      "Todos",
      "OtherQuery",
      {
        query: YetAnotherQuery,
        variables: { id: "2" }
      }
    ]).then(() => {
      console.log("Everything is up-to-date");
    });
  }
});
```

Enjoy.
