import React, { useState, useEffect } from "react";

export default function App() {
  const [source, setSource] = useState("HSR Layout");
  const [destination, setDestination] = useState("Indiranagar");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const [searchMode, setSearchMode] = useState<"source" | "destination" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const calculateRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: source, destination }),
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
        );
        const results = await res.json();
        setSuggestions(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (s: any) => {
    const name = s.display_name.split(",")[0];

    if (searchMode === "source") setSource(name);
    else setDestination(name);

    setSearchMode(null);
    setSearchQuery("");
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;

      if (searchMode === "source") setSource("Current Location");
      else setDestination("Current Location");

      setSearchMode(null);
    });
  };

  const handleSwap = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>RouteCraft - Search & Route</h2>

      <div style={{ marginBottom: 20 }}>
        <input value={source} onClick={() => setSearchMode("source")} readOnly />
        <input value={destination} onClick={() => setSearchMode("destination")} readOnly />

        <button onClick={handleSwap}>Swap</button>

        <button onClick={calculateRoutes}>
          {loading ? "Loading..." : "Find Route"}
        </button>
      </div>

      {searchMode && (
        <div style={{ border: "1px solid gray", padding: 10 }}>
          <input
            placeholder="Search location"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button onClick={handleGetCurrentLocation}>
            Use Current Location
          </button>

          {isSearching && <p>Searching...</p>}

          {suggestions.map((s, i) => (
            <div key={i} onClick={() => handleSelectSuggestion(s)}>
              {s.display_name}
            </div>
          ))}
        </div>
      )}

      {data && (
        <div>
          <h3>Route Result:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
