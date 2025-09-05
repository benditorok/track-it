import React, { useState } from "react";
import { Card, Button, Input, Typography, Space, List, Tag, Empty, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, ClockCircleOutlined, FieldTimeOutlined } from "@ant-design/icons";
import { TrackerEntry, TrackerLine } from "../types/tracker.ts";

const { Title } = Typography;

interface TrackerCardProps {
  trackers: TrackerEntry[];
  trackerLines: TrackerLine[];
  selectedTracker: TrackerEntry | null;
  liveDurations: Map<number, string>;
  onCreateTracker: (label: string) => void;
  onDeleteTracker: (tracker: TrackerEntry) => void;
  onSelectTracker: (tracker: TrackerEntry) => void;
  onStopTracking: (trackerLine: TrackerLine) => void;
  formatDuration: (startedAt: string, endedAt: string | null) => string;
}

export const TrackerCard: React.FC<TrackerCardProps> = ({
  trackers,
  trackerLines,
  selectedTracker,
  liveDurations,
  onCreateTracker,
  onDeleteTracker,
  onSelectTracker,
  onStopTracking,
  formatDuration,
}) => {
  const [newTrackerLabel, setNewTrackerLabel] = useState("");

  const handleCreateTracker = () => {
    if (newTrackerLabel.trim()) {
      onCreateTracker(newTrackerLabel);
      setNewTrackerLabel("");
    }
  };

  const getTrackerLines = (trackerId: number) => {
    return trackerLines.filter((line) => line.entry_id === trackerId);
  };

  const getActiveLineForTracker = (trackerId: number) => {
    return trackerLines.find((line) => line.entry_id === trackerId && line.ended_at === null) || null;
  };

  return (
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
          onPressEnter={handleCreateTracker}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTracker} disabled={!newTrackerLabel.trim()}>
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
                        <Tag icon={<FieldTimeOutlined />}>{lines.length} entries</Tag>
                        {activeLine && (
                          <Tag color="green" icon={<ClockCircleOutlined />} style={{ animation: "pulse 2s infinite" }}>
                            Running: {liveDurations.get(activeLine.id) || formatDuration(activeLine.started_at, null)}
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
      </div>
    </Card>
  );
};
