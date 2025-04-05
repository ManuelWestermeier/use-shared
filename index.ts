import { useEffect, useRef, useState } from "react";

export function useShared<T>(key: string = "", defaultValue: T): [T, (newData: T | ((prev: T) => T)) => void] {
    const [data, setData] = useState<T>(defaultValue);
    const bcRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        bc.onmessage = (event: MessageEvent) => {
            setData(event.data);
        };

        return () => {
            bc.close();
        };
    }, [key]);

    const updateData = (newData: T | ((prev: T) => T)) => {
        if (!bcRef.current) return;

        if (typeof newData === "function") {
            setData((prev) => {
                const computedData = (newData as (prev: T) => T)(prev);
                bcRef.current?.postMessage(computedData);
                return computedData;
            });
        } else {
            bcRef.current.postMessage(newData);
            setData(newData);
        }
    };

    return [data, updateData];
}

export function effectShared(callback: () => void = () => undefined, keys: string[] = [""]): void {
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
