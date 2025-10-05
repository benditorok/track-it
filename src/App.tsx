import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { TrackerEntry, TrackerLine } from "./types/tracker.ts";
import { Layout, Button, Typography, Space, Spin, Alert, Row, Col, message, Flex, ConfigProvider, theme } from "antd";
import { ClockCircleOutlined, ClearOutlined, BulbOutlined, BulbFilled } from "@ant-design/icons";
import { TrackerCard, TrackerDetails } from "./app/index.ts";

const { Header, Content } = Layout;
const { Title } = Typography;

// Theme management
const getSystemTheme = (): "light" | "dark" => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getStoredTheme = (): "light" | "dark" | null => {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
};

const setStoredTheme = (theme: "light" | "dark") => {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Ignore localStorage errors
  }
};

function App() {
  // Theme state - initialize with stored preference or system preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = getStoredTheme();
    return stored ? stored === "dark" : getSystemTheme() === "dark";
  });

  const [appInitialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Tracker state
  const [trackers, setTrackers] = useState<TrackerEntry[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<TrackerEntry | null>(null);

  // Live duration updates
  const [liveDurations, setLiveDurations] = useState<Map<number, string>>(new Map());

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't set a preference
      if (getStoredTheme() === null) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    setStoredTheme(newTheme);
  };

  // Set data-theme attribute on root element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Get all active lines from all trackers
  const getAllActiveLines = (): TrackerLine[] => {
    return trackers.flatMap((tracker) =>
      tracker.lines.filter((line) => line.durations.some((d) => d.ended_at === null)),
    );
  };

  // Update live durations every second for active lines
  useEffect(() => {
    const interval = setInterval(() => {
      const newDurations = new Map<number, string>();
      const activeLines = getAllActiveLines();
      activeLines.forEach((line) => {
        const activeDuration = line.durations.find((d) => d.ended_at === null);
        if (activeDuration) {
          const duration = formatDuration(activeDuration.started_at, null);
          newDurations.set(line.id, duration);
        }
      });
      setLiveDurations(newDurations);
    }, 1000);

    return () => clearInterval(interval);
  }, [trackers]);

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        await invoke("initialize_app");
        setInitialized(true);
        await loadTrackers();
      } catch (err) {
        setAppError(err as string);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const loadTrackers = async () => {
    try {
      const trackersData = await invoke<TrackerEntry[]>("get_trackers");
      setTrackers(trackersData);
      // Update selected tracker if it exists
      if (selectedTracker) {
        const updatedTracker = trackersData.find((t) => t.id === selectedTracker.id);
        if (updatedTracker) {
          setSelectedTracker(updatedTracker);
        }
      }
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
      await invoke<TrackerLine>("start_tracking", {
        entryId: entryId,
        description: description,
      });
      await loadTrackers();
      message.success("Tracking started successfully");
    } catch (err) {
      setAppError(err as string);
    }
  };

  const stopTracking = async (line: TrackerLine) => {
    try {
      await invoke<TrackerLine>("stop_tracking", {
        lineId: line.id,
      });
      await loadTrackers();
      message.success("Tracking stopped successfully");
    } catch (err) {
      setAppError(err as string);
    }
  };

  const resumeTracking = async (line: TrackerLine) => {
    try {
      await invoke<TrackerLine>("resume_tracking", {
        lineId: line.id,
      });
      await loadTrackers();
      message.success("Tracking resumed successfully");
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
        await loadTrackers();
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
        setSelectedTracker(null);
        await loadTrackers();
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
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Layout style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <Header className="app-header" style={{ padding: "0 24px" }}>
          <Flex gap="middle" align="center" justify="space-between" style={{ height: "100%" }}>
            <Flex gap="middle" align="center">
              <ClockCircleOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
              <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
                track-it
              </Title>
            </Flex>
            <Button
              type="text"
              icon={isDarkMode ? <BulbFilled style={{ color: "#faad14" }} /> : <BulbOutlined />}
              onClick={toggleTheme}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            />
          </Flex>
        </Header>

        <Content style={{ flex: 1, overflow: "auto", padding: "16px" }}>
          <Row gutter={[16, 16]}>
            {/* Left Panel - Trackers */}
            <Col xs={24} lg={10}>
              <TrackerCard
                trackers={trackers}
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
            <Col xs={24} lg={14}>
              <TrackerDetails
                selectedTracker={selectedTracker}
                liveDurations={liveDurations}
                onStartTracking={startTracking}
                onStopTracking={stopTracking}
                onResumeTracking={resumeTracking}
                onDeleteTrackerLine={deleteTrackerLine}
                formatDuration={formatDuration}
                formatTime={formatTime}
              />
            </Col>
          </Row>
        </Content>

        <div className="app-footer" style={{ padding: "8px 16px", display: "flex", justifyContent: "flex-end" }}>
          <Button danger icon={<ClearOutlined />} onClick={truncateAllData} size="small">
            Clear All Data
          </Button>
        </div>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
