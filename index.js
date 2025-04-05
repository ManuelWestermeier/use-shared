import { useEffect, useRef, useState } from "react";

export function useShared(key = "", defaultValue) {
    const [data, setData] = useState(defaultValue);
    const bcRef = useRef(null);

    useEffect(() => {
        const bc = new BroadcastChannel(key);
        bcRef.current = bc;

        bc.onmessage = (event) => {
            setData(event.data);
        };

        return () => bc.close();
    }, [key]);

    const updateData = (newData) => {
        // Check that the BroadcastChannel instance exists
        if (!bcRef.current) return;

        if (typeof newData === "function") {
            setData((prev) => {
                const computedData = newData(prev);
                bcRef.current.postMessage(computedData);
                return computedData;
            });
        } else {
            bcRef.current.postMessage(newData);
            setData(newData);
        }
    };

    return [data, updateData];
}

export function effectShared(callback = () => undefined, keys = [""]) {
    const channelsRef = useRef([]);

    useEffect(() => {
        // Create a BroadcastChannel for each key and set up the listener
        channelsRef.current = keys.map((key) => {
            const channel = new BroadcastChannel(key);
            channel.onmessage = () => {
                callback();
            };
            return channel;
        });

        return () => {
            // Clean up each channel when the effect is torn down
            channelsRef.current.forEach((channel) => channel.close());
        };
    }, [keys, callback]);
}
