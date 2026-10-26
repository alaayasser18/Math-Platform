import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

function parseValue(rawValue, definition) {
  if (rawValue == null) return definition.defaultValue;
  return definition.normalize(rawValue) ?? definition.defaultValue;
}

export default function useUrlState(schema) {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    return Object.fromEntries(
      Object.entries(schema).map(([key, definition]) => [
        key,
        parseValue(searchParams.get(key), definition),
      ]),
    );
  }, [schema, searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    for (const [key, definition] of Object.entries(schema)) {
      const rawValue = searchParams.get(key);
      if (rawValue == null) continue;

      const normalized = definition.normalize(rawValue);
      if (normalized == null || normalized === definition.defaultValue) {
        nextParams.delete(key);
        changed = true;
      } else if (normalized !== rawValue) {
        nextParams.set(key, normalized);
        changed = true;
      }
    }

    if (changed) setSearchParams(nextParams, { replace: true });
  }, [schema, searchParams, setSearchParams]);

  const updateState = useCallback(
    (updates, options = {}) => {
      setSearchParams(
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);

          for (const [key, requestedValue] of Object.entries(updates)) {
            const definition = schema[key];
            if (!definition) continue;

            const normalized = definition.normalize(String(requestedValue ?? ""));
            const value = normalized ?? definition.defaultValue;
            if (value === definition.defaultValue) nextParams.delete(key);
            else nextParams.set(key, value);
          }

          return nextParams;
        },
        { replace: options.replace ?? false },
      );
    },
    [schema, setSearchParams],
  );

  return [state, updateState, searchParams];
}
