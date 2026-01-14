import { useState, useCallback, useRef } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoReturn<T> {
  state: T;
  set: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  reset: (newState: T) => void;
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;
}

const MAX_HISTORY_SIZE = 20;

/**
 * Hook for undo/redo functionality
 * Maintains a history of states for reverting changes
 */
export function useUndoRedo<T>(initialState: T): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // Track if we should skip adding to history (for internal operations)
  const skipHistoryRef = useRef(false);

  const set = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory((prevHistory) => {
      const resolvedState = 
        typeof newState === 'function' 
          ? (newState as (prev: T) => T)(prevHistory.present)
          : newState;

      // Don't add to history if it's the same state
      if (JSON.stringify(resolvedState) === JSON.stringify(prevHistory.present)) {
        return prevHistory;
      }

      // Limit history size
      const newPast = [...prevHistory.past, prevHistory.present].slice(-MAX_HISTORY_SIZE);

      return {
        past: newPast,
        present: resolvedState,
        future: [], // Clear future on new action
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.past.length === 0) return prevHistory;

      const previous = prevHistory.past[prevHistory.past.length - 1];
      const newPast = prevHistory.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [prevHistory.present, ...prevHistory.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.future.length === 0) return prevHistory;

      const next = prevHistory.future[0];
      const newFuture = prevHistory.future.slice(1);

      return {
        past: [...prevHistory.past, prevHistory.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    historySize: history.past.length + history.future.length,
  };
}

export default useUndoRedo;
