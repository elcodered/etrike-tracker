import { useCallback, useEffect, useState } from "react";
import { get, errorText } from "../api/client";
export function useResource(path, params = {}, poll = 0) {
  const key = JSON.stringify(params);
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setData(null);
    const fetchData = () =>
      get(path, JSON.parse(key))
        .then((r) => {
          if (live) {
            setData(r);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(errorText(e));
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    fetchData();
    const id = poll ? setInterval(fetchData, poll) : null;
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [path, key, revision, poll]);
  return { data, setData, loading, error, reload };
}
