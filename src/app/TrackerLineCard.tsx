import React from "react";
import { Card, Button, Typography, Space, Badge, Tooltip, Tag } from "antd";
import { DeleteOutlined, StopOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { TrackerLine } from "../types/tracker.ts";

const { Title, Text } = Typography;

interface TrackerLineCardProps {
  line: TrackerLine;
  liveDuration?: string;
  onDelete: (line: TrackerLine) => void;
  onStop?: (line: TrackerLine) => void;
  onResume?: (line: TrackerLine) => void;
  formatDuration: (startedAt: string, endedAt: string | null) => string;
  formatTime: (dateString: string) => string;
}

export const TrackerLineCard: React.FC<TrackerLineCardProps> = ({
  line,
  liveDuration,
  onDelete,
  onStop,
  onResume,
  formatDuration,
  formatTime,
}) => {
  const activeDuration = line.durations.find((d) => d.ended_at === null);
  const isActive = activeDuration !== undefined;

  // Calculate total duration across all duration entries
  const totalDuration = line.durations.reduce((total, duration) => {
    if (duration.ended_at) {
      const start = new Date(duration.started_at).getTime();
      const end = new Date(duration.ended_at).getTime();
      return total + (end - start);
    }
    return total;
  }, 0);

  const formatTotalDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Card
      size="small"
      style={{
        width: "100%",
        border: isActive ? "2px solid #52c41a" : undefined,
        backgroundColor: isActive ? "#f6ffed" : undefined,
      }}
      extra={
        <Tooltip title="Delete entry">
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => onDelete(line)} danger />
        </Tooltip>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="small">
        <Space align="center">
          <Title level={5} style={{ margin: 0 }}>
            {line.desc}
          </Title>
          {isActive && <Tag color="green">Active</Tag>}
          {!isActive && line.durations.length > 0 && <Tag color="default">Stopped</Tag>}
        </Space>

        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          {line.durations.length > 0 && (
            <Text type="secondary">
              Sessions: {line.durations.length} | Total: {formatTotalDuration(totalDuration)}
            </Text>
          )}

          {/* Show duration entries */}
          <Space direction="vertical" size="small" style={{ width: "100%", marginTop: 8 }}>
            {line.durations.map((duration, index) => (
              <Card
                key={duration.id}
                size="small"
                style={{
                  backgroundColor: duration.ended_at ? "#fafafa" : "#f6ffed",
                  border: duration.ended_at ? "1px solid #d9d9d9" : "1px solid #b7eb8f",
                }}
              >
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <Space>
                    <Text type="secondary">Session {line.durations.length - index}:</Text>
                    <Text type="secondary">{formatTime(duration.started_at)}</Text>
                    {duration.ended_at && (
                      <>
                        <Text type="secondary">→</Text>
                        <Text type="secondary">{formatTime(duration.ended_at)}</Text>
                      </>
                    )}
                  </Space>
                  {duration.ended_at ? (
                    <Text strong>Duration: {formatDuration(duration.started_at, duration.ended_at)}</Text>
                  ) : (
                    <Space>
                      <Badge status="processing" />
                      <Text
                        strong
                        style={{
                          color: "#52c41a",
                          animation: "pulse 2s infinite",
                        }}
                      >
                        Live: {liveDuration || formatDuration(duration.started_at, null)}
                      </Text>
                    </Space>
                  )}
                </Space>
              </Card>
            ))}
          </Space>
        </Space>

        {/* Action buttons */}
        <Space style={{ marginTop: 8 }}>
          {isActive && onStop && (
            <Button type="primary" size="small" icon={<StopOutlined />} onClick={() => onStop(line)}>
              Stop
            </Button>
          )}
          {!isActive && onResume && (
            <Button type="default" size="small" icon={<PlayCircleOutlined />} onClick={() => onResume(line)}>
              Resume
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
};
