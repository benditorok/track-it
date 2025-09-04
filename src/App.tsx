import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { confirm } from "@tauri-apps/plugin-dialog";
import {
  Layout,
  Card,
  Button,
  Input,
  Typography,
  Space,
  List,
  Badge,
  Tag,
  Empty,
  Spin,
  Alert,
  Row,
  Col,
  Divider,
  Tooltip,
  Modal,
  message,
} from "antd";
import {
  PlusOutlined,
  PlayCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  ClearOutlined,
} from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

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
      message.success(`Tracker "${newTracker.label}" created successfully`);
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
      message.success("Tracking started successfully");
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
      message.success("Tracking stopped successfully");
    } catch (err) {
      setError(err as string);
    }
  };

  const deleteTracker = async (tracker: TrackerEntry) => {
    Modal.confirm({
      title: "Delete Tracker",
      content: `Are you sure you want to delete "${tracker.label}" and all its tracking data?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await invoke("delete_tracker", { trackerId: tracker.id });
          setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
          setTrackerLines((prev) => prev.filter((l) => l.entry_id !== tracker.id));
          if (selectedTracker?.id === tracker.id) {
            setSelectedTracker(null);
          }
          message.success("Tracker deleted successfully");
        } catch (err) {
          setError(err as string);
        }
      },
    });
  };

  const deleteTrackerLine = async (line: TrackerLine) => {
    Modal.confirm({
      title: "Delete Tracking Entry",
      content: "Are you sure you want to delete this tracking entry?",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await invoke("delete_tracker_line", { lineId: line.id });
          setTrackerLines((prev) => prev.filter((l) => l.id !== line.id));
          message.success("Tracking entry deleted successfully");
        } catch (err) {
          setError(err as string);
        }
      },
    });
  };

  const truncateAllData = async () => {
    Modal.confirm({
      title: "Clear All Data",
      content: "Are you sure you want to delete ALL tracking data? This action cannot be undone!",
      okText: "Delete All",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
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
          setError(err as string);
        }
      },
    });
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
      <Layout style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Space direction="vertical" align="center" size="large">
          <Spin size="large" />
          <Title level={3}>Initializing Time Tracker...</Title>
        </Space>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Space direction="vertical" align="center" size="large">
          <Alert message="Error" description={error} type="error" showIcon />
          <Button type="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Space>
      </Layout>
    );
  }

  if (!initialized) {
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

          @media (max-width: 768px) {
            .ant-layout-content {
              padding: 8px !important;
            }
            .ant-row {
              flex-direction: column !important;
            }
            .ant-col {
              width: 100% !important;
              margin-bottom: 16px !important;
            }
          }
        `}
      </style>
      <Header style={{ background: "#fff", padding: "0 24px", borderBottom: "1px solid #f0f0f0" }}>
        <Space align="center" style={{ height: "100%" }}>
          <ClockCircleOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
          <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
            Time Tracker
          </Title>
          <Text type="secondary">Track your time efficiently with organized trackers</Text>
        </Space>
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
              <Card
                title="Trackers"
                style={{ height: "100%", display: "flex", flexDirection: "column" }}
                bodyStyle={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "16px" }}
              >
                <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                  <Input
                    placeholder="Enter tracker name..."
                    value={newTrackerLabel}
                    onChange={(e) => setNewTrackerLabel(e.target.value)}
                    onPressEnter={createTracker}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={createTracker}
                    disabled={!newTrackerLabel.trim()}
                  >
                    Create
                  </Button>
                </Space.Compact>

                <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                  {trackers.length === 0 ? (
                    <Empty description="No trackers yet. Create your first tracker above!" />
                  ) : (
                    <List
                      dataSource={trackers}
                      renderItem={(tracker) => {
                        const lines = getTrackerLines(tracker.id);
                        const activeLine = getActiveLineForTracker(tracker.id);
                        const isSelected = selectedTracker?.id === tracker.id;

                        return (
                          <List.Item style={{ padding: 0, marginBottom: 8 }}>
                            <Card
                              size="small"
                              style={{
                                width: "100%",
                                cursor: "pointer",
                                border: isSelected ? "2px solid #1890ff" : activeLine ? "2px solid #52c41a" : undefined,
                                backgroundColor: isSelected ? "#f6ffed" : activeLine ? "#f6ffed" : undefined,
                              }}
                              onClick={() => setSelectedTracker(tracker)}
                              extra={
                                <Tooltip title="Delete tracker">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTracker(tracker);
                                    }}
                                    danger
                                  />
                                </Tooltip>
                              }
                            >
                              <Space direction="vertical" style={{ width: "100%" }} size="small">
                                <Title level={5} style={{ margin: 0 }}>
                                  {tracker.label}
                                </Title>

                                <Space wrap>
                                  <Tag icon={<FieldTimeOutlined />}>{lines.length} entries</Tag>
                                  {activeLine && (
                                    <Tag
                                      color="green"
                                      icon={<ClockCircleOutlined />}
                                      style={{ animation: "pulse 2s infinite" }}
                                    >
                                      Running:{" "}
                                      {liveDurations.get(activeLine.id) || formatDuration(activeLine.started_at, null)}
                                    </Tag>
                                  )}
                                </Space>

                                {activeLine && (
                                  <Card
                                    size="small"
                                    style={{ backgroundColor: "#f6ffed", border: "1px solid #b7eb8f" }}
                                  >
                                    <Space direction="vertical" style={{ width: "100%" }} size="small">
                                      <Text italic>"{activeLine.desc}"</Text>
                                      <Button
                                        size="small"
                                        type="primary"
                                        icon={<StopOutlined />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          stopTracking(activeLine);
                                        }}
                                      >
                                        Stop
                                      </Button>
                                    </Space>
                                  </Card>
                                )}
                              </Space>
                            </Card>
                          </List.Item>
                        );
                      }}
                    />
                  )}
                </div>
              </Card>
            </Col>

            {/* Right Panel - Selected Tracker Details */}
            <Col xs={24} lg={14} style={{ height: "100%", minHeight: "400px" }}>
              <Card
                title={
                  selectedTracker ? (
                    <Space>
                      <span>{selectedTracker.label}</span>
                      <Badge count={selectedTracker.id} color="blue" />
                    </Space>
                  ) : (
                    "Select a Tracker"
                  )
                }
                style={{ height: "100%", display: "flex", flexDirection: "column" }}
                bodyStyle={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "16px" }}
              >
                {selectedTracker ? (
                  <>
                    {/* Start New Tracking */}
                    {!getActiveLineForTracker(selectedTracker.id) && (
                      <>
                        <Title level={4}>Start New Task</Title>
                        <Space.Compact style={{ width: "100%", marginBottom: 24 }}>
                          <Input
                            placeholder="What are you working on?"
                            value={newLineDesc}
                            onChange={(e) => setNewLineDesc(e.target.value)}
                            onPressEnter={startTracking}
                          />
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={startTracking}
                            disabled={!newLineDesc.trim()}
                          >
                            Start
                          </Button>
                        </Space.Compact>
                        <Divider />
                      </>
                    )}

                    {/* Tracking History */}
                    <Title level={4}>Tracking History</Title>
                    <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                      {getTrackerLines(selectedTracker.id).length === 0 ? (
                        <Empty description="No tracking entries yet. Start tracking above!" />
                      ) : (
                        <List
                          dataSource={getTrackerLines(selectedTracker.id).sort(
                            (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
                          )}
                          renderItem={(line) => (
                            <List.Item>
                              <Card
                                size="small"
                                style={{
                                  width: "100%",
                                  border: !line.ended_at ? "2px solid #52c41a" : undefined,
                                  backgroundColor: !line.ended_at ? "#f6ffed" : undefined,
                                }}
                                extra={
                                  <Tooltip title="Delete entry">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      onClick={() => deleteTrackerLine(line)}
                                      danger
                                    />
                                  </Tooltip>
                                }
                              >
                                <Space direction="vertical" style={{ width: "100%" }} size="small">
                                  <Title level={5} style={{ margin: 0 }}>
                                    {line.desc}
                                  </Title>

                                  <Space direction="vertical" size="small">
                                    <Text type="secondary">Started: {formatTime(line.started_at)}</Text>
                                    {line.ended_at ? (
                                      <Text type="secondary">Ended: {formatTime(line.ended_at)}</Text>
                                    ) : (
                                      <Badge status="processing" text="Running..." />
                                    )}
                                  </Space>

                                  {line.ended_at ? (
                                    <Text strong>Duration: {formatDuration(line.started_at, line.ended_at)}</Text>
                                  ) : (
                                    <Card
                                      size="small"
                                      style={{ backgroundColor: "#f6ffed", border: "1px solid #b7eb8f" }}
                                    >
                                      <Space direction="vertical" style={{ width: "100%" }} size="small">
                                        <Space>
                                          <Badge status="processing" />
                                          <Text
                                            strong
                                            style={{
                                              color: "#52c41a",
                                              animation: "pulse 2s infinite",
                                            }}
                                          >
                                            Live: {liveDurations.get(line.id) || formatDuration(line.started_at, null)}
                                          </Text>
                                        </Space>
                                        <Button
                                          type="primary"
                                          size="small"
                                          icon={<StopOutlined />}
                                          onClick={() => stopTracking(line)}
                                        >
                                          Stop Tracking
                                        </Button>
                                      </Space>
                                    </Card>
                                  )}
                                </Space>
                              </Card>
                            </List.Item>
                          )}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <Empty
                    description={
                      <Space direction="vertical">
                        <Text>Select a Tracker</Text>
                        <Text type="secondary">
                          Choose a tracker from the left panel to view details and start tracking time.
                        </Text>
                      </Space>
                    }
                  />
                )}
              </Card>
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
