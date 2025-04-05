import { useEffect, useRef, useState } from "react";

// Generic type for shared state
export function useShared<T>(key: string = "", defaultValue: T): [T, (newData: T | ((prev: T) => T)) => void] {
    const [data, setData] = useState<T>(defaultValue);
    const bcRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        bc.onmessage = (event: MessageEvent) => {
            if (event.data.type === "set") {
                setData(event.data.data as T);
            }
            if (event.data.type === "get") {
                bc.postMessage({
                    type: "set",
                    data,
                });
            }
        };

        return () => bc.close();
    }, [key]);

    const updateData = (newData: T | ((prev: T) => T)) => {
        if (!bcRef.current) return;

        if (typeof newData === "function") {
            setData((prev) => {
                const computedData = (newData as (prev: T) => T)(prev);
                bcRef.current?.postMessage({ type: "set", data: computedData });
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
