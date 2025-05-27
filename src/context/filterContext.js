import { createContext, useContext, useState, useEffect, useMemo } from "react";

const FiltersContext = createContext(null); // Ensure default value is null for debugging

export const FiltersProvider = ({ children }) => {
  const [selectedValue, setSelectedValue] = useState("value");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [dropdownValue, setDropdownValue] = useState([]);
  const [loading, setLoading] = useState(true);

  const getLastMonthStartAndEndDates = () => {
    const currentDate = new Date();
    currentDate.setDate(1);
    const start = new Date(currentDate);
    start.setMonth(currentDate.getMonth() - 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    setStartDate(start);
    setEndDate(end);
  };

  useEffect(() => {
    getLastMonthStartAndEndDates();
  }, []);

  const value = useMemo(() => ({
    selectedValue,
    setSelectedValue,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dropdownValue,
    setDropdownValue,
    setLoading,
    loading,
  }), [selectedValue, startDate, endDate, dropdownValue, loading]);


  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
};

export const useFilters = () => {
  const context = useContext(FiltersContext);
  if (!context) {
    console.error("❌ useFilters() called outside of FiltersProvider");
    throw new Error("useFilters must be used within a FiltersProvider");
  }
  return context;
};
