import { createStore, useStore } from "zustand";

interface EventState {
  payloads: Record<string, unknown>;
}

const eventStore = createStore<EventState>(() => ({ payloads: {} }));

type EmitFn = <P = unknown>(key: string, payload: P) => void;

export const emit: EmitFn = (key, payload) => {
  eventStore.setState((state) => ({
    payloads: { ...state.payloads, [key]: payload },
  }));
};

export function on<P = unknown>(key: string, listener: (payload: P) => void): () => void {
  let prev = eventStore.getState().payloads[key];

  return eventStore.subscribe((state) => {
    const next = state.payloads[key];

    if (!Object.is(next, prev)) {
      prev = next;
      listener(next as P);
    }
  });
}

export function useEvent<T = unknown>(key: string): { data: T | undefined; emit: EmitFn };
export function useEvent(): { data: undefined; emit: EmitFn };
export function useEvent<T = unknown>(key?: string) {
  const data = useStore(eventStore, (state) =>
    key !== undefined ? (state.payloads[key] as T | undefined) : undefined
  );

  return { data, emit };
}
