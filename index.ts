import { useEffect, useRef, useState } from "react";

// Define the shape of the messages exchanged
type SharedMessage<T> =
    | { type: "set"; sender: string; data: T }
    | { type: "get"; sender: string };

// useShared hook to synchronize state across tabs/windows
export function useShared<T>(
    key: string = "",
    defaultValue: T
): [T, (newData: T | ((prev: T) => T)) => void] {
    const [data, setData] = useState<T>(defaultValue);
    const hookId = useRef<string>(crypto.randomUUID()); // Unique ID for this hook instance
    const bcRef = useRef<BroadcastChannel | null>(null); // Broadcast channel reference

    useEffect(() => {
        // Create a BroadcastChannel for the given key.
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        // Listen for messages from other windows.
        bc.onmessage = (event: MessageEvent<SharedMessage<T>>) => {
            const msg = event.data;
            if (msg.sender === hookId.current) return; // Ignore messages from self

            if (msg.type === "set") {
                setData(msg.data); // Update local state
            } else if (msg.type === "get") {
                bc.postMessage({
                    type: "set",
                    sender: hookId.current,
                    data,
                });
            }
        };

        // Ask for the shared data immediately
        bc.postMessage({
            type: "get",
            sender: hookId.current,
        });

        return () => {
            bc.close();
        };
    }, [key, data]);

    // Function to update the shared state
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

// Hook that runs a callback whenever a message is received on any given key
export function effectShared(
    callback: () => void = () => undefined,
    keys: string[] = [""]
): void {
    const channelsRef = useRef<BroadcastChannel[]>([]);

    useEffect(() => {
        // Create a BroadcastChannel for each key.
        channelsRef.current = keys.map((key) => {
            const channel = new BroadcastChannel(key);
            channel.onmessage = () => {
                callback(); // Run callback when message received
            };
            return channel;
        });

        return () => {
            channelsRef.current.forEach((channel) => channel.close());
        };
    }, [keys, callback]);
}
