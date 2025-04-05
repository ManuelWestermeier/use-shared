import { useEffect, useRef, useState } from "react";

export function useShared(key = "", defaultValue) {
    const hookId = useRef(window.crypto.randomUUID());
    const bcRef = useRef(null);
    const hasSynced = useRef(false);

    const [data, setData] = useState(undefined); // Delay using defaultValue

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        const handleMessage = (event) => {
            const message = event.data;
            if (message.sender === hookId.current) return;

            if (message.type === "set") {
                if (!hasSynced.current) {
                    hasSynced.current = true;
                    setData(message.data);
                }
            } else if (message.type === "get") {
                if (hasSynced.current && data !== undefined) {
                    bc.postMessage({
                        type: "set",
                        sender: hookId.current,
                        data,
                    });
                }
            }
        };

        bc.addEventListener("message", handleMessage);

        // Ask others for their data
        bc.postMessage({
            type: "get",
            sender: hookId.current,
        });

        // Fallback to defaultValue if no response after 100ms
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

    const updateData = (newData) => {
        setData((prev) => {
            const value = typeof newData === "function" ? newData(prev) : newData;
            hasSynced.current = true;

            bcRef.current?.postMessage({
                type: "set",
                sender: hookId.current,
                data: value,
            });

            return value;
        });
    };

    return [data === undefined ? defaultValue : data, updateData];
}

export function effectShared(callback = () => undefined, keys = [""]) {
    const channelsRef = useRef([]);

    useEffect(() => {
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
