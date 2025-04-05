import { useEffect, useRef, useState } from "react";

export function useShared(key = "", defaultValue) {
    const [data, setData] = useState(defaultValue);
    const hookId = useRef(window.crypto.randomUUID());
    const bcRef = useRef(null);

    useEffect(() => {
        // Create a BroadcastChannel for the given key.
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        // Listen for messages from other windows.
        bc.onmessage = (event) => {
            // Ignore messages sent by this instance.
            if (event.data.sender === hookId.current) return;

            if (event.data.type === "set") {
                // When receiving a "set" message, update state.
                setData(event.data.data);
            } else if (event.data.type === "get") {
                // When another window asks for data, respond with the current state.
                bc.postMessage({
                    type: "set",
                    sender: hookId.current,
                    data,
                });
            }
        };

        // Ask for the shared data as soon as the channel is ready.
        bc.postMessage({
            type: "get",
            sender: hookId.current,
        });

        return () => {
            bc.close();
        };
    }, [key, data]);

    // Function to update the shared state.
    const updateData = (newData) => {
        if (!bcRef.current) return;

        // Handle functional updates.
        if (typeof newData === "function") {
            setData((prev) => {
                const computedData = newData(prev);
                bcRef.current.postMessage({
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

export function effectShared(callback = () => undefined, keys = [""]) {
    const channelsRef = useRef([]);

    useEffect(() => {
        // Create a BroadcastChannel for each key.
        channelsRef.current = keys.map((key) => {
            const channel = new BroadcastChannel(key);
            channel.onmessage = () => {
                // Run the callback when a message is received.
                callback();
            };
            return channel;
        });

        return () => {
            channelsRef.current.forEach((channel) => channel.close());
        };
    }, [keys, callback]);
}
