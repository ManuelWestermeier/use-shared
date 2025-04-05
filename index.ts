import { useEffect, useRef, useState } from "react";

// Define a generic message type for clarity
type Message<T> =
    | { type: "set"; sender: string; data: T }
    | { type: "get"; sender: string };

export function useShared<T>(key: string, defaultValue: T): [T, (newData: T | ((prev: T) => T)) => void] {
    const hookId = useRef(window.crypto.randomUUID());
    const bcRef = useRef<BroadcastChannel | null>(null);
    // Use a ref to track if a remote state has been received
    const hasSynced = useRef(false);

    // Start with undefined to wait for a possible remote state.
    // (The fallback below sets the default if no remote state is received.)
    const [data, setData] = useState<T | undefined>(undefined);

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        const handleMessage = (event: MessageEvent<Message<T>>) => {
            const message = event.data;
            // Ignore messages from ourselves
            if (message.sender === hookId.current) return;

            if (message.type === "set") {
                // Only update if this instance hasn't yet been synced.
                if (!hasSynced.current) {
                    hasSynced.current = true;
                    setData(message.data);
                }
            } else if (message.type === "get") {
                // Respond with current state only if we already have a synced value.
                if (hasSynced.current && data !== undefined) {
                    bc.postMessage({
                        type: "set",
                        sender: hookId.current,
                        data,
                    } as Message<T>);
                }
            }
        };

        bc.addEventListener("message", handleMessage);

        // Ask others for the shared state right away.
        bc.postMessage({
            type: "get",
            sender: hookId.current,
        } as Message<T>);

        // If no other tab responds within 100ms, initialize to defaultValue.
        const timeout = setTimeout(() => {
            if (!hasSynced.current) {
                hasSynced.current = true;
                setData(defaultValue);
            }
        }, 100);

        return () => {
            clearTimeout(timeout);
            bc.removeEventListener("message", handleMessage);
            bc.close();
        };
    }, [key, defaultValue]);

    // updateData handles both functional and direct value updates.
    const updateData = (newData: T | ((prev: T) => T)) => {
        setData((prevData) => {
            const value = typeof newData === "function" ? (newData as (prev: T) => T)(prevData as T) : newData;
            // Mark this instance as synced.
            hasSynced.current = true;
            // Broadcast the new value.
            bcRef.current?.postMessage({
                type: "set",
                sender: hookId.current,
                data: value,
            } as Message<T>);
            return value;
        });
    };

    // If data hasn't been synced yet, you might consider returning the defaultValue.
    // Here we assume the consumer is okay with an undefined state for a brief moment.
    return [data === undefined ? defaultValue : data, updateData];
}

// The effectShared hook listens for events on one or more BroadcastChannels and
// triggers a callback on receiving messages. This can be used to respond to shared events.
export function effectShared(callback: (event: MessageEvent) => void, keys: string[] = [""]) {
    const channelsRef = useRef<BroadcastChannel[]>([]);

    useEffect(() => {
        // Create a channel for each key.
        const channels = keys.map((key) => {
            const channel = new BroadcastChannel(key);
            channel.onmessage = callback;
            return channel;
        });
        channelsRef.current = channels;

        return () => {
            channels.forEach((channel) => channel.close());
        };
    }, [JSON.stringify(keys), callback]);
}
