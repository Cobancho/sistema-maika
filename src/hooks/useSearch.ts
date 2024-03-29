import Fuse from "fuse.js";
import { useMemo, useState } from "react";

interface IUseSearchProps<T> {
  dataSet: T[];
  keys: string[];
}

const SCORE_THRESHOLD = 0.6;

export default function useSearch<T>({ dataSet, keys }: IUseSearchProps<T>) {
  const [searchValue, setSearchValue] = useState("");

  const fuse = useMemo(() => {
    const options = {
      includeScore: true,
      keys,
    };

    return new Fuse(dataSet, options);
  }, [dataSet, keys]);

  const results = useMemo(() => {
    if (!searchValue) return dataSet;

    const searchResults = fuse.search(searchValue);

    return searchResults
      .filter(
        (fuseResult) =>
          fuseResult.score !== undefined && fuseResult.score < SCORE_THRESHOLD,
      )
      .map((fuseResult) => fuseResult.item);
  }, [fuse, searchValue, dataSet]);

  return {
    searchValue,
    setSearchValue,
    results,
  };
}
