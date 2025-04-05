import { useEffect, useRef, useState } from "react";

// Type for messages sent via BroadcastChannel
type SharedMessage<T> =
    | { type: "set"; data: T; sender: string }
    | { type: "get"; sender: string };

// useShared hook with sender isolation
export function useShared<T>(
    key: string = "",
    defaultValue: T
): [T, (newData: T | ((prev: T) => T)) => void] {
    const [data, setData] = useState<T>(defaultValue);
    const hookId = useRef<string>(crypto.randomUUID());
    const bcRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        bc.onmessage = (event: MessageEvent<SharedMessage<T>>) => {
            if (event.data.sender === hookId.current) return;

            if (event.data.type === "set") {
                setData(event.data.data);
            } else if (event.data.type === "get") {
                bc.postMessage({
                    type: "set",
                    sender: hookId.current,
                    data,
                });
            }
        };

        return () => bc.close();
    }, [key]);

    useEffect(() => {
        bcRef.current?.postMessage({
            type: "get",
            sender: hookId.current,
        });
    }, []);

    const updateData = (newData: T | ((prev: T) => T)) => {
        if (!bcRef.current) return;

        if (typeof newData === "function") {
            setData((prev) => {
                const computedData = (newData as (prev: T) => T)(prev);
                bcRef.current?.postMessage({
                    type: "set",
                    sender: hookId.current,
                    data: computedData,
                });
                return computedData;
            });
        } else {
            bcRef.current.postMessage({
                type: "set",
                sender: hookId.current,
                data: newData,
            });
            setData(newData);
        }
    };

    return [data, updateData];
}

// effectShared hook with proper typing
export function effectShared(
    callback: () => void = () => undefined,
    keys: string[] = [""]
): void {
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
