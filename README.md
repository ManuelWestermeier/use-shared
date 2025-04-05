# USE ASCNY SHARED

A simple React hook for sharing state across browser tabs using the BroadcastChannel API.

## Installation

Install via npm:

```bash
npm i use-ashared
```

## Example

### JavaScript Example

```js
import { useShared, effectShared } from "use-ashared";

function Count() {
  const [count] = useShared("count", 0);

  return <div>Count: {count}</div>;
}

function IncreaseButton() {
  const [_, setCount] = useShared("count", 0);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Increase Counter</button>
    </div>
  );
}

export default function App() {
  const [count, setCount] = useShared("count", 0);

  effectShared(() => {
    console.log("count", count);
  }, ["count"]);

  return (
    <div>
      <Count />
      <IncreaseButton />
    </div>
  );
}
```

### TypeScript Example

```ts
import React from "react";
import { useShared, effectShared } from "use-ashared";

function Count(): JSX.Element {
  const [count] = useShared<number>("count", 0);

  return <div>Count: {count}</div>;
}

function IncreaseButton(): JSX.Element {
  const [_, setCount] = useShared<number>("count", 0);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Increase Counter</button>
    </div>
  );
}

export default function App(): JSX.Element {
  const [count, setCount] = useShared<number>("count", 0);

  effectShared(() => {
    console.log("count", count);
  }, ["count"]);

  return (
    <div>
      <Count />
      <IncreaseButton />
    </div>
  );
}
```
