import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { confirm } from "@tauri-apps/plugin-dialog";
import { TrackerEntry, TrackerLine } from "./types/tracker.ts";
import { Layout, Button, Typography, Space, Spin, Alert, Row, Col, message, Flex } from "antd";
import { ClockCircleOutlined, ClearOutlined } from "@ant-design/icons";
import { TrackerCard, TrackerDetails } from "./app/index.ts";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function App() {
  const [appInitialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Tracker state
  const [trackers, setTrackers] = useState<TrackerEntry[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<TrackerEntry | null>(null);

  // Tracking lines state
  const [trackerLines, setTrackerLines] = useState<TrackerLine[]>([]);
  const [activeLines, setActiveLines] = useState<TrackerLine[]>([]);

  // Live duration updates
  const [liveDurations, setLiveDurations] = useState<Map<number, string>>(new Map());

  // Update live durations every second for active lines
  useEffect(() => {
    const interval = setInterval(() => {
      const newDurations = new Map<number, string>();
      activeLines.forEach((line) => {
        const duration = formatDuration(line.started_at, null);
        newDurations.set(line.id, duration);
      });
      setLiveDurations(newDurations);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLines]);

  // Handle window close event to stop active tracking
  useEffect(() => {
    const appWindow = getCurrentWindow();

    const setupCloseHandler = async () => {
      const unlisten = await appWindow.onCloseRequested(async (event) => {
        const confirmed = await confirm("Are you sure you want to exit the application and stop all active trackers?");
        if (!confirmed) {
          // Prevent the window from closing if the user cancels
          event.preventDefault();
          return;
        }

        try {
          // Perform cleanup
          await invoke("stop_all_active_tracking");
          await loadTrackerLines();
          await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          console.error("Error in close handler:", err);
        }
      });

      return unlisten;
    };

    const unlistenPromise = setupCloseHandler();

    return () => {
      unlistenPromise.then((unlisten) => {
        unlisten();
      });
    };
  }, []);

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
        setAppError(err as string);
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
      setAppError(err as string);
    }
  };

  const loadTrackerLines = async () => {
    try {
      const linesData = await invoke<TrackerLine[]>("get_tracker_lines");
      setTrackerLines(linesData);
    } catch (err) {
      setAppError(err as string);
    }
  };

  const createTracker = async (label: string) => {
    if (!label.trim()) return;

    try {
      const newTracker = await invoke<TrackerEntry>("create_tracker", {
        label: label,
      });
      setTrackers((prev) => [...prev, newTracker]);
      message.success(`Tracker "${newTracker.label}" created successfully`);
    } catch (err) {
      setAppError(err as string);
    }
  };

  const startTracking = async (entryId: number, description: string) => {
    if (!description.trim()) return;

    try {
      const newLine = await invoke<TrackerLine>("start_tracking", {
        entryId: entryId,
        description: description,
      });
      setTrackerLines((prev) => [...prev, newLine]);
      message.success("Tracking started successfully");
    } catch (err) {
      setAppError(err as string);
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
      message.success("Tracking stopped successfully");
    } catch (err) {
      setAppError(err as string);
    }
  };

  const deleteTracker = async (tracker: TrackerEntry) => {
    const confirmed = await confirm(
      `Are you sure you want to delete "${tracker.label}" and all its tracking data?`,
      "Delete Tracker",
    );

    if (confirmed) {
      try {
        await invoke("delete_tracker", { trackerId: tracker.id });
        setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
        setTrackerLines((prev) => prev.filter((l) => l.entry_id !== tracker.id));
        if (selectedTracker?.id === tracker.id) {
          setSelectedTracker(null);
        }
        message.success("Tracker deleted successfully");
      } catch (err) {
        setAppError(err as string);
      }
    }
  };

  const deleteTrackerLine = async (line: TrackerLine) => {
    const confirmed = await confirm("Are you sure you want to delete this tracking entry?", "Delete Tracking Entry");

    if (confirmed) {
      try {
        await invoke("delete_tracker_line", { lineId: line.id });
        setTrackerLines((prev) => prev.filter((l) => l.id !== line.id));
        message.success("Tracking entry deleted successfully");
      } catch (err) {
        setAppError(err as string);
      }
    }
  };

  const truncateAllData = async () => {
    const confirmed = await confirm(
      "Are you sure you want to delete ALL tracking data? This action cannot be undone!",
      "Clear All Data",
    );

    if (confirmed) {
      try {
        await invoke("truncate_tables");
        // Reload data after truncation
        setTrackers([]);
        setTrackerLines([]);
        setSelectedTracker(null);
        setActiveLines([]);
        await loadTrackers();
        await loadTrackerLines();
        message.success("All data cleared successfully");
      } catch (err) {
        setAppError(err as string);
      }
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

  if (loading) {
    return (
      <Layout style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Space direction="vertical" align="center" size="large">
          <Spin size="large" />
          <Title level={3}>Initializing Time Tracker...</Title>
        </Space>
      </Layout>
    );
  }

  if (appError) {
    return (
      <Layout style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Space direction="vertical" align="center" size="large">
          <Alert message="Error" description={appError} type="error" showIcon />
          <Button type="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Space>
      </Layout>
    );
  }

  if (!appInitialized) {
    return (
      <Layout style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Alert message="Not Initialized" description="Failed to initialize the application" type="error" showIcon />
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", height: "100%" }}>
      <style>
        {`
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.7; }
              100% { opacity: 1; }
            }
          `}
      </style>
      <Header style={{ background: "#fff", padding: "0 24px", borderBottom: "1px solid #f0f0f0" }}>
        <Flex gap="middle" align="center" justify="flex-start" style={{ height: "100%" }}>
          <ClockCircleOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
          <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
            Time Tracker
          </Title>
        </Flex>
      </Header>

      <Content
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100vh - 64px)",
          overflow: "auto",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Row gutter={[16, 16]} style={{ flex: 1, minHeight: 0 }}>
            {/* Left Panel - Trackers */}
            <Col xs={24} lg={10} style={{ height: "100%", minHeight: "300px" }}>
              <TrackerCard
                trackers={trackers}
                trackerLines={trackerLines}
                selectedTracker={selectedTracker}
                liveDurations={liveDurations}
                onCreateTracker={createTracker}
                onDeleteTracker={deleteTracker}
                onSelectTracker={setSelectedTracker}
                onStopTracking={stopTracking}
                formatDuration={formatDuration}
              />
            </Col>

            {/* Right Panel - Selected Tracker Details */}
            <Col xs={24} lg={14} style={{ height: "100%", minHeight: "400px" }}>
              <TrackerDetails
                selectedTracker={selectedTracker}
                trackerLines={trackerLines}
                liveDurations={liveDurations}
                onStartTracking={startTracking}
                onStopTracking={stopTracking}
                onDeleteTrackerLine={deleteTrackerLine}
                formatDuration={formatDuration}
                formatTime={formatTime}
              />
            </Col>
          </Row>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            paddingTop: 16,
            paddingBottom: 16,
            borderTop: "1px solid #f0f0f0",
            flexShrink: 0,
            backgroundColor: "#fff",
            width: "100%",
          }}
        >
          <Button danger icon={<ClearOutlined />} onClick={truncateAllData} size="large">
            Clear All Data
          </Button>
        </div>
      </Content>
    </Layout>
  );
}

export default App;
