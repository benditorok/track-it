import { useState } from "react";
import { Card, Button, Input, Typography, Space, List, Tag, Empty, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, ClockCircleOutlined, FieldTimeOutlined } from "@ant-design/icons";
import { TrackerEntry, TrackerLine } from "../types/tracker.ts";

const { Title } = Typography;

interface TrackerCardProps {
  trackers: TrackerEntry[];
  selectedTracker: TrackerEntry | null;
  liveDurations: Map<number, string>;
  onCreateTracker: (label: string) => void;
  onDeleteTracker: (tracker: TrackerEntry) => void;
  onSelectTracker: (tracker: TrackerEntry) => void;
  onStopTracking: (trackerLine: TrackerLine) => void;
  formatDuration: (startedAt: string, endedAt: string | null) => string;
}

export function TrackerCard({
  trackers,
  selectedTracker,
  liveDurations,
  onCreateTracker,
  onDeleteTracker,
  onSelectTracker,
  onStopTracking,
  formatDuration,
}: TrackerCardProps) {
  const [newTrackerLabel, setNewTrackerLabel] = useState("");

  const handleCreateTracker = () => {
    if (newTrackerLabel.trim()) {
      onCreateTracker(newTrackerLabel);
      setNewTrackerLabel("");
    }
  };

  const getActiveLineForTracker = (tracker: TrackerEntry) => {
    return tracker.lines.find((line) => line.durations.some((d) => d.ended_at === null)) || null;
  };

  return (
    <Card title="Trackers">
      <Space.Compact style={{ width: "100%" }}>
        <Input
          placeholder="Enter tracker name..."
          value={newTrackerLabel}
          onChange={(e) => setNewTrackerLabel(e.target.value)}
          onPressEnter={handleCreateTracker}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTracker} disabled={!newTrackerLabel.trim()}>
          Create
        </Button>
      </Space.Compact>

      {trackers.length === 0 ? (
        <Empty description="No trackers yet. Create your first tracker above!" />
      ) : (
        <List
          dataSource={trackers}
          renderItem={(tracker) => {
            const activeLine = getActiveLineForTracker(tracker);
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
                  onClick={() => onSelectTracker(tracker)}
                  extra={
                    <Tooltip title="Delete tracker">
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTracker(tracker);
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
                      <Tag icon={<FieldTimeOutlined />}>{tracker.lines.length} entries</Tag>
                      {activeLine && (
                        <Tag color="green" icon={<ClockCircleOutlined />} style={{ animation: "pulse 2s infinite" }}>
                          Running:{" "}
                          {liveDurations.get(activeLine.id) ||
                            (() => {
                              const activeDuration = activeLine.durations.find((d) => d.ended_at === null);
                              return activeDuration ? formatDuration(activeDuration.started_at, null) : "N/A";
                            })()}
                        </Tag>
                      )}
                    </Space>

                    {activeLine && (
                      <Card size="small" style={{ backgroundColor: "#f6ffed", border: "1px solid #b7eb8f" }}>
                        <Space direction="vertical" style={{ width: "100%" }} size="small">
                          <Typography.Text italic>"{activeLine.desc}"</Typography.Text>
                          <Button
                            size="small"
                            type="primary"
                            icon={<ClockCircleOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onStopTracking(activeLine);
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
    </Card>
  );
}
