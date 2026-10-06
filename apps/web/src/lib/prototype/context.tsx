"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPrototypeStore, type PrototypeStore } from "./store";

const StoreContext = createContext<PrototypeStore | null>(null);
export function PrototypeProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createPrototypeStore);
  useEffect(() => {
    store.hydrate(() => window.localStorage);
  }, [store]);
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
export function usePrototype() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("PrototypeProvider가 필요합니다.");
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return { ...snapshot, store };
}
