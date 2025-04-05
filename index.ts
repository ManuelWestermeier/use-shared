import { useEffect, useRef, useState } from "react";

type UpdateFunction<T> = (prev: T) => T;
type SetData<T> = T | UpdateFunction<T>;

export function useShared<T>(key: string = "", defaultValue: T): [T, (newData: SetData<T>) => void] {
    const [data, setData] = useState<T>(defaultValue);
    const bcRef = useRef<BroadcastChannel | null>(null);
    const dataRef = useRef<T>(data);

    // Keep dataRef in sync with data state.
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        bc.onmessage = (event) => {
            if (event.data.type === "set") {
                setData(event.data.data);
            }
            if (event.data.type === "get") {
                bc.postMessage({
                    type: "set",
                    data: dataRef.current,
                });
            }
        };

        return () => bc.close();
    }, [key]);

    const updateData = (newData: SetData<T>): void => {
        if (!bcRef.current) return;

        if (typeof newData === "function") {
            setData((prev: T) => {
                // Type assertion here is safe since we checked if newData is a function.
                const computedData = (newData as UpdateFunction<T>)(prev);
                bcRef.current!.postMessage({ type: "set", data: computedData });
                return computedData;
            });
        } else {
            bcRef.current.postMessage({ type: "set", data: newData });
            setData(newData);
        }
    };

    return [data, updateData];
}

export function effectShared(callback: () => void = () => undefined, keys: string[] = [""]) {
    const channelsRef = useRef<BroadcastChannel[]>([]);

    useEffect(() => {
        channelsRef.current = keys.map((key) => {
            const channel = new BroadcastChannel(key);
            channel.onmessage = () => {
                callback();
            };
            return channel;
        });

        return () => {
            channelsRef.current.forEach((channel) => channel.close());
        };
    }, [keys, callback]);
}
