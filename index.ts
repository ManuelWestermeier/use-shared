import { useEffect, useRef, useState } from "react";

// Message type for communication
type SharedMessage<T> =
    | { type: "set"; sender: string; data: T }
    | { type: "get"; sender: string };

// useShared hook
export function useShared<T>(
    key: string = "",
    defaultValue: T
): [T, (newData: T | ((prev: T) => T)) => void] {
    const [data, setData] = useState<T>(defaultValue);
    const hookId = useRef<string>(crypto.randomUUID());
    const bcRef = useRef<BroadcastChannel | null>(null);

    // Create the BroadcastChannel only once for the given key
    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        const handleMessage = (event: MessageEvent<SharedMessage<T>>) => {
            const message = event.data;

            if (message.sender === hookId.current) return;

            if (message.type === "set") {
                setData(message.data);
            } else if (message.type === "get") {
                bc.postMessage({
                    type: "set",
                    sender: hookId.current,
                    data: data,
                });
            }
        };

        bc.addEventListener("message", handleMessage);

        // Request current state from other tabs
        bc.postMessage({
            type: "get",
            sender: hookId.current,
        });

        return () => {
            bc.removeEventListener("message", handleMessage);
            bc.close();
        };
    }, [key]);

    const updateData = (newData: T | ((prev: T) => T)) => {
        setData((prevData) => {
            const value = typeof newData === "function"
                ? (newData as (prev: T) => T)(prevData)
                : newData;

            if (bcRef.current) {
                bcRef.current.postMessage({
                    type: "set",
                    sender: hookId.current,
                    data: value,
                });
            }

            return value;
        });
    };

    return [data, updateData];
}

// effectShared hook
export function effectShared(
    callback: (event?: MessageEvent) => void = () => undefined,
    keys: string[] = [""]
): void {
    const channelsRef = useRef<BroadcastChannel[]>([]);

    useEffect(() => {
        const channels = keys.map((key) => {
            const channel = new BroadcastChannel(key);
            channel.onmessage = (event: MessageEvent) => {
                callback(event);
            };
            return channel;
        });

        channelsRef.current = channels;

        return () => {
            channels.forEach((channel) => channel.close());
        };
    }, [JSON.stringify(keys), callback]);
}
