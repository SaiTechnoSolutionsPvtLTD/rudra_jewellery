import { useState, useEffect } from 'react';

const STORAGE_KEY = 'rudhra_selected_design_ids';

export function useProductSelection() {
  const [selectedIds, setSelectedIdsState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        setSelectedIdsState(saved ? JSON.parse(saved) : []);
      } catch {
        setSelectedIdsState([]);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const saveIds = (ids) => {
    setSelectedIdsState(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (err) {
      console.error('Error saving selected designs to localStorage', err);
    }
  };

  const toggleSelection = (id) => {
    const numericId = Number(id);
    let updated;
    if (selectedIds.includes(numericId)) {
      updated = selectedIds.filter((item) => item !== numericId);
    } else {
      updated = [...selectedIds, numericId];
    }
    saveIds(updated);
    return updated;
  };

  const removeSelection = (id) => {
    const numericId = Number(id);
    const updated = selectedIds.filter((item) => item !== numericId);
    saveIds(updated);
  };

  const clearSelection = () => {
    saveIds([]);
  };

  const isSelected = (id) => {
    return selectedIds.includes(Number(id));
  };

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    toggleSelection,
    removeSelection,
    clearSelection,
    isSelected,
    setSelectedIds: saveIds,
  };
}
