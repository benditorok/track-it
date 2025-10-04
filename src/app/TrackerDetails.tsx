import { useState } from "react";
import { Card, Button, Input, Typography, Space, List, Empty, Badge, Divider, Segmented } from "antd";
import { PlayCircleOutlined, CalendarOutlined, UnorderedListOutlined } from "@ant-design/icons";
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

export function TrackerDetails({
  selectedTracker,
  liveDurations,
  onStartTracking,
  onStopTracking,
  onResumeTracking,
  onDeleteTrackerLine,
  formatDuration,
  formatTime,
}: TrackerDetailsProps) {
  const [newLineDesc, setNewLineDesc] = useState("");
  const [filter, setFilter] = useState<"all" | "today">("all");

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
      <Card title="Select a Tracker">
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

  // Filter lines based on selected filter
  const filterLines = (lines: TrackerLine[]) => {
    if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return lines.filter((line) => {
        // Check if any duration was active today
        return line.durations.some((duration) => {
          const durationDate = new Date(duration.started_at);
          durationDate.setHours(0, 0, 0, 0);
          return durationDate.getTime() === today.getTime();
        });
      });
    }
    return lines;
  };

  const lines = filterLines(selectedTracker.lines);

  return (
    <Card
      title={
        <Space>
          <span>{selectedTracker.label}</span>
          <Badge count={selectedTracker.id} color="blue" />
        </Space>
      }
    >
      {/* Start New Tracking */}
      {!activeLine && (
        <>
          <Title level={4}>Start New Task</Title>
          <Space.Compact style={{ width: "100%" }}>
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
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}>
        <Title level={4} style={{ margin: 0 }}>
          Tracking History
        </Title>
        <Segmented
          options={[
            { label: "All", value: "all", icon: <UnorderedListOutlined /> },
            { label: "Today", value: "today", icon: <CalendarOutlined /> },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as "all" | "today")}
        />
      </Space>
      {lines.length === 0 ? (
        <Empty
          description={
            filter === "today" ? "No tracking entries for today" : "No tracking entries yet. Start tracking above!"
          }
        />
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
    </Card>
  );
}
