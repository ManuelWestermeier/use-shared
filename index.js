import { useEffect, useRef, useState } from "react";

export function useShared(key = "", defaultValue) {
    const [data, setData] = useState(defaultValue);
    const bc = useRef();

    useEffect(() => {
        bc.current = new BroadcastChannel(key);

        bc.current.onmessage = newData => {
            setData(newData);
        };

        return () => bc.current.close();
    }, []);

    return [data, newData => {
        if (typeof newData == "function") {
            setData(prev => {
                const data = newData(prev);
                bc.current.postMessage(data);
                return data;
            });
        }
        else {
            bc.current.postMessage(newData);
            setData(newData);
        }
    }];
}

export function effectShared(callback = () => undefined, keys = [""]) {
    const bc = useRef();

    useEffect(() => {
        bc.current = [];

        keys.forEach(key => {
            const bc = new BroadcastChannel(key);

            bc.onmessage = () => {
                callback();
            }

            bc.current.push(bc);
        });

        return () => {
            bc.current.forEach(connection => connection.close());
        }
    }, []);
}