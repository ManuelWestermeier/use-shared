import { useEffect, useRef, useState } from "react";

export function useShared(key = "", defaultValue) {
    const [data, setData] = useState(defaultValue);
    const hookId = useRef(window.crypto.randomUUID());
    const bcRef = useRef(null);

    // Create the BroadcastChannel only once for the given key
    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        const handleMessage = (event) => {
            const message = event.data;

            if (message.sender === hookId.current) return;

            if (message.type === "set") {
                setData(message.data);
            } else if (message.type === "get") {
                // Respond with current state
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

    const updateData = (newData) => {
        setData((prevData) => {
            const value = typeof newData === "function" ? newData(prevData) : newData;

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

export function effectShared(callback = () => undefined, keys = [""]) {
    const channelsRef = useRef([]);

    useEffect(() => {
        const channels = keys.map((key) => {
            const channel = new BroadcastChannel(key);
            channel.onmessage = (event) => {
                if (typeof callback === "function") callback(event);
            };
            return channel;
        });

        channelsRef.current = channels;

        return () => {
            channels.forEach((channel) => channel.close());
        };
    }, [JSON.stringify(keys), callback]);
}
