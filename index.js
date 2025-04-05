import { useEffect, useRef, useState } from "react";

export function useShared(key = "", defaultValue) {
    const [data, setData] = useState(defaultValue);
    const hookId = useRef(window.crypto.randomUUID());
    const bcRef = useRef(null);

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        bc.onmessage = (event) => {
            if (event.data.sender == hookId) return;
            if (event.data.type === "set") {
                setData(event.data.data);
            }
            else if (event.data.type === "get") {
                bc.postMessage({
                    type: "set",
                    sender: hookId,
                    data,
                });
            }
        };

        return () => bc.close();
    }, [key]);

    useEffect(() => {
        bcRef.current.postMessage({
            type: "get",
            sender: hookId,
        });
    }, []);

    const updateData = (newData) => {
        if (!bcRef.current) return;

        if (typeof newData === "function") {
            setData((prev) => {
                const computedData = newData(prev);
                bcRef.current.postMessage({
                    type: "set",
                    sender: hookId,
                    data: computedData
                });
                return computedData;
            });
        } else {
            bcRef.current.postMessage({
                type: "set",
                sender: hookId,
                data: newData
            });
            setData(newData);
        }
    };

    return [data, updateData];
}

export function effectShared(callback = () => undefined, keys = [""]) {
    const channelsRef = useRef([]);

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
