import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface TrackerEntry {
  id: number;
  label: string;
  created_at: string;
  updated_at: string;
}

interface TrackerLine {
  id: number;
  entry_id: number;
  desc: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

function App() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracker state
  const [trackers, setTrackers] = useState<TrackerEntry[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<TrackerEntry | null>(null);
  const [newTrackerLabel, setNewTrackerLabel] = useState("");

  // Tracking lines state
  const [trackerLines, setTrackerLines] = useState<TrackerLine[]>([]);
  const [newLineDesc, setNewLineDesc] = useState("");
  const [activeLines, setActiveLines] = useState<TrackerLine[]>([]);

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        await invoke("initialize_app");
        setInitialized(true);
        await loadTrackers();
        await loadTrackerLines();
      } catch (err) {
        setError(err as string);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Update active lines when tracker lines change
  useEffect(() => {
    const active = trackerLines.filter((line) => line.ended_at === null);
    setActiveLines(active);
  }, [trackerLines]);

  const loadTrackers = async () => {
    try {
      const trackersData = await invoke<TrackerEntry[]>("get_trackers");
      setTrackers(trackersData);
    } catch (err) {
      setError(err as string);
    }
  };

  const loadTrackerLines = async () => {
    try {
      const linesData = await invoke<TrackerLine[]>("get_tracker_lines");
      setTrackerLines(linesData);
    } catch (err) {
      setError(err as string);
    }
  };

  const createTracker = async () => {
    if (!newTrackerLabel.trim()) return;

    try {
      const newTracker = await invoke<TrackerEntry>("create_tracker", {
        label: newTrackerLabel,
      });
      setTrackers((prev) => [...prev, newTracker]);
      setNewTrackerLabel("");
    } catch (err) {
      setError(err as string);
    }
  };

  const startTracking = async () => {
    if (!selectedTracker || !newLineDesc.trim()) return;

    try {
      const newLine = await invoke<TrackerLine>("start_tracking", {
        entryId: selectedTracker.id,
        description: newLineDesc,
      });
      setTrackerLines((prev) => [...prev, newLine]);
      setNewLineDesc("");
    } catch (err) {
      setError(err as string);
    }
  };

  const stopTracking = async (line: TrackerLine) => {
    try {
      const updatedLine = await invoke<TrackerLine>("stop_tracking", {
        lineId: line.id,
        entryId: line.entry_id,
        description: line.desc,
        startedAt: line.started_at,
      });

      setTrackerLines((prev) => prev.map((l) => (l.id === updatedLine.id ? updatedLine : l)));
    } catch (err) {
      setError(err as string);
    }
  };

  const deleteTracker = async (tracker: TrackerEntry) => {
    if (!confirm(`Are you sure you want to delete "${tracker.label}" and all its tracking data?`)) {
      return;
    }

    try {
      await invoke("delete_tracker", { trackerId: tracker.id });
      setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
      setTrackerLines((prev) => prev.filter((l) => l.entry_id !== tracker.id));
      if (selectedTracker?.id === tracker.id) {
        setSelectedTracker(null);
      }
    } catch (err) {
      setError(err as string);
    }
  };

  const deleteTrackerLine = async (line: TrackerLine) => {
    if (!confirm("Are you sure you want to delete this tracking entry?")) {
      return;
    }

    try {
      await invoke("delete_tracker_line", { lineId: line.id });
      setTrackerLines((prev) => prev.filter((l) => l.id !== line.id));
    } catch (err) {
      setError(err as string);
    }
  };

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTrackerLines = (trackerId: number) => {
    return trackerLines.filter((line) => line.entry_id === trackerId);
  };

  const getActiveLineForTracker = (trackerId: number) => {
    return activeLines.find((line) => line.entry_id === trackerId);
  };

  if (loading) {
    return (
      <main className="container">
        <div className="loading">
          <h2>Initializing Time Tracker...</h2>
          <div className="spinner"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </main>
    );
  }

  if (!initialized) {
    return (
      <main className="container">
        <div className="error">
          <h2>Not Initialized</h2>
          <p>Failed to initialize the application</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <header>
        <h1>🕐 Time Tracker</h1>
        <p>Track your time efficiently with organized trackers</p>
      </header>

      <div className="app-layout">
        {/* Left Panel - Trackers */}
        <div className="trackers-panel">
          <div className="panel-header">
            <h2>Trackers</h2>
          </div>

          <div className="create-tracker">
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter tracker name..."
                value={newTrackerLabel}
                onChange={(e) => setNewTrackerLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createTracker()}
              />
              <button onClick={createTracker} disabled={!newTrackerLabel.trim()}>
                Create
              </button>
            </div>
          </div>

          <div className="trackers-list">
            {trackers.length === 0 ? (
              <div className="empty-state">
                <p>No trackers yet. Create your first tracker above!</p>
              </div>
            ) : (
              trackers.map((tracker) => {
                const lines = getTrackerLines(tracker.id);
                const activeLine = getActiveLineForTracker(tracker.id);
                const isSelected = selectedTracker?.id === tracker.id;

                return (
                  <div
                    key={tracker.id}
                    className={`tracker-card ${isSelected ? "selected" : ""} ${activeLine ? "active" : ""}`}
                    onClick={() => setSelectedTracker(tracker)}
                  >
                    <div className="tracker-header">
                      <h3>{tracker.label}</h3>
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTracker(tracker);
                        }}
                        title="Delete tracker"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="tracker-stats">
                      <span className="stat">📊 {lines.length} entries</span>
                      {activeLine && (
                        <span className="stat active">⏱️ Running: {formatDuration(activeLine.started_at, null)}</span>
                      )}
                    </div>

                    {activeLine && (
                      <div className="active-task">
                        <p>"{activeLine.desc}"</p>
                        <button
                          className="stop-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopTracking(activeLine);
                          }}
                        >
                          Stop
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Selected Tracker Details */}
        <div className="details-panel">
          {selectedTracker ? (
            <>
              <div className="panel-header">
                <h2>{selectedTracker.label}</h2>
                <span className="tracker-id">ID: {selectedTracker.id}</span>
              </div>

              {/* Start New Tracking */}
              {!getActiveLineForTracker(selectedTracker.id) && (
                <div className="start-tracking">
                  <h3>Start New Task</h3>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="What are you working on?"
                      value={newLineDesc}
                      onChange={(e) => setNewLineDesc(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && startTracking()}
                    />
                    <button onClick={startTracking} disabled={!newLineDesc.trim()}>
                      Start
                    </button>
                  </div>
                </div>
              )}

              {/* Tracking History */}
              <div className="tracking-history">
                <h3>Tracking History</h3>
                <div className="lines-list">
                  {getTrackerLines(selectedTracker.id).length === 0 ? (
                    <div className="empty-state">
                      <p>No tracking entries yet. Start tracking above!</p>
                    </div>
                  ) : (
                    getTrackerLines(selectedTracker.id)
                      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                      .map((line) => (
                        <div key={line.id} className={`line-card ${!line.ended_at ? "active" : ""}`}>
                          <div className="line-header">
                            <h4>{line.desc}</h4>
                            <button className="delete-btn" onClick={() => deleteTrackerLine(line)} title="Delete entry">
                              ✕
                            </button>
                          </div>

                          <div className="line-details">
                            <div className="time-info">
                              <span>Started: {formatTime(line.started_at)}</span>
                              {line.ended_at ? (
                                <span>Ended: {formatTime(line.ended_at)}</span>
                              ) : (
                                <span className="running">Running...</span>
                              )}
                            </div>

                            {line.ended_at && (
                              <div className="duration">Duration: {formatDuration(line.started_at, line.ended_at)}</div>
                            )}
                          </div>

                          {!line.ended_at && (
                            <button className="stop-btn" onClick={() => stopTracking(line)}>
                              Stop Tracking
                            </button>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Select a Tracker</h2>
              <p>Choose a tracker from the left panel to view details and start tracking time.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
