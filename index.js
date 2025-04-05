import { useEffect, useRef, useState } from "react";

export function useShared(key = "", defaultValue) {
    const [data, setData] = useState(defaultValue);
    const bcRef = useRef(null);

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        bc.onmessage = (event) => {
            if (event.data.type === "set") {
                setData(event.data.data);
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

    useEffect(() => {
        bcRef.current.postMessage({
            type: "get",
        });
    }, []);

    const updateData = (newData) => {
        if (!bcRef.current) return;

        if (typeof newData === "function") {
            setData((prev) => {
                const computedData = newData(prev);
                bcRef.current.postMessage({ type: "set", data: computedData });
                return computedData;
            });
        } else {
            bcRef.current.postMessage({ type: "set", data: newData });
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
