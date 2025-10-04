import React, { useState } from "react";
import { Card, Button, Input, Typography, Space, List, Empty, Badge, Divider } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import { TrackerEntry, TrackerLine } from "../types/tracker.ts";
import { TrackerLineCard } from "./TrackerLineCard.tsx";

const { Title, Text } = Typography;

interface TrackerDetailsProps {
  selectedTracker: TrackerEntry | null;
  liveDurations: Map<number, string>;
  onStartTracking: (entryId: number, description: string) => void;
  onStopTracking: (line: TrackerLine) => void;
  onResumeTracking: (line: TrackerLine) => void;
  onDeleteTrackerLine: (line: TrackerLine) => void;
  formatDuration: (startedAt: string, endedAt: string | null) => string;
  formatTime: (dateString: string) => string;
}

export const TrackerDetails: React.FC<TrackerDetailsProps> = ({
  selectedTracker,
  liveDurations,
  onStartTracking,
  onStopTracking,
  onResumeTracking,
  onDeleteTrackerLine,
  formatDuration,
  formatTime,
}) => {
  const [newLineDesc, setNewLineDesc] = useState("");

  const handleStartTracking = () => {
    if (selectedTracker && newLineDesc.trim()) {
      onStartTracking(selectedTracker.id, newLineDesc);
      setNewLineDesc("");
    }
  };

  const getActiveLineForTracker = (tracker: TrackerEntry) => {
    return tracker.lines.find((line) => line.durations.some((d) => d.ended_at === null)) || null;
  };

  if (!selectedTracker) {
    return (
      <Card
        title="Select a Tracker"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
        bodyStyle={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "16px" }}
      >
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
      </Card>
    );
  }

  const activeLine = getActiveLineForTracker(selectedTracker);
  const lines = selectedTracker.lines;

  return (
    <Card
      title={
        <Space>
          <span>{selectedTracker.label}</span>
          <Badge count={selectedTracker.id} color="blue" />
        </Space>
      }
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
      bodyStyle={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "16px" }}
    >
      {/* Start New Tracking */}
      {!activeLine && (
        <>
          <Title level={4}>Start New Task</Title>
          <Space.Compact style={{ width: "100%", marginBottom: 24 }}>
            <Input
              placeholder="What are you working on?"
              value={newLineDesc}
              onChange={(e) => setNewLineDesc(e.target.value)}
              onPressEnter={handleStartTracking}
            />
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartTracking}
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
        {lines.length === 0 ? (
          <Empty description="No tracking entries yet. Start tracking above!" />
        ) : (
          <List
            dataSource={lines.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
            renderItem={(line) => (
              <List.Item>
                <TrackerLineCard
                  line={line}
                  liveDuration={liveDurations.get(line.id)}
                  onDelete={onDeleteTrackerLine}
                  onStop={line.durations.some((d) => d.ended_at === null) ? onStopTracking : undefined}
                  onResume={!line.durations.some((d) => d.ended_at === null) ? onResumeTracking : undefined}
                  formatDuration={formatDuration}
                  formatTime={formatTime}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  );
};
