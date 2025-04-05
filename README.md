# USE ASCNY SHARED

Install

```bash
npm i use-ashared
```

Exemple

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
